using Microsoft.EntityFrameworkCore;
using Pos.Application.Reporting.DTOs;
using Pos.Application.Reporting.Services;
using Pos.Domain.Common;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class ReportingApplicationService : IReportingApplicationService
{
    private readonly PosDbContext _dbContext;

    public ReportingApplicationService(PosDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<SalesSummaryReportDto> GetSalesSummaryReportAsync(
        DateTime? startDate,
        DateTime? endDate,
        CancellationToken cancellationToken = default)
    {
        ValidateDateRange(startDate, endDate);

        var query = FilterSalesByDate(startDate, endDate);
        var sales = await query
            .Select(sale => new
            {
                sale.Id,
                sale.MontoTotal,
                sale.MontoIva,
                sale.MontoDescuento,
                sale.MontoEfectivo,
                sale.MontoTarjeta,
                sale.MontoTransferencia,
                sale.MontoAnticipo
            })
            .ToListAsync(cancellationToken);

        var saleIds = sales.Select(sale => sale.Id).ToList();
        var installments = saleIds.Count == 0
            ? []
            : await _dbContext.PaymentInstallments
                .AsNoTracking()
                .Where(payment => payment.EstaActivo && saleIds.Contains(payment.VentaId))
                .Select(payment => new { payment.MontoAbonado, payment.FormaPago })
                .ToListAsync(cancellationToken);
        var returns = saleIds.Count == 0
            ? []
            : await _dbContext.ReturnHeaders
                .AsNoTracking()
                .Where(item => item.EstaActivo && item.Estado == ReturnStatuses.Completed && saleIds.Contains(item.VentaId))
                .Select(item => new { item.MontoTotalDevuelto, item.MontoReembolsado, item.FormaReembolso })
                .ToListAsync(cancellationToken);

        var totalSalesAmount = sales.Sum(sale => sale.MontoTotal);
        var totalReturnedAmount = returns.Sum(item => item.MontoTotalDevuelto);
        var netSalesAmount = totalSalesAmount - totalReturnedAmount;
        var totalSalesCount = sales.Count;

        var initialCash = sales.Sum(sale =>
            sale.MontoEfectivo + sale.MontoTarjeta + sale.MontoTransferencia > 0m
                ? sale.MontoEfectivo
                : sale.MontoAnticipo);
        var initialCard = sales.Sum(sale => sale.MontoTarjeta);
        var initialTransfer = sales.Sum(sale => sale.MontoTransferencia);

        return new SalesSummaryReportDto(
            totalSalesCount,
            totalSalesAmount,
            totalReturnedAmount,
            netSalesAmount,
            sales.Sum(sale => sale.MontoIva),
            sales.Sum(sale => sale.MontoDescuento),
            totalSalesCount > 0 ? netSalesAmount / totalSalesCount : 0m,
            initialCash + installments.Where(item => item.FormaPago == PaymentMethods.Cash).Sum(item => item.MontoAbonado)
                - returns.Where(item => item.FormaReembolso == RefundMethods.Cash).Sum(item => item.MontoReembolsado),
            initialCard + installments.Where(item => item.FormaPago == PaymentMethods.Card).Sum(item => item.MontoAbonado)
                - returns.Where(item => item.FormaReembolso == RefundMethods.Card).Sum(item => item.MontoReembolsado),
            initialTransfer + installments.Where(item => item.FormaPago == PaymentMethods.Transfer).Sum(item => item.MontoAbonado)
                - returns.Where(item => item.FormaReembolso == RefundMethods.Transfer).Sum(item => item.MontoReembolsado));
    }

    public async Task<List<TopProductReportDto>> GetTopSellingProductsReportAsync(
        DateTime? startDate,
        DateTime? endDate,
        int top = 10,
        CancellationToken cancellationToken = default)
    {
        ValidateDateRange(startDate, endDate);
        if (top is < 1 or > 100)
        {
            throw new ArgumentException("La cantidad de productos solicitada debe estar entre 1 y 100.");
        }

        var saleIds = await FilterSalesByDate(startDate, endDate)
            .Select(sale => sale.Id)
            .ToListAsync(cancellationToken);
        if (saleIds.Count == 0)
        {
            return [];
        }

        var soldItems = await _dbContext.SaleItems
            .AsNoTracking()
            .Where(item => item.EstaActivo && saleIds.Contains(item.VentaId))
            .Select(item => new
            {
                item.ProductoId,
                item.Producto.Sku,
                item.Producto.Nombre,
                CategoryName = item.Producto.Categoria.Nombre,
                item.Cantidad,
                item.PrecioTotal,
                SaleSubTotal = item.Venta.SubTotal,
                SaleTotal = item.Venta.MontoTotal
            })
            .ToListAsync(cancellationToken);
        var returnedItems = await _dbContext.ReturnItems
            .AsNoTracking()
            .Where(item => item.EstaActivo &&
                item.DevolucionCabecera.EstaActivo &&
                item.DevolucionCabecera.Estado == ReturnStatuses.Completed &&
                saleIds.Contains(item.DevolucionCabecera.VentaId))
            .Select(item => new { item.ProductoId, item.Cantidad, item.PrecioTotalDevolucion })
            .ToListAsync(cancellationToken);
        var returnsByProduct = returnedItems
            .GroupBy(item => item.ProductoId)
            .ToDictionary(
                group => group.Key,
                group => new
                {
                    Quantity = group.Sum(item => item.Cantidad),
                    Amount = group.Sum(item => item.PrecioTotalDevolucion)
                });

        return soldItems
            .GroupBy(item => new { item.ProductoId, item.Sku, item.Nombre, item.CategoryName })
            .Select(group =>
            {
                returnsByProduct.TryGetValue(group.Key.ProductoId, out var returned);
                var soldQuantity = group.Sum(item => item.Cantidad);
                var returnedQuantity = returned?.Quantity ?? 0m;
                var grossRevenue = group.Sum(item => item.SaleSubTotal > 0m
                    ? item.PrecioTotal * item.SaleTotal / item.SaleSubTotal
                    : 0m);
                var returnedAmount = returned?.Amount ?? 0m;
                return new TopProductReportDto(
                    group.Key.ProductoId,
                    group.Key.Sku,
                    group.Key.Nombre,
                    group.Key.CategoryName,
                    soldQuantity,
                    returnedQuantity,
                    soldQuantity - returnedQuantity,
                    grossRevenue,
                    returnedAmount,
                    grossRevenue - returnedAmount);
            })
            .OrderByDescending(item => item.NetQuantitySold)
            .ThenByDescending(item => item.NetRevenue)
            .Take(top)
            .ToList();
    }

    public async Task<InventorySummaryReportDto> GetInventorySummaryReportAsync(CancellationToken cancellationToken = default)
    {
        var stocks = await _dbContext.Stocks
            .AsNoTracking()
            .Where(stock => stock.EstaActivo && stock.Producto.EstaActivo)
            .Select(stock => new
            {
                stock.CantidadDisponible,
                stock.UmbralMinimoAlerta,
                stock.CantidadReorden,
                stock.Producto.PrecioUnitario,
                ProductId = stock.ProductoId,
                stock.Producto.Sku,
                ProductName = stock.Producto.Nombre,
                stock.Producto.UnidadMedida
            })
            .ToListAsync(cancellationToken);

        return new InventorySummaryReportDto(
            stocks.Count,
            stocks.Sum(stock => stock.CantidadDisponible),
            stocks.Count(stock => stock.CantidadDisponible > 0m && stock.CantidadDisponible <= stock.UmbralMinimoAlerta),
            stocks.Count(stock => stock.CantidadDisponible <= 0m),
            stocks.Sum(stock => stock.CantidadDisponible * stock.PrecioUnitario),
            stocks.Where(stock => stock.CantidadDisponible <= stock.UmbralMinimoAlerta).Sum(stock => stock.CantidadReorden),
            stocks
                .Where(stock => stock.CantidadDisponible <= stock.UmbralMinimoAlerta)
                .OrderBy(stock => stock.CantidadDisponible)
                .ThenBy(stock => stock.ProductName)
                .Select(stock => new LowStockProductReportDto(
                    stock.ProductId,
                    stock.Sku,
                    stock.ProductName,
                    stock.CantidadDisponible,
                    stock.UmbralMinimoAlerta,
                    stock.CantidadReorden,
                    stock.UnidadMedida,
                    stock.CantidadDisponible <= 0m))
                .ToList());
    }

    public async Task<List<AuditLogDto>> GetAuditLogsAsync(
        string? correlationId,
        string? userSearch,
        string? action,
        DateTime? startDate,
        DateTime? endDate,
        int? idVenta = null,
        string? module = null,
        string? eventType = null,
        string? resultStatus = null,
        CancellationToken cancellationToken = default,
        int page = 1,
        int pageSize = 200)
    {
        ValidateDateRange(startDate, endDate);
        var query = _dbContext.AuditLogs.Include(log => log.Usuario).AsNoTracking().AsQueryable();

        if (idVenta.HasValue)
        {
            if (idVenta.Value <= 0)
            {
                throw new ArgumentException("El folio operativo IdVenta debe ser mayor a cero.");
            }

            var saleId = await _dbContext.Sales.AsNoTracking()
                .Where(sale => sale.IdVenta == idVenta.Value)
                .Select(sale => (Guid?)sale.Id)
                .SingleOrDefaultAsync(cancellationToken);
            if (!saleId.HasValue) return [];

            var saleEntityId = saleId.Value.ToString();
            var installmentEntityIds = await _dbContext.PaymentInstallments.AsNoTracking()
                .Where(item => item.VentaId == saleId.Value)
                .Select(item => item.Id.ToString())
                .ToListAsync(cancellationToken);
            var returnEntityIds = await _dbContext.ReturnHeaders.AsNoTracking()
                .Where(item => item.VentaId == saleId.Value)
                .Select(item => item.Id.ToString())
                .ToListAsync(cancellationToken);

            query = query.Where(log =>
                (log.NombreEntidad == "Venta" && log.EntidadId == saleEntityId) ||
                (log.NombreEntidad == "AbonoPago" && installmentEntityIds.Contains(log.EntidadId!)) ||
                (log.NombreEntidad == "DevolucionCabecera" && returnEntityIds.Contains(log.EntidadId!)));
        }

        if (!string.IsNullOrWhiteSpace(correlationId))
        {
            var normalizedCorrelationId = correlationId.Trim();
            query = query.Where(log => log.IdCorrelacion == normalizedCorrelationId);
        }

        if (!string.IsNullOrWhiteSpace(userSearch))
        {
            var term = userSearch.Trim().ToLower();
            query = query.Where(log => log.Usuario != null &&
                (log.Usuario.NombreUsuario.ToLower().Contains(term) || log.Usuario.Email.ToLower().Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            var normalizedAction = action.Trim().ToLower();
            query = query.Where(log => log.Accion.ToLower().Contains(normalizedAction) ||
                (log.Motivo != null && log.Motivo.ToLower().Contains(normalizedAction)) ||
                (log.ValoresNuevosJson != null && log.ValoresNuevosJson.ToLower().Contains(normalizedAction)));
        }

        if (!string.IsNullOrWhiteSpace(module))
        {
            var normalizedModule = module.Trim().ToLower();
            query = query.Where(log => log.ValoresNuevosJson != null && log.ValoresNuevosJson.ToLower().Contains(normalizedModule));
        }

        if (!string.IsNullOrWhiteSpace(eventType))
        {
            var normalizedEventType = eventType.Trim().ToLower();
            query = query.Where(log => log.Accion.ToLower().Contains(normalizedEventType) ||
                (log.ValoresNuevosJson != null && log.ValoresNuevosJson.ToLower().Contains(normalizedEventType)));
        }

        if (!string.IsNullOrWhiteSpace(resultStatus))
        {
            var normalizedStatus = resultStatus.Trim().ToLower();
            query = query.Where(log => log.ValoresNuevosJson != null && log.ValoresNuevosJson.ToLower().Contains(normalizedStatus));
        }

        if (startDate.HasValue)
        {
            query = query.Where(log => log.FechaCreacionUtc >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(log => log.FechaCreacionUtc <= endDate.Value);
        }

        var (skip, take) = QueryPaging.Normalize(page, pageSize, 200);
        var logs = await query
            .OrderByDescending(log => log.FechaCreacionUtc)
            .ThenByDescending(log => log.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        var saleIds = ParseEntityIds(logs.Where(log => log.NombreEntidad == "Venta").Select(log => log.EntidadId));
        var installmentIds = ParseEntityIds(logs.Where(log => log.NombreEntidad == "AbonoPago").Select(log => log.EntidadId));
        var returnIds = ParseEntityIds(logs.Where(log => log.NombreEntidad == "DevolucionCabecera").Select(log => log.EntidadId));

        var saleReferences = await _dbContext.Sales.AsNoTracking()
            .Where(sale => saleIds.Contains(sale.Id))
            .ToDictionaryAsync(sale => sale.Id, sale => sale.IdVenta, cancellationToken);
        var installmentReferences = await _dbContext.PaymentInstallments.AsNoTracking()
            .Where(item => installmentIds.Contains(item.Id))
            .Select(item => new { item.Id, IdVenta = item.IdVenta ?? item.Venta.IdVenta })
            .ToDictionaryAsync(item => item.Id, item => item.IdVenta, cancellationToken);
        var returnReferences = await _dbContext.ReturnHeaders.AsNoTracking()
            .Where(item => returnIds.Contains(item.Id))
            .Select(item => new { item.Id, IdVenta = item.IdVenta ?? item.Venta.IdVenta })
            .ToDictionaryAsync(item => item.Id, item => item.IdVenta, cancellationToken);

        return logs.Select(log =>
        {
            int? operationalId = null;
            if (Guid.TryParse(log.EntidadId, out var entityId))
            {
                operationalId = log.NombreEntidad switch
                {
                    "Venta" when saleReferences.TryGetValue(entityId, out var saleIdVenta) => saleIdVenta,
                    "AbonoPago" when installmentReferences.TryGetValue(entityId, out var installmentIdVenta) => installmentIdVenta,
                    "DevolucionCabecera" when returnReferences.TryGetValue(entityId, out var returnIdVenta) => returnIdVenta,
                    _ => null
                };
            }

            string? extractedModule = null;
            string? extractedEventType = null;
            string? extractedResultStatus = null;

            if (!string.IsNullOrWhiteSpace(log.ValoresNuevosJson) && log.ValoresNuevosJson.TrimStart().StartsWith("{"))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(log.ValoresNuevosJson);
                    if (doc.RootElement.TryGetProperty("module", out var modProp)) extractedModule = modProp.GetString();
                    if (doc.RootElement.TryGetProperty("eventType", out var evtProp)) extractedEventType = evtProp.GetString();
                    if (doc.RootElement.TryGetProperty("resultStatus", out var resProp)) extractedResultStatus = resProp.GetString();
                }
                catch { }
            }

            return new AuditLogDto(
                log.Id,
                operationalId,
                log.IdCorrelacion,
                log.Usuario?.NombreUsuario,
                log.Accion,
                log.NombreEntidad,
                log.EntidadId,
                log.ValoresAnterioresJson,
                log.ValoresNuevosJson,
                log.DireccionIp,
                log.Motivo ?? string.Empty,
                log.FechaCreacionUtc,
                extractedModule,
                extractedEventType,
                extractedResultStatus);
        }).ToList();
    }

    private static List<Guid> ParseEntityIds(IEnumerable<string?> values) => values
        .Select(value => Guid.TryParse(value, out var id) ? id : Guid.Empty)
        .Where(id => id != Guid.Empty)
        .Distinct()
        .ToList();

    private IQueryable<Pos.Domain.Entidades.Venta> FilterSalesByDate(DateTime? startDate, DateTime? endDate)
    {
        var query = _dbContext.Sales
            .AsNoTracking()
            .Where(sale => sale.EstaActivo && sale.Estado != SaleStatuses.Cancelled);

        if (startDate.HasValue)
        {
            query = query.Where(sale => sale.FechaCreacionUtc >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            var effectiveEndDate = endDate.Value.TimeOfDay == TimeSpan.Zero
                ? endDate.Value.Date.AddDays(1).AddTicks(-1)
                : endDate.Value;
            query = query.Where(sale => sale.FechaCreacionUtc <= effectiveEndDate);
        }

        return query;
    }

    private static void ValidateDateRange(DateTime? startDate, DateTime? endDate)
    {
        if (startDate.HasValue && endDate.HasValue && startDate.Value > endDate.Value)
        {
            throw new ArgumentException("La fecha inicial no puede ser posterior a la fecha final.");
        }
    }
}
