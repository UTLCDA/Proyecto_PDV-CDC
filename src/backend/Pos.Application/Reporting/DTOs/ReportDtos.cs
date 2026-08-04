namespace Pos.Application.Reporting.DTOs;

public record SalesSummaryReportDto(
    int TotalSalesCount,
    decimal TotalSalesAmount,
    decimal TotalTaxAmount,
    decimal TotalDiscountAmount,
    decimal AverageTicketAmount,
    decimal TotalCashIncome,
    decimal TotalCardIncome,
    decimal TotalTransferIncome
);

public record TopProductReportDto(
    Guid ProductId,
    string Sku,
    string ProductName,
    string CategoryName,
    decimal TotalQuantitySold,
    decimal TotalRevenue
);

public record AuditLogDto(
    Guid Id,
    string CorrelationId,
    string? UserUsername,
    string Action,
    string EntityName,
    string? EntityId,
    string? OldValues,
    string? NewValues,
    string IpAddress,
    string Notes,
    DateTime CreatedAtUtc
);
