namespace Pos.Application.Reporting.DTOs;

public record SalesSummaryReportDto(
    int TotalSalesCount,
    decimal TotalSalesAmount,
    decimal TotalReturnedAmount,
    decimal NetSalesAmount,
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
    decimal TotalQuantityReturned,
    decimal NetQuantitySold,
    decimal TotalRevenue,
    decimal TotalReturnedAmount,
    decimal NetRevenue
);

public record InventorySummaryReportDto(
    int TotalProducts,
    decimal TotalUnitsOnHand,
    int LowStockProducts,
    int OutOfStockProducts,
    decimal InventoryRetailValue,
    decimal SuggestedReorderUnits,
    List<LowStockProductReportDto> LowStockProductList
);

public record LowStockProductReportDto(
    Guid ProductId,
    string Sku,
    string ProductName,
    decimal QuantityOnHand,
    decimal MinimumAlertThreshold,
    decimal SuggestedReorderQuantity,
    string UnitOfMeasure,
    bool IsOutOfStock
);

public record AuditLogDto(
    Guid Id,
    int? IdVenta,
    string CorrelationId,
    string? UserUsername,
    string Action,
    string EntityName,
    string? EntityId,
    string? OldValues,
    string? NewValues,
    string IpAddress,
    string Notes,
    DateTime CreatedAtUtc,
    string? Module = null,
    string? EventType = null,
    string? ResultStatus = null
);
