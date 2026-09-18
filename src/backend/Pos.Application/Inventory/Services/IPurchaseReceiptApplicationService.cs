using Pos.Application.Common.Models;
using Pos.Application.Inventory.DTOs;

namespace Pos.Application.Inventory.Services;

public interface IPurchaseReceiptApplicationService
{
    Task<PagedResult<PurchaseReceiptDto>> GetReceiptsAsync(
        string? search,
        int pageNumber,
        int pageSize,
        string? sortBy,
        string? sortDirection,
        CancellationToken cancellationToken = default);

    Task<PurchaseReceiptDto?> GetReceiptByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<PurchaseReceiptDto> CreateReceiptAsync(
        CreatePurchaseReceiptDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default);

    Task<PurchaseReceiptDto> UpdateReceiptAsync(
        Guid id,
        UpdatePurchaseReceiptDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default);
}
