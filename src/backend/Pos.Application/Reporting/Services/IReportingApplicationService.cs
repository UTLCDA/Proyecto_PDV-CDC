using Pos.Application.Reporting.DTOs;

namespace Pos.Application.Reporting.Services;

public interface IReportingApplicationService
{
    Task<SalesSummaryReportDto> GetSalesSummaryReportAsync(DateTime? startDate, DateTime? endDate, CancellationToken cancellationToken = default);
    Task<List<TopProductReportDto>> GetTopSellingProductsReportAsync(int top = 10, CancellationToken cancellationToken = default);
    Task<List<AuditLogDto>> GetAuditLogsAsync(string? correlationId, string? userSearch, string? action, CancellationToken cancellationToken = default);
}
