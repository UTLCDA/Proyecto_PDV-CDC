namespace Pos.Application.Catalog.DTOs;

public record CatalogImageInfo(
    int Slot,
    string FileName,
    string? Url,
    bool Exists,
    long? FileSizeBytes,
    DateTime? LastModifiedUtc
);

public record CatalogProductImageStatusDto(
    Guid ProductId,
    string Sku,
    string Name,
    CatalogImageInfo Miniatura2,
    CatalogImageInfo Miniatura3
);

public record CatalogImageUploadResultDto(
    string Sku,
    int Slot,
    string FileName,
    string Url,
    long FileSizeBytes,
    string Version,
    string Message
);

public record CatalogProductSummaryDto(
    Guid Id,
    string Sku,
    string Name,
    string? CategoryName,
    bool HasMiniatura2,
    bool HasMiniatura3,
    string? Miniatura2Url,
    string? Miniatura3Url
);

public record CatalogProductPagedResultDto(
    List<CatalogProductSummaryDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);
