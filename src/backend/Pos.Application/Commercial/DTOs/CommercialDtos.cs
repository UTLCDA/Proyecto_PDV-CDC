namespace Pos.Application.Commercial.DTOs;

public record CreateQuoteItemDto(
    Guid ProductId,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountAmount
);

public record CreateQuoteDto(
    Guid? CustomerId,
    decimal DiscountAmount,
    string Notes,
    List<CreateQuoteItemDto> Items
);

public record QuoteItemDto(
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

public record QuoteDto(
    Guid Id,
    string QuoteNumber,
    Guid? CustomerId,
    string? CustomerDisplayName,
    Guid? UserId,
    string? UserUsername,
    decimal SubTotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    DateTime ExpirationDateUtc,
    string Status,
    string Notes,
    DateTime CreatedAtUtc,
    List<QuoteItemDto> Items
);

public record CreateInstallmentDto(
    Guid SaleId,
    decimal AmountPaid,
    string PaymentMethod,
    string Notes
);

public record PaymentInstallmentDto(
    Guid Id,
    Guid SaleId,
    string SaleFolioNumber,
    string ReceiptNumber,
    decimal AmountPaid,
    decimal PreviousPendingBalance,
    decimal NewPendingBalance,
    string PaymentMethod,
    string? UserUsername,
    string Notes,
    DateTime CreatedAtUtc
);

public record CreateReturnItemDto(
    Guid ProductId,
    decimal Quantity,
    decimal RefundUnitPrice
);

public record CreateReturnDto(
    Guid SaleId,
    string Reason,
    List<CreateReturnItemDto> Items
);

public record ReturnHeaderDto(
    Guid Id,
    string ReturnNumber,
    Guid SaleId,
    string SaleFolioNumber,
    decimal TotalRefundAmount,
    string Reason,
    string Status,
    DateTime CreatedAtUtc
);

public record DocumentTemplateDto(
    Guid Id,
    string Title,
    string Category,
    string TemplateContentHtml
);
