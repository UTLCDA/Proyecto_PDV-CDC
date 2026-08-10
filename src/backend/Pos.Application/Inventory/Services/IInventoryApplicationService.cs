using Pos.Application.Inventory.DTOs;

namespace Pos.Application.Inventory.Services;

public interface IInventoryApplicationService
{
    Task<List<StockDto>> GetStockLevelsAsync(string? search, bool? isLowStockOnly, CancellationToken cancellationToken = default);
    Task<StockDto?> GetStockByProductIdAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<List<InventoryMovementDto>> GetMovementsAsync(Guid? productId, string? movementType, string? search, DateTime? startDateUtc, DateTime? endDateUtc, CancellationToken cancellationToken = default);
    Task<InventoryMovementDto> RegisterMovementAsync(RegisterMovementDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
}
