namespace Pos.Application.Sales.DTOs;

public record CreateSaleItemDto(
    Guid ProductId,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountAmount
);

public record CreateSaleDto(
    Guid? CustomerId,
    string PaymentType, // FullPayment, AdvanceDeposit, MixedPayment
    decimal DiscountAmount,
    decimal AdvanceAmount,
    decimal CashAmount,
    decimal CardAmount,
    decimal TransferAmount,
    string Notes,
    List<CreateSaleItemDto> Items
);

public record SaleItemDto(
    Guid Id,
    Guid ProductId,
    string ProductSku,
    string ProductName,
    string UnitOfMeasure,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountAmount,
    decimal TotalPrice
);

public record SaleDto(
    Guid Id,
    string FolioNumber,
    Guid? CustomerId,
    string? CustomerDisplayName,
    Guid? UserId,
    string? UserUsername,
    string PaymentType,
    decimal SubTotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal CashAmount,
    decimal CardAmount,
    decimal TransferAmount,
    decimal AdvanceAmount,
    decimal PendingBalance,
    string Status,
    string Notes,
    DateTime CreatedAtUtc,
    List<SaleItemDto> Items
);
