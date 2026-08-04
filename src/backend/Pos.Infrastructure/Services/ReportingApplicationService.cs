using Microsoft.EntityFrameworkCore;
using Pos.Application.Reporting.DTOs;
using Pos.Application.Reporting.Services;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class ReportingApplicationService : IReportingApplicationService
{
    private readonly PosDbContext _dbContext;

    public ReportingApplicationService(PosDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<SalesSummaryReportDto> GetSalesSummaryReportAsync(DateTime? startDate, DateTime? endDate, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Sales.Where(s => s.EstaActivo && s.Estado != "Cancelada");

        if (startDate.HasValue)
        {
            query = query.Where(s => s.FechaCreacionUtc >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(s => s.FechaCreacionUtc <= endDate.Value);
        }

        var sales = await query.ToListAsync(cancellationToken);

        int totalSalesCount = sales.Count;
        decimal totalSalesAmount = sales.Sum(s => s.MontoTotal);
        decimal totalTaxAmount = sales.Sum(s => s.MontoIva);
        decimal totalDiscountAmount = sales.Sum(s => s.MontoDescuento);
        decimal averageTicketAmount = totalSalesCount > 0 ? totalSalesAmount / totalSalesCount : 0m;

        decimal totalCashIncome = sales.Sum(s => s.MontoEfectivo > 0 ? s.MontoEfectivo : (s.TipoPago == "FullPayment" || s.TipoPago == "AdvanceDeposit" ? s.MontoAnticipo : 0m));
        decimal totalCardIncome = sales.Sum(s => s.MontoTarjeta);
        decimal totalTransferIncome = sales.Sum(s => s.MontoTransferencia);

        return new SalesSummaryReportDto(
            totalSalesCount,
            totalSalesAmount,
            totalTaxAmount,
            totalDiscountAmount,
            averageTicketAmount,
            totalCashIncome,
            totalCardIncome,
            totalTransferIncome
        );
    }

    public async Task<List<TopProductReportDto>> GetTopSellingProductsReportAsync(int top = 10, CancellationToken cancellationToken = default)
    {
        var items = await _dbContext.SaleItems
            .Include(i => i.Producto)
                .ThenInclude(p => p.Categoria)
            .Where(i => i.Venta.Estado != "Cancelada")
            .GroupBy(i => new { i.ProductoId, i.Producto.Sku, i.Producto.Nombre, CategoryName = i.Producto.Categoria.Nombre })
            .Select(g => new TopProductReportDto(
                g.Key.ProductoId,
                g.Key.Sku,
                g.Key.Nombre,
                g.Key.CategoryName,
                g.Sum(x => x.Cantidad),
                g.Sum(x => x.PrecioTotal)
            ))
            .OrderByDescending(x => x.TotalQuantitySold)
            .Take(top)
            .ToListAsync(cancellationToken);

        return items;
    }

    public async Task<List<AuditLogDto>> GetAuditLogsAsync(string? correlationId, string? userSearch, string? action, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.AuditLogs.Include(a => a.Usuario).AsQueryable();

        if (!string.IsNullOrWhiteSpace(correlationId))
        {
            query = query.Where(a => a.IdCorrelacion == correlationId.Trim());
        }

        if (!string.IsNullOrWhiteSpace(userSearch))
        {
            var term = userSearch.Trim().ToLower();
            query = query.Where(a => a.Usuario != null && a.Usuario.NombreUsuario.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(a => a.Accion.ToLower() == action.Trim().ToLower());
        }

        var logs = await query.OrderByDescending(a => a.FechaCreacionUtc).Take(100).ToListAsync(cancellationToken);

        return logs.Select(a => new AuditLogDto(
            a.Id,
            a.IdCorrelacion,
            a.Usuario?.NombreUsuario,
            a.Accion,
            a.NombreEntidad,
            a.EntidadId,
            a.ValoresAnterioresJson,
            a.ValoresNuevosJson,
            a.DireccionIp,
            a.Motivo ?? string.Empty,
            a.FechaCreacionUtc
        )).ToList();
    }
}
