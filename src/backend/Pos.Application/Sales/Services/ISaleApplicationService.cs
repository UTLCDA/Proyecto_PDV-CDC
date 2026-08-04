using Pos.Application.Sales.DTOs;

namespace Pos.Application.Sales.Services;

public interface ISaleApplicationService
{
    Task<SaleDto> ProcessSaleAsync(CreateSaleDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<List<SaleDto>> GetSalesAsync(string? search, Guid? customerId, string? status, CancellationToken cancellationToken = default);
    Task<SaleDto?> GetSaleByIdAsync(Guid id, CancellationToken cancellationToken = default);
}
