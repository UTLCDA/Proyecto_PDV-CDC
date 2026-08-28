namespace Pos.Application.Catalog.DTOs;

public record CategoryDto(
    Guid Id,
    string Name,
    string Slug,
    string Description,
    Guid? ParentCategoryId,
    List<CategoryDto> SubCategories
);

public record CreateCategoryDto(
    string Name,
    string Description,
    Guid? ParentCategoryId
);

public record UpdateCategoryDto(
    string Name,
    string Description,
    Guid? ParentCategoryId,
    bool IsActive
);

public record ProductDto(
    Guid Id,
    string Sku,
    string Barcode,
    string Name,
    string Description,
    Guid CategoryId,
    string CategoryName,
    decimal UnitPrice,
    decimal UnitCost,
    decimal WholesalePrice,
    decimal WholesaleMinQuantity,
    string UnitOfMeasure,
    decimal CoveragePerUnitSqM,
    string ImageUrl,
    int PiecesPerBox,
    decimal BoxCoverageSqM,
    decimal LengthCm,
    decimal HeightCm,
    decimal WidthCm,
    decimal InitialInventoryQuantity,
    int WidthMm,
    int LengthMm,
    int ThicknessMm,
    string Material,
    bool IsQuoteOnly,
    bool IsTopSellerVisible,
    bool IsActive,
    List<string> ImageUrls,
    decimal AvailableQuantity
);

public record CreateProductDto(
    string Sku,
    string Barcode,
    string Name,
    string Description,
    Guid CategoryId,
    decimal UnitPrice,
    decimal UnitCost,
    decimal WholesalePrice,
    decimal WholesaleMinQuantity,
    string UnitOfMeasure,
    decimal CoveragePerUnitSqM,
    string? ImageUrl,
    int PiecesPerBox,
    decimal LengthCm,
    decimal HeightCm,
    decimal WidthCm,
    decimal InitialInventoryQuantity,
    int WidthMm,
    int LengthMm,
    int ThicknessMm,
    string Material,
    bool IsQuoteOnly,
    bool IsTopSellerVisible
);

public record UpdateProductDto(
    string Name,
    string Description,
    Guid CategoryId,
    decimal UnitPrice,
    decimal UnitCost,
    decimal WholesalePrice,
    decimal WholesaleMinQuantity,
    string UnitOfMeasure,
    decimal CoveragePerUnitSqM,
    string? ImageUrl,
    int PiecesPerBox,
    decimal LengthCm,
    decimal HeightCm,
    decimal WidthCm,
    int WidthMm,
    int LengthMm,
    int ThicknessMm,
    string Material,
    bool IsQuoteOnly,
    bool IsTopSellerVisible,
    bool IsActive
);

public record CustomerDto(
    Guid Id,
    string FirstName,
    string LastName,
    string? CompanyName,
    string DisplayName,
    string? TaxId,
    string Email,
    string Phone,
    string Address,
    string City,
    string State,
    string PostalCode,
    string CustomerType,
    decimal SpecialDiscountPercentage,
    decimal DailyBoxLimit,
    string Notes,
    bool IsActive
);

public record CreateCustomerDto(
    string FirstName,
    string LastName,
    string? CompanyName,
    string? TaxId,
    string Email,
    string Phone,
    string Address,
    string City,
    string State,
    string PostalCode,
    string CustomerType, // Particular, Mayorista
    decimal SpecialDiscountPercentage,
    decimal DailyBoxLimit,
    string Notes
);

public record UpdateCustomerDto(
    string FirstName,
    string LastName,
    string? CompanyName,
    string? TaxId,
    string Email,
    string Phone,
    string Address,
    string City,
    string State,
    string PostalCode,
    string CustomerType,
    decimal SpecialDiscountPercentage,
    decimal DailyBoxLimit,
    string Notes,
    bool IsActive
);
