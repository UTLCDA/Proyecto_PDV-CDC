using Pos.Application.Common.Models;
using Pos.Application.Reporting.DTOs;

namespace Pos.Application.Reporting.Services;

public interface IReportingApplicationService
{
    Task<SalesSummaryReportDto> GetSalesSummaryReportAsync(DateTime? startDate, DateTime? endDate, CancellationToken cancellationToken = default);
    Task<List<TopProductReportDto>> GetTopSellingProductsReportAsync(DateTime? startDate, DateTime? endDate, int top = 10, CancellationToken cancellationToken = default);
    Task<InventorySummaryReportDto> GetInventorySummaryReportAsync(CancellationToken cancellationToken = default);
    Task<PagedResult<AuditLogDto>> GetAuditLogsAsync(
        string? correlationId,
        string? userSearch,
        string? action,
        DateTime? startDate,
        DateTime? endDate,
        int? idVenta = null,
        string? module = null,
        string? eventType = null,
        string? resultStatus = null,
        int pageNumber = 1,
        int pageSize = 25,
        string? sortBy = null,
        string? sortDirection = null,
        CancellationToken cancellationToken = default);
}
