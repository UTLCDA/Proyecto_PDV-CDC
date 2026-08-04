using Microsoft.EntityFrameworkCore;
using Pos.Application.Commercial.DTOs;
using Pos.Application.Commercial.Services;
using Pos.Application.Common.Interfaces;
using Pos.Application.Sales.DTOs;
using Pos.Application.Sales.Services;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class CommercialOperationsService : ICommercialOperationsService
{
    private readonly PosDbContext _dbContext;
    private readonly ISaleApplicationService _saleService;
    private readonly IAuditLogService _auditLogService;

    public CommercialOperationsService(
        PosDbContext dbContext,
        ISaleApplicationService saleService,
        IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _saleService = saleService;
        _auditLogService = auditLogService;
    }

    public async Task<List<QuoteDto>> GetQuotesAsync(string? search, string? status, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Quotes
            .Include(q => q.Cliente)
            .Include(q => q.Usuario)
            .Include(q => q.Partidas)
                .ThenInclude(i => i.Producto)
            .Where(q => q.EstaActivo);

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(q => q.Estado.ToLower() == status.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(q => q.NumeroCotizacion.ToLower().Contains(term) || (q.Cliente != null && q.Cliente.Nombre.ToLower().Contains(term)));
        }

        var quotes = await query.OrderByDescending(q => q.FechaCreacionUtc).ToListAsync(cancellationToken);
        return quotes.Select(MapQuoteToDto).ToList();
    }

    public async Task<QuoteDto?> GetQuoteByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var quote = await _dbContext.Quotes
            .Include(q => q.Cliente)
            .Include(q => q.Usuario)
            .Include(q => q.Partidas)
                .ThenInclude(i => i.Producto)
            .FirstOrDefaultAsync(q => q.Id == id && q.EstaActivo, cancellationToken);

        return quote == null ? null : MapQuoteToDto(quote);
    }

    public async Task<QuoteDto> CreateQuoteAsync(CreateQuoteDto request, Guid? currentUserId, string correlationId, CancellationToken cancellationToken = default)
    {
        if (request.Items == null || !request.Items.Any())
        {
            throw new ArgumentException("La cotización debe contener al menos un producto.");
        }

        var totalQuotesCount = await _dbContext.Quotes.CountAsync(cancellationToken);
        var quoteNumber = $"COT-{DateTime.UtcNow:yyyy}-{(totalQuotesCount + 1):D5}";

        var quote = new Cotizacion
        {
            NumeroCotizacion = quoteNumber,
            ClienteId = request.CustomerId,
            UsuarioId = currentUserId,
            MontoDescuento = request.DiscountAmount,
            Notas = request.Notes,
            Estado = "Activa",
            FechaCreacionUtc = DateTime.UtcNow,
            FechaVigenciaUtc = DateTime.UtcNow.AddDays(15)
        };

        foreach (var itemDto in request.Items)
        {
            var item = new PartidaCotizacion
            {
                ProductoId = itemDto.ProductId,
                Cantidad = itemDto.Quantity,
                PrecioUnitario = itemDto.UnitPrice,
                MontoDescuento = itemDto.DiscountAmount
            };
            item.CalcularTotalPartida();
            quote.Partidas.Add(item);
        }

        quote.CalcularTotales();
        _dbContext.Quotes.Add(quote);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetQuoteByIdAsync(quote.Id, cancellationToken) ?? throw new InvalidOperationException("Error al recuperar la cotización creada.");
    }

    public async Task<SaleDto> ConvertQuoteToSaleAsync(Guid quoteId, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var quote = await _dbContext.Quotes
            .Include(q => q.Partidas)
            .FirstOrDefaultAsync(q => q.Id == quoteId && q.EstaActivo, cancellationToken);

        if (quote == null)
        {
            throw new KeyNotFoundException($"Cotización con ID '{quoteId}' no encontrada.");
        }

        if (quote.Estado == "Convertida")
        {
            throw new InvalidOperationException("La cotización ya fue convertida a venta anteriormente.");
        }

        var createSaleDto = new CreateSaleDto(
            CustomerId: quote.ClienteId,
            PaymentType: "FullPayment",
            DiscountAmount: quote.MontoDescuento,
            AdvanceAmount: 0m,
            CashAmount: 0m,
            CardAmount: 0m,
            TransferAmount: 0m,
            Notes: $"Convertida desde Cotización {quote.NumeroCotizacion}",
            Items: quote.Partidas.Select(i => new CreateSaleItemDto(
                ProductId: i.ProductoId,
                Quantity: i.Cantidad,
                UnitPrice: i.PrecioUnitario,
                DiscountAmount: i.MontoDescuento
            )).ToList()
        );

        var saleDto = await _saleService.ProcessSaleAsync(createSaleDto, currentUserId, correlationId, ipAddress, cancellationToken);

        quote.Estado = "Convertida";
        quote.FechaActualizacionUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "QUOTE_CONVERTED_TO_SALE",
            "Cotizacion",
            quote.Id.ToString(),
            $"QuoteNumber={quote.NumeroCotizacion}",
            $"SaleFolio={saleDto.FolioNumber}",
            ipAddress,
            "1-Click Quote Conversion WPC Bajío",
            cancellationToken);

        return saleDto;
    }

    public async Task<PaymentInstallmentDto> RegisterInstallmentPaymentAsync(CreateInstallmentDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var sale = await _dbContext.Sales
            .Include(s => s.Usuario)
            .FirstOrDefaultAsync(s => s.Id == request.SaleId, cancellationToken);

        if (sale == null)
        {
            throw new KeyNotFoundException($"Venta con ID '{request.SaleId}' no encontrada.");
        }

        if (sale.SaldoPendiente <= 0)
        {
            throw new InvalidOperationException("La venta no posee saldo pendiente por liquidar.");
        }

        if (request.AmountPaid <= 0)
        {
            throw new ArgumentException("El monto a abonar debe ser mayor a cero.");
        }

        decimal previousBalance = sale.SaldoPendiente;
        decimal amountPaid = Math.Min(request.AmountPaid, previousBalance);
        decimal newBalance = previousBalance - amountPaid;

        sale.MontoAnticipo += amountPaid;
        sale.SaldoPendiente = newBalance;
        if (newBalance <= 0)
        {
            sale.Estado = "Completada";
        }
        sale.FechaActualizacionUtc = DateTime.UtcNow;

        var totalReceiptsCount = await _dbContext.PaymentInstallments.CountAsync(cancellationToken);
        var receiptNumber = $"RECIBO-{DateTime.UtcNow:yyyy}-{(totalReceiptsCount + 1):D5}";

        var installment = new AbonoPago
        {
            VentaId = request.SaleId,
            NumeroRecibo = receiptNumber,
            MontoAbonado = amountPaid,
            SaldoPendienteAnterior = previousBalance,
            SaldoPendienteNuevo = newBalance,
            FormaPago = request.PaymentMethod,
            UsuarioId = currentUserId,
            Notas = request.Notes,
            FechaCreacionUtc = DateTime.UtcNow
        };

        _dbContext.PaymentInstallments.Add(installment);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "PAYMENT_INSTALLMENT_REGISTERED",
            "AbonoPago",
            installment.Id.ToString(),
            $"PreviousBalance={previousBalance}",
            $"AmountPaid={amountPaid}, NewBalance={newBalance}",
            ipAddress,
            $"Abono registrado para folio {sale.NumeroFolio}",
            cancellationToken);

        return new PaymentInstallmentDto(
            installment.Id,
            installment.VentaId,
            sale.NumeroFolio,
            installment.NumeroRecibo,
            installment.MontoAbonado,
            installment.SaldoPendienteAnterior,
            installment.SaldoPendienteNuevo,
            installment.FormaPago,
            sale.Usuario?.NombreUsuario,
            installment.Notas,
            installment.FechaCreacionUtc
        );
    }

    public async Task<List<PaymentInstallmentDto>> GetInstallmentsBySaleIdAsync(Guid saleId, CancellationToken cancellationToken = default)
    {
        var installments = await _dbContext.PaymentInstallments
            .Include(pi => pi.Venta)
            .Include(pi => pi.Usuario)
            .Where(pi => pi.VentaId == saleId)
            .OrderByDescending(pi => pi.FechaCreacionUtc)
            .ToListAsync(cancellationToken);

        return installments.Select(i => new PaymentInstallmentDto(
            i.Id,
            i.VentaId,
            i.Venta.NumeroFolio,
            i.NumeroRecibo,
            i.MontoAbonado,
            i.SaldoPendienteAnterior,
            i.SaldoPendienteNuevo,
            i.FormaPago,
            i.Usuario?.NombreUsuario,
            i.Notas,
            i.FechaCreacionUtc
        )).ToList();
    }

    public async Task<ReturnHeaderDto> ProcessReturnAsync(CreateReturnDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var sale = await _dbContext.Sales.FirstOrDefaultAsync(s => s.Id == request.SaleId, cancellationToken);
        if (sale == null)
        {
            throw new KeyNotFoundException($"Venta con ID '{request.SaleId}' no encontrada.");
        }

        var totalReturnsCount = await _dbContext.ReturnHeaders.CountAsync(cancellationToken);
        var returnNumber = $"DEV-{DateTime.UtcNow:yyyy}-{(totalReturnsCount + 1):D5}";

        var returnHeader = new DevolucionCabecera
        {
            NumeroDevolucion = returnNumber,
            VentaId = request.SaleId,
            UsuarioId = currentUserId,
            Motivo = request.Reason,
            Estado = "Completada",
            FechaCreacionUtc = DateTime.UtcNow
        };

        decimal totalRefund = 0m;

        foreach (var itemDto in request.Items)
        {
            var itemRefundPrice = itemDto.Quantity * itemDto.RefundUnitPrice;
            totalRefund += itemRefundPrice;

            var returnItem = new DevolucionDetalle
            {
                ProductoId = itemDto.ProductId,
                Cantidad = itemDto.Quantity,
                PrecioUnitarioDevolucion = itemDto.RefundUnitPrice,
                PrecioTotalDevolucion = itemRefundPrice
            };
            returnHeader.Detalle.Add(returnItem);

            var stock = await _dbContext.Stocks.FirstOrDefaultAsync(s => s.ProductoId == itemDto.ProductId, cancellationToken);
            if (stock != null)
            {
                decimal prevQty = stock.CantidadDisponible;
                stock.AgregarStock(itemDto.Quantity);
                decimal newQty = stock.CantidadDisponible;

                var movement = new MovimientoInventario
                {
                    ProductoId = itemDto.ProductId,
                    TipoMovimiento = "Devolucion",
                    Cantidad = itemDto.Quantity,
                    CantidadAnterior = prevQty,
                    CantidadNueva = newQty,
                    Motivo = $"Devolución Folio: {returnNumber}",
                    NumeroReferencia = returnNumber,
                    UsuarioId = currentUserId,
                    FechaCreacionUtc = DateTime.UtcNow
                };
                _dbContext.InventoryMovements.Add(movement);
            }
        }

        returnHeader.MontoTotalDevuelto = totalRefund;
        _dbContext.ReturnHeaders.Add(returnHeader);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "SALE_RETURN_PROCESSED",
            "DevolucionCabecera",
            returnHeader.Id.ToString(),
            null,
            $"ReturnNumber={returnNumber}, Refund={totalRefund}, SaleFolio={sale.NumeroFolio}",
            ipAddress,
            $"Devolución procesada: {request.Reason}",
            cancellationToken);

        return new ReturnHeaderDto(
            returnHeader.Id,
            returnHeader.NumeroDevolucion,
            sale.Id,
            sale.NumeroFolio,
            returnHeader.MontoTotalDevuelto,
            returnHeader.Motivo,
            returnHeader.Estado,
            returnHeader.FechaCreacionUtc
        );
    }

    public async Task<List<DocumentTemplateDto>> GetDocumentTemplatesAsync(CancellationToken cancellationToken = default)
    {
        var templates = await _dbContext.DocumentTemplates.Where(t => t.EstaActivo).ToListAsync(cancellationToken);
        return templates.Select(t => new DocumentTemplateDto(t.Id, t.Titulo, t.Categoria, t.ContenidoHtmlPlantilla)).ToList();
    }

    private static QuoteDto MapQuoteToDto(Cotizacion q)
    {
        var itemDtos = q.Partidas.Select(i => new QuoteItemDto(
            i.Id,
            i.ProductoId,
            i.Producto?.Sku ?? string.Empty,
            i.Producto?.Nombre ?? string.Empty,
            i.Producto?.UnidadMedida ?? "Pza",
            i.Cantidad,
            i.PrecioUnitario,
            i.MontoDescuento,
            i.PrecioTotal
        )).ToList();

        return new QuoteDto(
            q.Id,
            q.NumeroCotizacion,
            q.ClienteId,
            q.Cliente?.NombreMostrar,
            q.UsuarioId,
            q.Usuario?.NombreUsuario,
            q.SubTotal,
            q.MontoDescuento,
            q.MontoIva,
            q.MontoTotal,
            q.FechaVigenciaUtc,
            q.Estado,
            q.Notas,
            q.FechaCreacionUtc,
            itemDtos
        );
    }
}
