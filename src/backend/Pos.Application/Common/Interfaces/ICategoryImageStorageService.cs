using Pos.Application.Catalog.DTOs;

namespace Pos.Application.Common.Interfaces;

public interface ICategoryImageStorageService
{
    Task<ProductImageResultDto> SaveCategoryImageAsync(
        Guid categoryId,
        Stream imageStream,
        string originalFileName,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteCategoryImageAsync(
        Guid categoryId,
        CancellationToken cancellationToken = default);
}
