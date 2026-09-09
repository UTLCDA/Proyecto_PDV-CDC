using Pos.Application.Common.Models;
using Pos.Application.Inventory.DTOs;

namespace Pos.Application.Inventory.Services;

public interface IInventoryApplicationService
{
    Task<PagedResult<StockDto>> GetStockLevelsAsync(
        string? search,
        bool? isLowStockOnly,
        int pageNumber = 1,
        int pageSize = 25,
        string? sortBy = null,
        string? sortDirection = null,
        CancellationToken cancellationToken = default);

    Task<StockDto?> GetStockByProductIdAsync(Guid productId, CancellationToken cancellationToken = default);

    Task<PagedResult<InventoryMovementDto>> GetMovementsAsync(
        Guid? productId,
        string? movementType,
        string? search,
        DateTime? startDateUtc,
        DateTime? endDateUtc,
        int pageNumber = 1,
        int pageSize = 25,
        string? sortBy = null,
        string? sortDirection = null,
        CancellationToken cancellationToken = default);

    Task<InventoryMovementDto> RegisterMovementAsync(RegisterMovementDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
}
