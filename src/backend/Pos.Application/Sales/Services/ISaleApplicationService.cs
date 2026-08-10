using Pos.Application.Sales.DTOs;

namespace Pos.Application.Sales.Services;

public interface ISaleApplicationService
{
    Task<SaleDto> ProcessSaleAsync(CreateSaleDto request, Guid? currentUserId, string correlationId, string ipAddress, bool canApplyDiscount = false, CancellationToken cancellationToken = default, IReadOnlyDictionary<Guid, decimal>? authorizedUnitPrices = null);
    Task<List<SaleDto>> GetSalesAsync(string? search, Guid? customerId, string? status, DateTime? startDate, DateTime? endDate, CancellationToken cancellationToken = default);
    Task<SalesSummaryDto> GetSalesSummaryAsync(string? search, string? status, DateTime? startDate, DateTime? endDate, CancellationToken cancellationToken = default);
    Task<SaleDto?> GetSaleByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<SaleDto?> GetSaleByFolioAsync(int idVenta, CancellationToken cancellationToken = default);
}
