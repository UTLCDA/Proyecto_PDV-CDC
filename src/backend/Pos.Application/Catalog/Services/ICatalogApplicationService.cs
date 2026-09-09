using Pos.Application.Catalog.DTOs;
using Pos.Application.Common.Models;

namespace Pos.Application.Catalog.Services;

public interface ICatalogApplicationService
{
    // Categories CRUD
    Task<PagedResult<CategoryDto>> GetCategoriesAsync(string? search = null, CancellationToken cancellationToken = default, int page = 1, int pageSize = 25, string? sortBy = null, string? sortDirection = null);
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<CategoryDto> UpdateCategoryAsync(Guid id, UpdateCategoryDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task DeleteCategoryAsync(Guid id, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);

    // Products & Full CRUD
    Task<PagedResult<ProductDto>> GetProductsAsync(string? search, Guid? categoryId, bool? isTopSellerOnly, CancellationToken cancellationToken = default, int page = 1, int pageSize = 25, string? sortBy = null, string? sortDirection = null);
    Task<ProductDto?> GetProductByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProductDto?> GetProductByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<ProductDto> CreateProductAsync(CreateProductDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<ProductDto> UpdateProductAsync(Guid id, UpdateProductDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<ProductDto> UpdateProductPriceAsync(Guid id, decimal newUnitPrice, decimal newWholesalePrice, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);

    // Customers CRUD
    Task<PagedResult<CustomerDto>> GetCustomersAsync(string? search, string? customerType, bool includeInactive, CancellationToken cancellationToken = default, int page = 1, int pageSize = 25, string? sortBy = null, string? sortDirection = null);
    Task<CustomerDto?> GetCustomerByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<CustomerDto> UpdateCustomerAsync(Guid id, UpdateCustomerDto request, bool canChangeStatus, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
}
