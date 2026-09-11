using Pos.Application.Catalog.DTOs;

namespace Pos.Application.Common.Interfaces;

public interface IProductImageStorageService
{
    Task<ProductImageResultDto> SaveProductImageAsync(
        Guid productId,
        Stream imageStream,
        string originalFileName,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteProductImageAsync(
        Guid productId,
        CancellationToken cancellationToken = default);

    Task<ProductImageResultDto?> MigrateBase64ImageAsync(
        Guid productId,
        string base64Data,
        CancellationToken cancellationToken = default);

    string? GetVariantUrl(string? rawImageUrl, ProductImageVariant variant);
}
