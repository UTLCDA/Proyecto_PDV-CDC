using Pos.Application.Catalog.DTOs;

namespace Pos.Application.Catalog.Services;

public interface ICatalogImageStorageService
{
    Task<CatalogProductImageStatusDto> GetProductImageStatusAsync(string sku, CancellationToken cancellationToken = default);

    Task<CatalogImageUploadResultDto> SaveCatalogThumbnailAsync(
        string sku,
        int slot,
        Stream imageStream,
        string originalFileName,
        CancellationToken cancellationToken = default);

    Task<CatalogProductPagedResultDto> GetCatalogProductsSummaryAsync(
        string? search,
        int page = 1,
        int pageSize = 100,
        CancellationToken cancellationToken = default);

    string SanitizeSku(string sku);
}
