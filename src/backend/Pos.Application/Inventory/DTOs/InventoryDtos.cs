namespace Pos.Application.Inventory.DTOs;

public record StockDto(
    Guid Id,
    Guid ProductId,
    string ProductSku,
    string ProductName,
    string CategoryName,
    decimal QuantityOnHand,
    decimal MinimumAlertThreshold,
    decimal ReorderQuantity,
    string UnitOfMeasure,
    string Location,
    bool IsLowStock,
    bool IsOutOfStock
);

public record InventoryMovementDto(
    Guid Id,
    Guid ProductId,
    string ProductSku,
    string ProductName,
    string MovementType,
    decimal Quantity,
    decimal PreviousQuantity,
    decimal NewQuantity,
    string Reason,
    string ReferenceNumber,
    string? UserUsername,
    DateTime CreatedAtUtc
);

public record RegisterMovementDto(
    Guid ProductId,
    string MovementType, // Entry, Exit, Adjustment
    decimal Quantity,
    string Reason,
    string ReferenceNumber
);
