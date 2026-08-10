using Pos.Application.Catalog.DTOs;

namespace Pos.Application.Commercial.DTOs;

public record QuoteOptionsDto(
    List<ProductDto> Products,
    List<CustomerDto> Customers
);

public record CreateQuoteItemDto(
    Guid ProductId,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountAmount
);

public record CreateQuoteDto(
    Guid? CustomerId,
    decimal DiscountAmount,
    int ValidityDays,
    string Notes,
    List<CreateQuoteItemDto> Items
);

public record ConvertQuoteToSaleDto(
    string PaymentType,
    decimal AdvanceAmount,
    decimal CashAmount,
    decimal CardAmount,
    decimal TransferAmount
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
    List<QuoteItemDto> Items,
    decimal AdvanceAmount = 0m,
    decimal PendingBalance = 0m
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
    DateTime CreatedAtUtc,
    bool IsInitialPayment = false
);

public record PaymentTransactionDto(
    string Id,
    Guid SaleId,
    string SaleFolioNumber,
    string? CustomerDisplayName,
    string TransactionType,
    string ReferenceNumber,
    string PaymentMethod,
    decimal Amount,
    string? UserUsername,
    DateTime CreatedAtUtc
);

public record CreateReturnItemDto(
    Guid ProductId,
    decimal Quantity
);

public record CreateReturnDto(
    Guid SaleId,
    string RefundMethod,
    string Reason,
    List<CreateReturnItemDto> Items
);

public record ReturnItemDto(
    Guid ProductId,
    string ProductSku,
    string ProductName,
    decimal Quantity,
    decimal RefundUnitPrice,
    decimal TotalRefundPrice
);

public record ReturnHeaderDto(
    Guid Id,
    string ReturnNumber,
    Guid SaleId,
    string SaleFolioNumber,
    decimal TotalRefundAmount,
    decimal AppliedToPendingBalance,
    decimal RefundedAmount,
    string RefundMethod,
    string Reason,
    string Status,
    DateTime CreatedAtUtc,
    List<ReturnItemDto> Items
);

public record DocumentTemplateDto(
    Guid Id,
    string Title,
    string Category,
    string TemplateContentHtml
);

public record SaveDocumentTemplateDto(
    string Title,
    string Category,
    string TemplateContent
);
