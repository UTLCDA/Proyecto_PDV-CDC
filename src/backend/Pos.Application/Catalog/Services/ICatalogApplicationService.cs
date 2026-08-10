using Pos.Application.Catalog.DTOs;

namespace Pos.Application.Catalog.Services;

public interface ICatalogApplicationService
{
    // Categories CRUD
    Task<List<CategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken = default);
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<CategoryDto> UpdateCategoryAsync(Guid id, UpdateCategoryDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);

    // Products & Full CRUD
    Task<List<ProductDto>> GetProductsAsync(string? search, Guid? categoryId, bool? isTopSellerOnly, CancellationToken cancellationToken = default);
    Task<ProductDto?> GetProductByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProductDto?> GetProductByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<ProductDto> CreateProductAsync(CreateProductDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<ProductDto> UpdateProductAsync(Guid id, UpdateProductDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<ProductDto> UpdateProductPriceAsync(Guid id, decimal newUnitPrice, decimal newWholesalePrice, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);

    // Customers CRUD
    Task<List<CustomerDto>> GetCustomersAsync(string? search, string? customerType, bool includeInactive, CancellationToken cancellationToken = default);
    Task<CustomerDto?> GetCustomerByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<CustomerDto> UpdateCustomerAsync(Guid id, UpdateCustomerDto request, bool canChangeStatus, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
}
