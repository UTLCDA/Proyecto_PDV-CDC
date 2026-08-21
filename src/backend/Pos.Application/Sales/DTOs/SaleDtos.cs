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
    List<CreateSaleItemDto> Items,
    bool RequiresInvoice = true
);

public record SaleItemDto(
    Guid Id,
    int? IdVenta,
    Guid ProductId,
    string ProductSku,
    string ProductName,
    string UnitOfMeasure,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountAmount,
    decimal TotalPrice
);

public record SalePaymentDto(
    string Id,
    string ReferenceNumber,
    decimal Amount,
    string PaymentMethod,
    string? UserUsername,
    bool IsInitialPayment,
    DateTime CreatedAtUtc
);

public record SalesSummaryDto(
    int SalesCount,
    decimal TotalAmount,
    decimal TotalPaid,
    decimal PendingBalance,
    decimal CashAmount,
    decimal CardAmount,
    decimal TransferAmount
);

public record SaleDto(
    Guid Id,
    int IdVenta,
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
    List<SaleItemDto> Items,
    List<SalePaymentDto> Payments
);
