using Microsoft.EntityFrameworkCore;
using Pos.Application.Common.Interfaces;
using Pos.Application.Sales.DTOs;
using Pos.Application.Sales.Services;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class SaleApplicationService : ISaleApplicationService
{
    private readonly PosDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    public SaleApplicationService(PosDbContext dbContext, IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    public async Task<SaleDto> ProcessSaleAsync(CreateSaleDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        if (request.Items == null || !request.Items.Any())
        {
            throw new ArgumentException("La venta debe contener al menos un producto.");
        }

        var totalSalesCount = await _dbContext.Sales.CountAsync(cancellationToken);
        var folioNumber = $"VENTA-{DateTime.UtcNow:yyyy}-{(totalSalesCount + 1):D5}";

        var sale = new Venta
        {
            NumeroFolio = folioNumber,
            ClienteId = request.CustomerId,
            UsuarioId = currentUserId,
            TipoPago = request.PaymentType,
            MontoDescuento = request.DiscountAmount,
            MontoAnticipo = request.AdvanceAmount,
            MontoEfectivo = request.CashAmount,
            MontoTarjeta = request.CardAmount,
            MontoTransferencia = request.TransferAmount,
            Notas = request.Notes,
            EstaActivo = true,
            FechaCreacionUtc = DateTime.UtcNow
        };

        foreach (var itemDto in request.Items)
        {
            var product = await _dbContext.Products.FirstOrDefaultAsync(p => p.Id == itemDto.ProductId, cancellationToken);
            if (product == null)
            {
                throw new KeyNotFoundException($"Producto con ID '{itemDto.ProductId}' no encontrado.");
            }

            var stock = await _dbContext.Stocks.FirstOrDefaultAsync(s => s.ProductoId == itemDto.ProductId, cancellationToken);
            if (stock == null)
            {
                stock = new Existencia { ProductoId = itemDto.ProductId, CantidadDisponible = 0m };
                _dbContext.Stocks.Add(stock);
            }

            decimal previousQty = stock.CantidadDisponible;
            stock.DeducirStock(itemDto.Quantity);
            decimal newQty = stock.CantidadDisponible;

            var saleItem = new PartidaVenta
            {
                ProductoId = itemDto.ProductId,
                Cantidad = itemDto.Quantity,
                PrecioUnitario = itemDto.UnitPrice,
                MontoDescuento = itemDto.DiscountAmount
            };
            saleItem.CalcularTotalPartida();
            sale.Partidas.Add(saleItem);

            var movement = new MovimientoInventario
            {
                ProductoId = itemDto.ProductId,
                TipoMovimiento = "Venta",
                Cantidad = itemDto.Quantity,
                CantidadAnterior = previousQty,
                CantidadNueva = newQty,
                Motivo = $"Venta Folio: {folioNumber}",
                NumeroReferencia = folioNumber,
                UsuarioId = currentUserId,
                FechaCreacionUtc = DateTime.UtcNow
            };
            _dbContext.InventoryMovements.Add(movement);
        }

        sale.CalcularTotales();

        // Validate Mixed Payment sum
        if (request.PaymentType == "MixedPayment")
        {
            decimal sumMixed = request.CashAmount + request.CardAmount + request.TransferAmount;
            if (Math.Abs(sumMixed - sale.MontoTotal) > 0.05m)
            {
                throw new ArgumentException($"En pago mixto, la suma de Efectivo (${request.CashAmount}), Tarjeta (${request.CardAmount}) y Transferencia (${request.TransferAmount}) debe ser igual al total (${sale.MontoTotal}).");
            }
        }

        _dbContext.Sales.Add(sale);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "SALE_COMPLETED",
            "Venta",
            sale.Id.ToString(),
            null,
            $"Folio={sale.NumeroFolio}, Total={sale.MontoTotal}, Type={sale.TipoPago}",
            ipAddress,
            $"Venta realizada con éxito Folio: {sale.NumeroFolio}",
            cancellationToken);

        return (await GetSaleByIdAsync(sale.Id, cancellationToken))!;
    }

    public async Task<List<SaleDto>> GetSalesAsync(string? search, Guid? customerId, string? status, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Sales
            .Include(s => s.Cliente)
            .Include(s => s.Usuario)
            .Include(s => s.Partidas)
                .ThenInclude(p => p.Producto)
            .Where(s => s.EstaActivo);

        if (customerId.HasValue)
        {
            query = query.Where(s => s.ClienteId == customerId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(s => s.Estado.ToLower() == status.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.NumeroFolio.ToLower().Contains(term) ||
                                     (s.Cliente != null && s.Cliente.Nombre.ToLower().Contains(term)));
        }

        var sales = await query.OrderByDescending(s => s.FechaCreacionUtc).ToListAsync(cancellationToken);
        return sales.Select(MapSaleToDto).ToList();
    }

    public async Task<SaleDto?> GetSaleByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var sale = await _dbContext.Sales
            .Include(s => s.Cliente)
            .Include(s => s.Usuario)
            .Include(s => s.Partidas)
                .ThenInclude(p => p.Producto)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        return sale == null ? null : MapSaleToDto(sale);
    }

    private static SaleDto MapSaleToDto(Venta s)
    {
        return new SaleDto(
            s.Id,
            s.NumeroFolio,
            s.ClienteId,
            s.Cliente?.NombreMostrar,
            s.UsuarioId,
            s.Usuario?.NombreUsuario,
            s.TipoPago,
            s.SubTotal,
            s.MontoDescuento,
            s.MontoIva,
            s.MontoTotal,
            s.MontoEfectivo,
            s.MontoTarjeta,
            s.MontoTransferencia,
            s.MontoAnticipo,
            s.SaldoPendiente,
            s.Estado,
            s.Notas,
            s.FechaCreacionUtc,
            s.Partidas.Select(p => new SaleItemDto(
                p.Id,
                p.ProductoId,
                p.Producto?.Sku ?? string.Empty,
                p.Producto?.Nombre ?? string.Empty,
                p.Producto?.UnidadMedida ?? "Pza",
                p.Cantidad,
                p.PrecioUnitario,
                p.MontoDescuento,
                p.PrecioTotal
            )).ToList()
        );
    }
}
