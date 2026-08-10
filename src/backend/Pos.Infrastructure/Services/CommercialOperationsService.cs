using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Pos.Application.Commercial.DTOs;
using Pos.Application.Commercial.Services;
using Pos.Application.Common.Interfaces;
using Pos.Application.Sales.DTOs;
using Pos.Application.Sales.Services;
using Pos.Domain.Common;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class CommercialOperationsService : ICommercialOperationsService
{
    private const decimal MaximumCommercialAmount = 10_000_000m;
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
        var query = BuildQuoteQuery().Where(quote => quote.EstaActivo);
        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLower();
            var nowUtc = DateTime.UtcNow;
            if (normalizedStatus == QuoteStatuses.Expired.ToLower())
            {
                query = query.Where(quote => quote.Estado == QuoteStatuses.Expired ||
                    (quote.Estado == QuoteStatuses.Active && quote.FechaVigenciaUtc < nowUtc));
            }
            else if (normalizedStatus == QuoteStatuses.Active.ToLower())
            {
                query = query.Where(quote => quote.Estado == QuoteStatuses.Active && quote.FechaVigenciaUtc >= nowUtc);
            }
            else
            {
                query = query.Where(quote => quote.Estado.ToLower() == normalizedStatus);
            }
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(quote => quote.NumeroCotizacion.ToLower().Contains(term) ||
                (quote.Cliente != null &&
                    (quote.Cliente.Nombre.ToLower().Contains(term) ||
                     (quote.Cliente.NombreEmpresa != null && quote.Cliente.NombreEmpresa.ToLower().Contains(term)))));
        }

        var quotes = await query.AsNoTracking()
            .OrderByDescending(quote => quote.FechaCreacionUtc)
            .Take(500)
            .ToListAsync(cancellationToken);
        return quotes.Select(MapQuoteToDto).ToList();
    }

    public async Task<QuoteDto?> GetQuoteByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var quote = await BuildQuoteQuery().AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id && item.EstaActivo, cancellationToken);
        return quote == null ? null : MapQuoteToDto(quote);
    }

    public async Task<QuoteDto> CreateQuoteAsync(
        CreateQuoteDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        bool canApplyDiscount,
        CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        if (!request.CustomerId.HasValue)
        {
            throw new ArgumentException("Seleccione un cliente registrado para crear la cotización.");
        }
        if (request.Items == null || request.Items.Count == 0)
        {
            throw new ArgumentException("La cotización debe contener al menos un producto.");
        }
        if (request.ValidityDays is < 1 or > 90)
        {
            throw new ArgumentException("La vigencia debe estar entre 1 y 90 días.");
        }
        ValidateAmount(request.DiscountAmount, "El descuento");
        var notes = NormalizeText(request.Notes, "Las notas", 500, required: false);

        var customer = await _dbContext.Customers.FirstOrDefaultAsync(
            item => item.Id == request.CustomerId.Value && item.EstaActivo,
            cancellationToken)
            ?? throw new KeyNotFoundException("El cliente seleccionado no existe o se encuentra inactivo.");

        var groupedItems = request.Items
            .GroupBy(item => item.ProductId)
            .Select(group => new
            {
                ProductId = group.Key,
                Quantity = group.Sum(item => item.Quantity),
                Discount = group.Sum(item => item.DiscountAmount)
            })
            .ToList();
        foreach (var item in groupedItems)
        {
            ValidateQuantity(item.ProductId, item.Quantity);
            ValidateAmount(item.Discount, "El descuento de partida");
        }

        var productIds = groupedItems.Select(item => item.ProductId).ToList();
        var products = await _dbContext.Products
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id, cancellationToken);
        if (products.Count != productIds.Count)
        {
            throw new KeyNotFoundException("Uno o más productos de la cotización no existen.");
        }

        var manualDiscount = request.DiscountAmount + groupedItems.Sum(item => item.Discount);
        if (manualDiscount > 0 && !canApplyDiscount)
        {
            throw new InvalidOperationException("La sesión no tiene permiso para aplicar descuentos manuales.");
        }

        var isWholesaleCustomer = string.Equals(customer?.TipoCliente, CustomerTypes.Wholesale, StringComparison.OrdinalIgnoreCase);
        var quote = new Cotizacion
        {
            NumeroCotizacion = GenerateFolio("COT"),
            ClienteId = customer?.Id,
            UsuarioId = currentUserId,
            Notas = notes,
            Estado = QuoteStatuses.Active,
            FechaCreacionUtc = DateTime.UtcNow,
            FechaVigenciaUtc = DateTime.UtcNow.AddDays(request.ValidityDays)
        };
        decimal subtotal = 0m;
        foreach (var item in groupedItems)
        {
            var product = products[item.ProductId];
            if (!product.EstaActivo)
            {
                throw new InvalidOperationException($"El producto '{product.Nombre}' se encuentra inactivo.");
            }
            var useWholesale = isWholesaleCustomer ||
                (product.CantidadMinimaMayoreo > 0 && item.Quantity >= product.CantidadMinimaMayoreo);
            var unitPrice = useWholesale && product.PrecioMayoreo > 0 ? product.PrecioMayoreo : product.PrecioUnitario;
            ValidateAmount(unitPrice, $"El precio de '{product.Nombre}'");

            var quoteItem = new PartidaCotizacion
            {
                ProductoId = product.Id,
                Cantidad = item.Quantity,
                PrecioUnitario = unitPrice,
                MontoDescuento = 0m
            };
            quoteItem.CalcularTotalPartida();
            subtotal += quoteItem.PrecioTotal;
            quote.Partidas.Add(quoteItem);
        }

        var customerDiscount = Math.Round(subtotal * Math.Clamp(customer?.PorcentajeDescuentoEspecial ?? 0m, 0m, 100m) / 100m, 2);
        quote.MontoDescuento = Math.Max(customerDiscount, manualDiscount);
        if (quote.MontoDescuento > subtotal)
        {
            throw new InvalidOperationException("El descuento no puede ser mayor al subtotal de la cotización.");
        }
        quote.CalcularTotales();

        _dbContext.Quotes.Add(quote);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "QUOTE_CREATED",
            "Cotizacion",
            quote.Id.ToString(),
            null,
            JsonSerializer.Serialize(new { quote.NumeroCotizacion, quote.MontoTotal, quote.MontoDescuento, Items = quote.Partidas.Count, request.ValidityDays }),
            ipAddress,
            $"Cotización creada: {quote.NumeroCotizacion}",
            cancellationToken);

        return (await GetQuoteByIdAsync(quote.Id, cancellationToken))!;
    }

    public async Task<SaleDto> ConvertQuoteToSaleAsync(
        Guid quoteId,
        ConvertQuoteToSaleDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var relational = _dbContext.Database.IsRelational();
        return await ExecuteInRetriableTransactionAsync(async _ =>
        {
            Cotizacion? quote = null;
            try
            {
                var nowUtc = DateTime.UtcNow;
                if (relational)
                {
                    var claimed = await _dbContext.Quotes
                        .Where(item => item.Id == quoteId && item.EstaActivo &&
                            item.Estado == QuoteStatuses.Active && item.FechaVigenciaUtc >= nowUtc)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(item => item.Estado, QuoteStatuses.Processing)
                            .SetProperty(item => item.FechaActualizacionUtc, nowUtc), cancellationToken);
                    if (claimed != 1)
                    {
                        await ThrowQuoteConversionErrorAsync(quoteId, nowUtc, cancellationToken);
                    }
                }

                quote = await BuildQuoteQuery().FirstOrDefaultAsync(
                    item => item.Id == quoteId && item.EstaActivo,
                    cancellationToken)
                    ?? throw new KeyNotFoundException($"Cotización con ID '{quoteId}' no encontrada.");
                if (!relational)
                {
                    ValidateQuoteCanConvert(quote, nowUtc);
                    quote.Estado = QuoteStatuses.Processing;
                    quote.FechaActualizacionUtc = nowUtc;
                }

                var authorizedPrices = quote.Partidas.ToDictionary(item => item.ProductoId, item => item.PrecioUnitario);
                var saleRequest = new CreateSaleDto(
                    quote.ClienteId,
                    request.PaymentType,
                    quote.MontoDescuento,
                    request.AdvanceAmount,
                    request.CashAmount,
                    request.CardAmount,
                    request.TransferAmount,
                    $"Convertida desde cotización {quote.NumeroCotizacion}",
                    quote.Partidas.Select(item => new CreateSaleItemDto(
                        item.ProductoId,
                        item.Cantidad,
                        item.PrecioUnitario,
                        0m)).ToList());

                var sale = await _saleService.ProcessSaleAsync(
                    saleRequest,
                    currentUserId,
                    correlationId,
                    ipAddress,
                    canApplyDiscount: true,
                    cancellationToken,
                    authorizedPrices);

                quote.Estado = QuoteStatuses.Converted;
                quote.FechaActualizacionUtc = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);

                await _auditLogService.LogAsync(
                    correlationId,
                    currentUserId,
                    "QUOTE_CONVERTED_TO_SALE",
                    "Cotizacion",
                    quote.Id.ToString(),
                    JsonSerializer.Serialize(new { Status = QuoteStatuses.Active, quote.NumeroCotizacion }),
                    JsonSerializer.Serialize(new { Status = quote.Estado, SaleFolio = sale.FolioNumber }),
                    ipAddress,
                    $"Cotización convertida a venta: {quote.NumeroCotizacion}",
                    cancellationToken);
                return sale;
            }
            catch
            {
                if (!relational && quote != null && quote.Estado == QuoteStatuses.Processing)
                {
                    quote.Estado = QuoteStatuses.Active;
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
                throw;
            }
        }, cancellationToken);
    }

    public async Task<PaymentInstallmentDto> RegisterInstallmentPaymentAsync(
        CreateInstallmentDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        ValidateAmount(request.AmountPaid, "El monto a abonar", requirePositive: true);
        var paymentMethod = NormalizePaymentMethod(request.PaymentMethod);
        var notes = NormalizeText(request.Notes, "Las notas", 500, required: false);

        var sale = await _dbContext.Sales
            .Include(item => item.Usuario)
            .FirstOrDefaultAsync(item => item.Id == request.SaleId && item.EstaActivo, cancellationToken)
            ?? throw new KeyNotFoundException($"Venta con ID '{request.SaleId}' no encontrada.");
        if (sale.Estado is SaleStatuses.Cancelled or SaleStatuses.Returned)
        {
            throw new InvalidOperationException("La venta no admite abonos por su estado actual.");
        }
        if (sale.SaldoPendiente <= 0)
        {
            throw new InvalidOperationException("La venta no posee saldo pendiente por liquidar.");
        }
        if (request.AmountPaid > sale.SaldoPendiente)
        {
            throw new InvalidOperationException($"El abono no puede superar el saldo pendiente (${sale.SaldoPendiente:N2}).");
        }

        return await ExecuteInRetriableTransactionAsync(async _ =>
        {
            var previousBalance = sale.SaldoPendiente;
            sale.MontoAnticipo += request.AmountPaid;
            sale.SaldoPendiente -= request.AmountPaid;
            if (sale.SaldoPendiente == 0) sale.Estado = SaleStatuses.Completed;
            sale.FechaActualizacionUtc = DateTime.UtcNow;

            var installment = new AbonoPago
            {
                VentaId = sale.Id,
                NumeroRecibo = GenerateFolio("RECIBO"),
                MontoAbonado = request.AmountPaid,
                SaldoPendienteAnterior = previousBalance,
                SaldoPendienteNuevo = sale.SaldoPendiente,
                FormaPago = paymentMethod,
                UsuarioId = currentUserId,
                Notas = notes,
                FechaCreacionUtc = DateTime.UtcNow
            };
            _dbContext.PaymentInstallments.Add(installment);

            if (paymentMethod == PaymentMethods.Cash)
            {
                var openShift = await _dbContext.CashShifts.FirstOrDefaultAsync(shift =>
                    shift.Estado == CashShiftStatuses.Open,
                    cancellationToken);
                if (openShift != null)
                {
                    _dbContext.CashTransactions.Add(new TransaccionCaja
                    {
                        TurnoCajaId = openShift.Id,
                        TipoTransaccion = CashTransactionTypes.Installment,
                        Monto = request.AmountPaid,
                        Motivo = $"Abono {installment.NumeroRecibo} de venta {sale.NumeroFolio}",
                        UsuarioId = currentUserId,
                        FechaCreacionUtc = installment.FechaCreacionUtc
                    });
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(
                correlationId,
                currentUserId,
                "PAYMENT_INSTALLMENT_REGISTERED",
                "AbonoPago",
                installment.Id.ToString(),
                JsonSerializer.Serialize(new { PendingBalance = previousBalance }),
                JsonSerializer.Serialize(new { installment.NumeroRecibo, installment.MontoAbonado, PendingBalance = sale.SaldoPendiente, installment.FormaPago }),
                ipAddress,
                $"Abono registrado para {sale.NumeroFolio}",
                cancellationToken);
            return MapInstallmentToDto(installment, sale);
        }, cancellationToken);
    }

    public async Task<List<PaymentInstallmentDto>> GetInstallmentsBySaleIdAsync(Guid saleId, CancellationToken cancellationToken = default)
    {
        var sale = await _dbContext.Sales
            .Include(item => item.Usuario)
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == saleId && item.EstaActivo, cancellationToken)
            ?? throw new KeyNotFoundException("La venta seleccionada no existe.");
        var installments = await _dbContext.PaymentInstallments
            .Include(item => item.Venta)
            .Include(item => item.Usuario)
            .AsNoTracking()
            .Where(item => item.VentaId == saleId && item.EstaActivo)
            .OrderByDescending(item => item.FechaCreacionUtc)
            .ToListAsync(cancellationToken);
        var result = installments.Select(item => MapInstallmentToDto(item, item.Venta)).ToList();
        var initialPayment = MapInitialInstallment(sale);
        if (initialPayment != null) result.Add(initialPayment);
        return result.OrderByDescending(item => item.CreatedAtUtc).ToList();
    }

    public async Task<List<PaymentInstallmentDto>> GetInstallmentHistoryAsync(
        string? search,
        string? paymentMethod,
        DateTime? startDate,
        DateTime? endDate,
        string? customerId = null,
        CancellationToken cancellationToken = default)
    {
        ValidateDateRange(startDate, endDate);
        var normalizedMethod = NormalizeOptionalPaymentMethod(paymentMethod);

        DateTime? effectiveEndDate = endDate.HasValue
            ? (endDate.Value.TimeOfDay == TimeSpan.Zero ? endDate.Value.Date.AddDays(1).AddTicks(-1) : endDate.Value)
            : null;

        Guid? parsedCustGuid = !string.IsNullOrWhiteSpace(customerId) && Guid.TryParse(customerId, out var custGuid) ? custGuid : null;

        var initialSaleQuery = _dbContext.Sales
            .Include(sale => sale.Cliente)
            .Include(sale => sale.Usuario)
            .AsNoTracking()
            .Where(sale => sale.EstaActivo && sale.TipoPago == SalePaymentTypes.AdvanceDeposit);
        if (startDate.HasValue) initialSaleQuery = initialSaleQuery.Where(sale => sale.FechaCreacionUtc >= startDate.Value);
        if (effectiveEndDate.HasValue) initialSaleQuery = initialSaleQuery.Where(sale => sale.FechaCreacionUtc <= effectiveEndDate.Value);
        if (parsedCustGuid.HasValue) initialSaleQuery = initialSaleQuery.Where(sale => sale.ClienteId == parsedCustGuid.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            initialSaleQuery = initialSaleQuery.Where(sale => sale.NumeroFolio.ToLower().Contains(term) ||
                (sale.Cliente != null && (sale.Cliente.Nombre.ToLower().Contains(term) ||
                    (sale.Cliente.NombreEmpresa != null && sale.Cliente.NombreEmpresa.ToLower().Contains(term)))));
        }
        var initialSales = await initialSaleQuery.ToListAsync(cancellationToken);
        var initialInstallments = initialSales
            .Select(MapInitialInstallment)
            .OfType<PaymentInstallmentDto>()
            .Where(item => normalizedMethod == null || item.PaymentMethod == normalizedMethod);

        var installmentQuery = _dbContext.PaymentInstallments
            .Include(item => item.Venta).ThenInclude(sale => sale.Cliente)
            .Include(item => item.Usuario)
            .AsNoTracking()
            .Where(item => item.EstaActivo);
        if (startDate.HasValue) installmentQuery = installmentQuery.Where(item => item.FechaCreacionUtc >= startDate.Value);
        if (effectiveEndDate.HasValue) installmentQuery = installmentQuery.Where(item => item.FechaCreacionUtc <= effectiveEndDate.Value);
        if (normalizedMethod != null) installmentQuery = installmentQuery.Where(item => item.FormaPago == normalizedMethod);
        if (parsedCustGuid.HasValue) installmentQuery = installmentQuery.Where(item => item.Venta.ClienteId == parsedCustGuid.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            installmentQuery = installmentQuery.Where(item => item.NumeroRecibo.ToLower().Contains(term) ||
                item.Venta.NumeroFolio.ToLower().Contains(term) ||
                (item.Venta.Cliente != null && (item.Venta.Cliente.Nombre.ToLower().Contains(term) ||
                    (item.Venta.Cliente.NombreEmpresa != null && item.Venta.Cliente.NombreEmpresa.ToLower().Contains(term)))));
        }
        var installments = (await installmentQuery.ToListAsync(cancellationToken))
            .Select(item => MapInstallmentToDto(item, item.Venta));

        return initialInstallments.Concat(installments)
            .OrderByDescending(item => item.CreatedAtUtc)
            .Take(500)
            .ToList();
    }

    public async Task<List<PaymentTransactionDto>> GetPaymentTransactionsAsync(
        string? search,
        string? paymentMethod,
        DateTime? startDate,
        DateTime? endDate,
        string? customerId = null,
        CancellationToken cancellationToken = default)
    {
        ValidateDateRange(startDate, endDate);
        var normalizedMethod = NormalizeOptionalPaymentMethod(paymentMethod);
        DateTime? effectiveEndDate = endDate.HasValue
            ? (endDate.Value.TimeOfDay == TimeSpan.Zero ? endDate.Value.Date.AddDays(1).AddTicks(-1) : endDate.Value)
            : null;

        Guid? parsedCustGuid = !string.IsNullOrWhiteSpace(customerId) && Guid.TryParse(customerId, out var cGuid) ? cGuid : null;

        var saleQuery = _dbContext.Sales.Include(item => item.Cliente).Include(item => item.Usuario)
            .AsNoTracking().Where(item => item.EstaActivo);
        if (startDate.HasValue) saleQuery = saleQuery.Where(item => item.FechaCreacionUtc >= startDate.Value);
        if (effectiveEndDate.HasValue) saleQuery = saleQuery.Where(item => item.FechaCreacionUtc <= effectiveEndDate.Value);
        if (parsedCustGuid.HasValue) saleQuery = saleQuery.Where(item => item.ClienteId == parsedCustGuid.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            saleQuery = saleQuery.Where(item => item.NumeroFolio.ToLower().Contains(term) ||
                (item.Cliente != null && (item.Cliente.Nombre.ToLower().Contains(term) ||
                    (item.Cliente.NombreEmpresa != null && item.Cliente.NombreEmpresa.ToLower().Contains(term)))));
        }
        var sales = await saleQuery.ToListAsync(cancellationToken);
        var initialTransactions = sales.SelectMany(MapInitialTransactions)
            .Where(item => normalizedMethod == null || item.PaymentMethod == normalizedMethod);

        var installmentQuery = _dbContext.PaymentInstallments
            .Include(item => item.Venta).ThenInclude(sale => sale.Cliente)
            .Include(item => item.Usuario)
            .AsNoTracking().Where(item => item.EstaActivo);
        if (startDate.HasValue) installmentQuery = installmentQuery.Where(item => item.FechaCreacionUtc >= startDate.Value);
        if (effectiveEndDate.HasValue) installmentQuery = installmentQuery.Where(item => item.FechaCreacionUtc <= effectiveEndDate.Value);
        if (normalizedMethod != null) installmentQuery = installmentQuery.Where(item => item.FormaPago == normalizedMethod);
        if (parsedCustGuid.HasValue) installmentQuery = installmentQuery.Where(item => item.Venta.ClienteId == parsedCustGuid.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            installmentQuery = installmentQuery.Where(item => item.NumeroRecibo.ToLower().Contains(term) || item.Venta.NumeroFolio.ToLower().Contains(term));
        }
        var installmentTransactions = (await installmentQuery.ToListAsync(cancellationToken)).Select(item => new PaymentTransactionDto(
            item.Id.ToString(), item.VentaId, item.Venta.NumeroFolio, item.Venta.Cliente?.NombreMostrar,
            "Installment", item.NumeroRecibo, item.FormaPago, item.MontoAbonado,
            item.Usuario?.NombreUsuario, item.FechaCreacionUtc));

        return initialTransactions.Concat(installmentTransactions)
            .OrderByDescending(item => item.CreatedAtUtc).Take(1000).ToList();
    }

    public async Task<ReturnHeaderDto> ProcessReturnAsync(
        CreateReturnDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var reason = NormalizeText(request.Reason, "El motivo", 500, required: true);
        var refundMethod = RefundMethods.All.FirstOrDefault(method =>
            string.Equals(method, request.RefundMethod?.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException("La forma de reembolso seleccionada no es válida.");
        if (request.Items == null || request.Items.Count == 0)
        {
            throw new ArgumentException("La devolución debe contener al menos un producto.");
        }
        var requestedItems = request.Items.GroupBy(item => item.ProductId)
            .Select(group => new { ProductId = group.Key, Quantity = group.Sum(item => item.Quantity) })
            .ToList();
        foreach (var item in requestedItems) ValidateQuantity(item.ProductId, item.Quantity);

        var sale = await _dbContext.Sales
            .Include(item => item.Partidas)
                .ThenInclude(item => item.Producto)
            .FirstOrDefaultAsync(item => item.Id == request.SaleId && item.EstaActivo, cancellationToken)
            ?? throw new KeyNotFoundException($"Venta con ID '{request.SaleId}' no encontrada.");
        if (sale.Estado == SaleStatuses.Cancelled)
        {
            throw new InvalidOperationException("No se puede devolver una venta cancelada.");
        }

        var soldItems = sale.Partidas.GroupBy(item => item.ProductoId)
            .ToDictionary(group => group.Key, group => new
            {
                Quantity = group.Sum(item => item.Cantidad),
                UnitPrice = group.Sum(item => item.PrecioTotal) / group.Sum(item => item.Cantidad),
                Product = group.First().Producto
            });
        var previouslyReturned = await _dbContext.ReturnItems
            .Where(item => item.DevolucionCabecera.VentaId == sale.Id &&
                item.DevolucionCabecera.EstaActivo && item.DevolucionCabecera.Estado == ReturnStatuses.Completed)
            .GroupBy(item => item.ProductoId)
            .Select(group => new { ProductId = group.Key, Quantity = group.Sum(item => item.Cantidad) })
            .ToDictionaryAsync(item => item.ProductId, item => item.Quantity, cancellationToken);

        foreach (var requested in requestedItems)
        {
            if (!soldItems.TryGetValue(requested.ProductId, out var sold))
            {
                throw new InvalidOperationException("Uno de los productos no pertenece a la venta original.");
            }
            var remaining = sold.Quantity - previouslyReturned.GetValueOrDefault(requested.ProductId);
            if (requested.Quantity > remaining)
            {
                throw new InvalidOperationException($"Sólo se pueden devolver {remaining} unidades de '{sold.Product?.Nombre}'.");
            }
        }

        var stocks = await _dbContext.Stocks
            .Where(stock => requestedItems.Select(item => item.ProductId).Contains(stock.ProductoId))
            .ToDictionaryAsync(stock => stock.ProductoId, cancellationToken);
        if (stocks.Count != requestedItems.Count)
        {
            throw new InvalidOperationException("Uno o más productos no tienen registro de existencias.");
        }

        return await ExecuteInRetriableTransactionAsync(async _ =>
        {
            var createdAtUtc = DateTime.UtcNow;
            var returnHeader = new DevolucionCabecera
            {
                NumeroDevolucion = GenerateFolio("DEV"),
                VentaId = sale.Id,
                UsuarioId = currentUserId,
                FormaReembolso = refundMethod,
                Motivo = reason,
                Estado = ReturnStatuses.Completed,
                FechaCreacionUtc = createdAtUtc
            };
            var grossFactor = sale.SubTotal > 0 ? sale.MontoTotal / sale.SubTotal : 0m;
            foreach (var requested in requestedItems)
            {
                var sold = soldItems[requested.ProductId];
                var refundUnitPrice = Math.Round(sold.UnitPrice * grossFactor, 2);
                var refundTotal = Math.Round(requested.Quantity * refundUnitPrice, 2);
                returnHeader.MontoTotalDevuelto += refundTotal;
                returnHeader.Detalle.Add(new DevolucionDetalle
                {
                    ProductoId = requested.ProductId,
                    Cantidad = requested.Quantity,
                    PrecioUnitarioDevolucion = refundUnitPrice,
                    PrecioTotalDevolucion = refundTotal
                });

                var stock = stocks[requested.ProductId];
                var previousQuantity = stock.CantidadDisponible;
                stock.AgregarStock(requested.Quantity);
                _dbContext.InventoryMovements.Add(new MovimientoInventario
                {
                    ProductoId = requested.ProductId,
                    TipoMovimiento = InventoryMovementTypes.Return,
                    Cantidad = requested.Quantity,
                    CantidadAnterior = previousQuantity,
                    CantidadNueva = stock.CantidadDisponible,
                    Motivo = $"Devolución {returnHeader.NumeroDevolucion}",
                    NumeroReferencia = returnHeader.NumeroDevolucion,
                    UsuarioId = currentUserId,
                    FechaCreacionUtc = createdAtUtc
                });
            }

            returnHeader.MontoAplicadoSaldoPendiente = Math.Min(sale.SaldoPendiente, returnHeader.MontoTotalDevuelto);
            sale.SaldoPendiente -= returnHeader.MontoAplicadoSaldoPendiente;
            returnHeader.MontoReembolsado = returnHeader.MontoTotalDevuelto - returnHeader.MontoAplicadoSaldoPendiente;
            var allReturned = soldItems.All(sold =>
                previouslyReturned.GetValueOrDefault(sold.Key) +
                requestedItems.Where(item => item.ProductId == sold.Key).Sum(item => item.Quantity) >= sold.Value.Quantity);
            sale.Estado = allReturned ? SaleStatuses.Returned : SaleStatuses.PartiallyReturned;
            sale.FechaActualizacionUtc = createdAtUtc;

            _dbContext.ReturnHeaders.Add(returnHeader);
            if (returnHeader.MontoReembolsado > 0 && refundMethod == RefundMethods.Cash)
            {
                var openShift = await _dbContext.CashShifts.FirstOrDefaultAsync(shift =>
                    shift.Estado == CashShiftStatuses.Open,
                    cancellationToken);
                if (openShift != null)
                {
                    _dbContext.CashTransactions.Add(new TransaccionCaja
                    {
                        TurnoCajaId = openShift.Id,
                        TipoTransaccion = CashTransactionTypes.Refund,
                        Monto = -returnHeader.MontoReembolsado,
                        Motivo = $"Reembolso {returnHeader.NumeroDevolucion} de venta {sale.NumeroFolio}",
                        UsuarioId = currentUserId,
                        FechaCreacionUtc = createdAtUtc
                    });
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(
                correlationId,
                currentUserId,
                "SALE_RETURN_PROCESSED",
                "DevolucionCabecera",
                returnHeader.Id.ToString(),
                null,
                JsonSerializer.Serialize(new { returnHeader.NumeroDevolucion, sale.NumeroFolio, returnHeader.MontoTotalDevuelto, returnHeader.MontoAplicadoSaldoPendiente, returnHeader.MontoReembolsado, returnHeader.FormaReembolso, Items = returnHeader.Detalle.Count }),
                ipAddress,
                $"Devolución procesada: {returnHeader.NumeroDevolucion}",
                cancellationToken);

            return (await GetReturnByIdAsync(returnHeader.Id, cancellationToken))!;
        }, cancellationToken);
    }

    public async Task<List<ReturnHeaderDto>> GetReturnsAsync(Guid? saleId, CancellationToken cancellationToken = default)
    {
        var query = BuildReturnQuery().Where(item => item.EstaActivo);
        if (saleId.HasValue) query = query.Where(item => item.VentaId == saleId.Value);
        var returns = await query.AsNoTracking()
            .OrderByDescending(item => item.FechaCreacionUtc)
            .Take(500)
            .ToListAsync(cancellationToken);
        return returns.Select(MapReturnToDto).ToList();
    }

    public async Task<List<DocumentTemplateDto>> GetDocumentTemplatesAsync(CancellationToken cancellationToken = default)
    {
        var templates = await _dbContext.DocumentTemplates.AsNoTracking()
            .Where(template => template.EstaActivo)
            .OrderBy(template => template.Categoria)
            .ThenBy(template => template.Titulo)
            .ToListAsync(cancellationToken);
        return templates.Select(MapTemplateToDto).ToList();
    }

    public async Task<DocumentTemplateDto> CreateDocumentTemplateAsync(
        SaveDocumentTemplateDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var values = ValidateTemplate(request);
        var template = new PlantillaDocumento
        {
            Titulo = values.Title,
            Categoria = values.Category,
            ContenidoHtmlPlantilla = values.Content,
            EstaActivo = true,
            FechaCreacionUtc = DateTime.UtcNow
        };
        _dbContext.DocumentTemplates.Add(template);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await AuditTemplateAsync(template, "DOCUMENT_TEMPLATE_CREATED", null, currentUserId, correlationId, ipAddress, cancellationToken);
        return MapTemplateToDto(template);
    }

    public async Task<DocumentTemplateDto> UpdateDocumentTemplateAsync(
        Guid id,
        SaveDocumentTemplateDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var template = await _dbContext.DocumentTemplates.FirstOrDefaultAsync(item => item.Id == id && item.EstaActivo, cancellationToken)
            ?? throw new KeyNotFoundException("La plantilla de documento no existe.");
        var values = ValidateTemplate(request);
        var previous = JsonSerializer.Serialize(new { template.Titulo, template.Categoria, template.ContenidoHtmlPlantilla });
        template.Titulo = values.Title;
        template.Categoria = values.Category;
        template.ContenidoHtmlPlantilla = values.Content;
        template.FechaActualizacionUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        await AuditTemplateAsync(template, "DOCUMENT_TEMPLATE_UPDATED", previous, currentUserId, correlationId, ipAddress, cancellationToken);
        return MapTemplateToDto(template);
    }

    private IQueryable<Cotizacion> BuildQuoteQuery() => _dbContext.Quotes
        .Include(quote => quote.Cliente)
        .Include(quote => quote.Usuario)
        .Include(quote => quote.Partidas)
            .ThenInclude(item => item.Producto);

    private IQueryable<DevolucionCabecera> BuildReturnQuery() => _dbContext.ReturnHeaders
        .Include(item => item.Venta)
        .Include(item => item.Detalle)
            .ThenInclude(item => item.Producto);

    private async Task<ReturnHeaderDto?> GetReturnByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var item = await BuildReturnQuery().AsNoTracking().FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        return item == null ? null : MapReturnToDto(item);
    }

    private async Task EnsureActiveUserAsync(Guid? currentUserId, CancellationToken cancellationToken)
    {
        if (!currentUserId.HasValue ||
            !await _dbContext.Users.AnyAsync(user => user.Id == currentUserId.Value && user.EstaActivo, cancellationToken))
        {
            throw new InvalidOperationException("La sesión no corresponde a un usuario activo.");
        }
    }

    private async Task<TResult> ExecuteInRetriableTransactionAsync<TResult>(
        Func<CancellationToken, Task<TResult>> operation,
        CancellationToken cancellationToken)
    {
        if (!_dbContext.Database.IsRelational() || _dbContext.Database.CurrentTransaction != null)
        {
            return await operation(cancellationToken);
        }

        var executionStrategy = _dbContext.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
            var result = await operation(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return result;
        });
    }

    private async Task ThrowQuoteConversionErrorAsync(Guid id, DateTime nowUtc, CancellationToken cancellationToken)
    {
        var quote = await _dbContext.Quotes.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id && item.EstaActivo, cancellationToken)
            ?? throw new KeyNotFoundException($"Cotización con ID '{id}' no encontrada.");
        ValidateQuoteCanConvert(quote, nowUtc);
        throw new InvalidOperationException("La cotización está siendo procesada por otra operación.");
    }

    private static void ValidateQuoteCanConvert(Cotizacion quote, DateTime nowUtc)
    {
        if (quote.Estado == QuoteStatuses.Converted)
            throw new InvalidOperationException("La cotización ya fue convertida a venta anteriormente.");
        if (quote.Estado != QuoteStatuses.Active)
            throw new InvalidOperationException("La cotización no se encuentra activa.");
        if (quote.FechaVigenciaUtc < nowUtc)
            throw new InvalidOperationException("La cotización se encuentra vencida.");
    }

    private static void ValidateQuantity(Guid productId, decimal quantity)
    {
        if (productId == Guid.Empty || quantity <= 0 || quantity > 100_000m || decimal.Truncate(quantity) != quantity)
        {
            throw new ArgumentException("Cada partida debe tener un producto y una cantidad entera válida.");
        }
    }

    private static void ValidateAmount(decimal amount, string fieldName, bool requirePositive = false)
    {
        if (amount < 0 || (requirePositive && amount == 0) || amount > MaximumCommercialAmount)
        {
            throw new ArgumentException($"{fieldName} debe ser {(requirePositive ? "mayor a cero" : "igual o mayor a cero")} y no exceder ${MaximumCommercialAmount:N2}.");
        }
    }

    private static string NormalizePaymentMethod(string paymentMethod) =>
        PaymentMethods.All.FirstOrDefault(method => string.Equals(method, paymentMethod?.Trim(), StringComparison.OrdinalIgnoreCase))
        ?? throw new ArgumentException("La forma de pago seleccionada no es válida.");

    private static string NormalizeText(string? value, string fieldName, int maxLength, bool required)
    {
        var normalized = value?.Trim() ?? string.Empty;
        if (required && normalized.Length < 3) throw new ArgumentException($"{fieldName} debe contener al menos 3 caracteres.");
        if (normalized.Length > maxLength) throw new ArgumentException($"{fieldName} no puede exceder {maxLength} caracteres.");
        return normalized;
    }

    private static string GenerateFolio(string prefix)
    {
        var nowUtc = DateTime.UtcNow;
        return $"{prefix}-{nowUtc:yyyyMMdd}-{Guid.NewGuid():N}"[..Math.Min(32, prefix.Length + 27)].ToUpperInvariant();
    }

    private QuoteDto MapQuoteToDto(Cotizacion quote)
    {
        var status = quote.Estado == QuoteStatuses.Active && quote.FechaVigenciaUtc < DateTime.UtcNow
            ? QuoteStatuses.Expired
            : quote.Estado;

        decimal advanceAmount = 0m;
        decimal pendingBalance = 0m;
        decimal discountAmount = quote.MontoDescuento;

        var convertedSale = _dbContext.Sales
            .AsNoTracking()
            .OrderByDescending(s => s.FechaCreacionUtc)
            .FirstOrDefault(s => s.EstaActivo && s.Notas.Contains(quote.NumeroCotizacion));

        if (convertedSale != null)
        {
            advanceAmount = convertedSale.MontoAnticipo > 0m
                ? convertedSale.MontoAnticipo
                : Math.Max(0m, convertedSale.MontoTotal - convertedSale.SaldoPendiente);

            pendingBalance = convertedSale.SaldoPendiente;

            if (advanceAmount > 0m && advanceAmount == quote.MontoDescuento)
            {
                discountAmount = 0m;
            }
        }

        return new QuoteDto(
            quote.Id,
            quote.NumeroCotizacion,
            quote.ClienteId,
            quote.Cliente?.NombreMostrar,
            quote.UsuarioId,
            quote.Usuario?.NombreUsuario,
            quote.SubTotal,
            discountAmount,
            quote.MontoIva,
            quote.MontoTotal,
            quote.FechaVigenciaUtc,
            status,
            quote.Notas,
            quote.FechaCreacionUtc,
            quote.Partidas.Select(item => new QuoteItemDto(
                item.Id,
                item.ProductoId,
                item.Producto?.Sku ?? string.Empty,
                item.Producto?.Nombre ?? string.Empty,
                item.Producto?.UnidadMedida ?? "Pza",
                item.Cantidad,
                item.PrecioUnitario,
                item.MontoDescuento,
                item.PrecioTotal)).ToList(),
            advanceAmount,
            pendingBalance);
    }

    private static PaymentInstallmentDto MapInstallmentToDto(AbonoPago installment, Venta sale) => new(
        installment.Id,
        installment.VentaId,
        sale.NumeroFolio,
        installment.NumeroRecibo,
        installment.MontoAbonado,
        installment.SaldoPendienteAnterior,
        installment.SaldoPendienteNuevo,
        installment.FormaPago,
        installment.Usuario?.NombreUsuario,
        installment.Notas,
        installment.FechaCreacionUtc,
        false);

    private static PaymentInstallmentDto? MapInitialInstallment(Venta sale)
    {
        var advanceAmount = sale.MontoAnticipo > 0m ? sale.MontoAnticipo : Math.Max(sale.MontoEfectivo, Math.Max(sale.MontoTarjeta, sale.MontoTransferencia));
        if (sale.TipoPago != SalePaymentTypes.AdvanceDeposit || advanceAmount <= 0m) return null;
        var method = sale.MontoTarjeta > 0m ? PaymentMethods.Card : (sale.MontoTransferencia > 0m ? PaymentMethods.Transfer : PaymentMethods.Cash);
        return new PaymentInstallmentDto(
            sale.Id,
            sale.Id,
            sale.NumeroFolio,
            $"ANTICIPO-{sale.NumeroFolio}",
            advanceAmount,
            sale.MontoTotal,
            Math.Max(0m, sale.MontoTotal - advanceAmount),
            method,
            sale.Usuario?.NombreUsuario,
            "Anticipo registrado al crear la venta",
            sale.FechaCreacionUtc,
            true);
    }

    private static IEnumerable<PaymentTransactionDto> MapInitialTransactions(Venta sale)
    {
        var hasCash = sale.MontoEfectivo > 0m;
        var hasCard = sale.MontoTarjeta > 0m;
        var hasTransfer = sale.MontoTransferencia > 0m;

        if (hasCash) yield return MapInitialTransaction(sale, PaymentMethods.Cash, sale.MontoEfectivo);
        if (hasCard) yield return MapInitialTransaction(sale, PaymentMethods.Card, sale.MontoTarjeta);
        if (hasTransfer) yield return MapInitialTransaction(sale, PaymentMethods.Transfer, sale.MontoTransferencia);

        if (!hasCash && !hasCard && !hasTransfer)
        {
            if (sale.MontoAnticipo > 0m)
            {
                yield return MapInitialTransaction(sale, PaymentMethods.Cash, sale.MontoAnticipo);
            }
            else if (sale.MontoTotal > 0m)
            {
                yield return MapInitialTransaction(sale, PaymentMethods.Cash, sale.MontoTotal);
            }
        }
    }

    private static PaymentTransactionDto MapInitialTransaction(Venta sale, string method, decimal amount) => new(
        $"{sale.Id}:{method.ToLowerInvariant()}",
        sale.Id,
        sale.NumeroFolio,
        sale.Cliente?.NombreMostrar,
        sale.TipoPago == SalePaymentTypes.AdvanceDeposit ? "Advance" : "Sale",
        sale.TipoPago == SalePaymentTypes.AdvanceDeposit ? $"ANTICIPO-{sale.NumeroFolio}" : $"PAGO-{sale.NumeroFolio}",
        method,
        amount,
        sale.Usuario?.NombreUsuario,
        sale.FechaCreacionUtc);

    private static string? NormalizeOptionalPaymentMethod(string? paymentMethod)
    {
        if (string.IsNullOrWhiteSpace(paymentMethod)) return null;
        return NormalizePaymentMethod(paymentMethod);
    }

    private static void ValidateDateRange(DateTime? startDate, DateTime? endDate)
    {
        if (startDate.HasValue && endDate.HasValue && startDate.Value > endDate.Value)
        {
            throw new ArgumentException("La fecha inicial no puede ser posterior a la fecha final.");
        }
    }

    private static ReturnHeaderDto MapReturnToDto(DevolucionCabecera item) => new(
        item.Id,
        item.NumeroDevolucion,
        item.VentaId,
        item.Venta?.NumeroFolio ?? string.Empty,
        item.MontoTotalDevuelto,
        item.MontoAplicadoSaldoPendiente,
        item.MontoReembolsado,
        item.FormaReembolso,
        item.Motivo,
        item.Estado,
        item.FechaCreacionUtc,
        item.Detalle.Select(detail => new ReturnItemDto(
            detail.ProductoId,
            detail.Producto?.Sku ?? string.Empty,
            detail.Producto?.Nombre ?? string.Empty,
            detail.Cantidad,
            detail.PrecioUnitarioDevolucion,
            detail.PrecioTotalDevolucion)).ToList());

    private static DocumentTemplateDto MapTemplateToDto(PlantillaDocumento template) =>
        new(template.Id, template.Titulo, template.Categoria, template.ContenidoHtmlPlantilla);

    private static (string Title, string Category, string Content) ValidateTemplate(SaveDocumentTemplateDto request)
    {
        var title = NormalizeText(request.Title, "El título", 150, required: true);
        var category = DocumentTemplateCategories.All.FirstOrDefault(item =>
            string.Equals(item, request.Category?.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException("La categoría de plantilla no es válida.");
        var content = NormalizeText(request.TemplateContent, "El contenido", 10_000, required: true);
        return (title, category, content);
    }

    private async Task AuditTemplateAsync(
        PlantillaDocumento template,
        string action,
        string? previous,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken)
    {
        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            action,
            "PlantillaDocumento",
            template.Id.ToString(),
            previous,
            JsonSerializer.Serialize(new { template.Titulo, template.Categoria, ContentLength = template.ContenidoHtmlPlantilla.Length }),
            ipAddress,
            $"Plantilla guardada: {template.Titulo}",
            cancellationToken);
    }
}
