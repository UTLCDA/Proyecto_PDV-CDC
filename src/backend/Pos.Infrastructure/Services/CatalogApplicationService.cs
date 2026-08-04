using Microsoft.EntityFrameworkCore;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Catalog.Services;
using Pos.Application.Common.Interfaces;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class CatalogApplicationService : ICatalogApplicationService
{
    private readonly PosDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    public CatalogApplicationService(PosDbContext dbContext, IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    // Categories
    public async Task<List<CategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken = default)
    {
        var categories = await _dbContext.Categories
            .Include(c => c.SubCategorias)
            .Where(c => c.CategoriaPadreId == null)
            .ToListAsync(cancellationToken);

        return categories.Select(MapCategoryToDto).ToList();
    }

    public async Task<CategoryDto?> GetCategoryByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var category = await _dbContext.Categories
            .Include(c => c.SubCategorias)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        return category == null ? null : MapCategoryToDto(category);
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var slug = request.Name.Trim().ToLower().Replace(" ", "-");
        var category = new Categoria
        {
            Nombre = request.Name.Trim(),
            Slug = slug,
            Descripcion = request.Description,
            CategoriaPadreId = request.ParentCategoryId,
            EstaActivo = true,
            FechaCreacionUtc = DateTime.UtcNow
        };

        _dbContext.Categories.Add(category);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "CATEGORY_CREATED",
            "Categoria",
            category.Id.ToString(),
            null,
            $"Name={category.Nombre}",
            ipAddress,
            $"Nueva categoría creada: {category.Nombre}",
            cancellationToken);

        return MapCategoryToDto(category);
    }

    public async Task<CategoryDto> UpdateCategoryAsync(Guid id, UpdateCategoryDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var category = await _dbContext.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (category == null)
        {
            throw new KeyNotFoundException($"Categoría con ID '{id}' no encontrada.");
        }

        category.Nombre = request.Name.Trim();
        category.Slug = request.Name.Trim().ToLower().Replace(" ", "-");
        category.Descripcion = request.Description;
        category.CategoriaPadreId = request.ParentCategoryId;
        category.EstaActivo = request.IsActive;
        category.FechaActualizacionUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "CATEGORY_UPDATED",
            "Categoria",
            category.Id.ToString(),
            null,
            $"Name={category.Nombre}",
            ipAddress,
            $"Categoría actualizada: {category.Nombre}",
            cancellationToken);

        return MapCategoryToDto(category);
    }

    // Products & Full CRUD
    public async Task<List<ProductDto>> GetProductsAsync(string? search, Guid? categoryId, bool? isTopSellerOnly, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Products
            .Include(p => p.Categoria)
            .Include(p => p.Imagenes)
            .AsQueryable();

        if (categoryId.HasValue)
        {
            query = query.Where(p => p.CategoriaId == categoryId.Value);
        }

        if (isTopSellerOnly == true)
        {
            query = query.Where(p => p.VisibleMasVendido);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p => p.Nombre.ToLower().Contains(term) ||
                                     p.Sku.ToLower().Contains(term) ||
                                     p.Barcode.Contains(term));
        }

        var products = await query.ToListAsync(cancellationToken);
        return products.Select(MapProductToDto).ToList();
    }

    public async Task<ProductDto?> GetProductByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var product = await _dbContext.Products
            .Include(p => p.Categoria)
            .Include(p => p.Imagenes)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        return product == null ? null : MapProductToDto(product);
    }

    public async Task<ProductDto?> GetProductByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        var term = code.Trim().ToLower();
        var product = await _dbContext.Products
            .Include(p => p.Categoria)
            .Include(p => p.Imagenes)
            .FirstOrDefaultAsync(p => p.Barcode.ToLower() == term || p.Sku.ToLower() == term, cancellationToken);

        return product == null ? null : MapProductToDto(product);
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var existingProduct = await _dbContext.Products.FirstOrDefaultAsync(p => p.Sku.ToLower() == request.Sku.Trim().ToLower(), cancellationToken);
        if (existingProduct != null)
        {
            throw new InvalidOperationException($"Ya existe un producto con el SKU '{request.Sku}'.");
        }

        var piezasCaja = request.PiecesPerBox > 0 ? request.PiecesPerBox : 1;
        var coberturaCaja = Math.Round(piezasCaja * request.CoveragePerUnitSqM, 4);

        var product = new Producto
        {
            Sku = request.Sku.Trim(),
            Barcode = request.Barcode.Trim(),
            Nombre = request.Name.Trim(),
            Descripcion = request.Description,
            CategoriaId = request.CategoryId,
            PrecioUnitario = request.UnitPrice,
            PrecioMayoreo = request.WholesalePrice,
            CantidadMinimaMayoreo = request.WholesaleMinQuantity,
            UnidadMedida = request.UnitOfMeasure,
            CoberturaPorUnidadM2 = request.CoveragePerUnitSqM,
            ImagenUrl = request.ImageUrl ?? string.Empty,
            PiezasPorCaja = piezasCaja,
            CoberturaM2Caja = coberturaCaja,
            LargoCm = request.LengthCm,
            AltoCm = request.HeightCm,
            AnchoCm = request.WidthCm,
            CantidadInventarioInicial = request.InitialInventoryQuantity,
            AnchoMm = request.WidthMm,
            LargoMm = request.LengthMm,
            EspesorMm = request.ThicknessMm,
            Material = request.Material,
            SoloCotizacion = request.IsQuoteOnly,
            VisibleMasVendido = request.IsTopSellerVisible,
            EstaActivo = true,
            FechaCreacionUtc = DateTime.UtcNow
        };

        _dbContext.Products.Add(product);

        // Auto-create Stock record for new product with CantidadInventarioInicial
        var stock = new Existencia
        {
            ProductoId = product.Id,
            CantidadDisponible = request.InitialInventoryQuantity,
            UmbralMinimoAlerta = 10m,
            CantidadReorden = 50m,
            Ubicacion = "Almacén Principal"
        };
        _dbContext.Stocks.Add(stock);

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "PRODUCT_CREATED",
            "Producto",
            product.Id.ToString(),
            null,
            $"Sku={product.Sku}, Name={product.Nombre}, Price={product.PrecioUnitario}",
            ipAddress,
            $"Nuevo producto registrado: {product.Nombre}",
            cancellationToken);

        return (await GetProductByIdAsync(product.Id, cancellationToken))!;
    }

    public async Task<ProductDto> UpdateProductAsync(Guid id, UpdateProductDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var product = await _dbContext.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product == null)
        {
            throw new KeyNotFoundException($"Producto con ID '{id}' no encontrado.");
        }

        var oldValues = $"Name={product.Nombre}, Price={product.PrecioUnitario}, Active={product.EstaActivo}";

        var piezasCaja = request.PiecesPerBox > 0 ? request.PiecesPerBox : 1;
        var coberturaCaja = Math.Round(piezasCaja * request.CoveragePerUnitSqM, 4);

        product.Nombre = request.Name.Trim();
        product.Descripcion = request.Description;
        product.CategoriaId = request.CategoryId;
        product.PrecioUnitario = request.UnitPrice;
        product.PrecioMayoreo = request.WholesalePrice;
        product.CantidadMinimaMayoreo = request.WholesaleMinQuantity;
        product.UnidadMedida = request.UnitOfMeasure;
        product.CoberturaPorUnidadM2 = request.CoveragePerUnitSqM;
        if (!string.IsNullOrWhiteSpace(request.ImageUrl))
        {
            product.ImagenUrl = request.ImageUrl;
        }
        product.PiezasPorCaja = piezasCaja;
        product.CoberturaM2Caja = coberturaCaja;
        product.LargoCm = request.LengthCm;
        product.AltoCm = request.HeightCm;
        product.AnchoCm = request.WidthCm;
        product.AnchoMm = request.WidthMm;
        product.LargoMm = request.LengthMm;
        product.EspesorMm = request.ThicknessMm;
        product.Material = request.Material;
        product.SoloCotizacion = request.IsQuoteOnly;
        product.VisibleMasVendido = request.IsTopSellerVisible;
        product.EstaActivo = request.IsActive;
        product.FechaActualizacionUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "PRODUCT_UPDATED",
            "Producto",
            product.Id.ToString(),
            oldValues,
            $"Name={product.Nombre}, Price={product.PrecioUnitario}, Active={product.EstaActivo}",
            ipAddress,
            $"Producto actualizado: {product.Nombre}",
            cancellationToken);

        return (await GetProductByIdAsync(product.Id, cancellationToken))!;
    }

    public async Task<ProductDto> UpdateProductPriceAsync(Guid id, decimal newUnitPrice, decimal newWholesalePrice, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var product = await _dbContext.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product == null)
        {
            throw new KeyNotFoundException($"Producto con ID '{id}' no encontrado.");
        }

        var oldValues = $"UnitPrice={product.PrecioUnitario}, WholesalePrice={product.PrecioMayoreo}";

        product.PrecioUnitario = newUnitPrice;
        product.PrecioMayoreo = newWholesalePrice;
        product.FechaActualizacionUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "PRODUCT_PRICE_UPDATED",
            "Producto",
            product.Id.ToString(),
            oldValues,
            $"UnitPrice={product.PrecioUnitario}, WholesalePrice={product.PrecioMayoreo}",
            ipAddress,
            $"Precio de producto actualizado: {product.Nombre}",
            cancellationToken);

        return (await GetProductByIdAsync(product.Id, cancellationToken))!;
    }

    // Customers CRUD
    public async Task<List<CustomerDto>> GetCustomersAsync(string? search, string? type, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Customers.Where(c => c.EstaActivo);

        if (!string.IsNullOrWhiteSpace(type))
        {
            query = query.Where(c => c.TipoCliente.ToLower() == type.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c => c.Nombre.ToLower().Contains(term) ||
                                     c.Apellido.ToLower().Contains(term) ||
                                     (c.NombreEmpresa != null && c.NombreEmpresa.ToLower().Contains(term)) ||
                                     (c.Rfc != null && c.Rfc.ToLower().Contains(term)));
        }

        var customers = await query.ToListAsync(cancellationToken);
        return customers.Select(MapCustomerToDto).ToList();
    }

    public async Task<CustomerDto?> GetCustomerByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var customer = await _dbContext.Customers.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        return customer == null ? null : MapCustomerToDto(customer);
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var customer = new Cliente
        {
            Nombre = request.FirstName.Trim(),
            Apellido = request.LastName.Trim(),
            NombreEmpresa = request.CompanyName,
            Rfc = request.TaxId,
            Email = request.Email.Trim(),
            Telefono = request.Phone.Trim(),
            Direccion = request.Address,
            Ciudad = request.City,
            Estado = request.State,
            CodigoPostal = request.PostalCode,
            TipoCliente = request.CustomerType,
            PorcentajeDescuentoEspecial = request.SpecialDiscountPercentage,
            Notas = request.Notes,
            EstaActivo = true,
            FechaCreacionUtc = DateTime.UtcNow
        };

        _dbContext.Customers.Add(customer);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "CUSTOMER_CREATED",
            "Cliente",
            customer.Id.ToString(),
            null,
            $"Name={customer.NombreMostrar}, Type={customer.TipoCliente}",
            ipAddress,
            $"Nuevo cliente registrado: {customer.NombreMostrar}",
            cancellationToken);

        return MapCustomerToDto(customer);
    }

    public async Task<CustomerDto> UpdateCustomerAsync(Guid id, UpdateCustomerDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var customer = await _dbContext.Customers.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (customer == null)
        {
            throw new KeyNotFoundException($"Cliente con ID '{id}' no encontrado.");
        }

        var oldValues = $"Name={customer.NombreMostrar}, Active={customer.EstaActivo}";

        customer.Nombre = request.FirstName.Trim();
        customer.Apellido = request.LastName.Trim();
        customer.NombreEmpresa = request.CompanyName;
        customer.Rfc = request.TaxId;
        customer.Email = request.Email.Trim();
        customer.Telefono = request.Phone.Trim();
        customer.Direccion = request.Address;
        customer.Ciudad = request.City;
        customer.Estado = request.State;
        customer.CodigoPostal = request.PostalCode;
        customer.TipoCliente = request.CustomerType;
        customer.PorcentajeDescuentoEspecial = request.SpecialDiscountPercentage;
        customer.Notas = request.Notes;
        customer.EstaActivo = request.IsActive;
        customer.FechaActualizacionUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "CUSTOMER_UPDATED",
            "Cliente",
            customer.Id.ToString(),
            oldValues,
            $"Name={customer.NombreMostrar}, Active={customer.EstaActivo}",
            ipAddress,
            $"Cliente actualizado: {customer.NombreMostrar}",
            cancellationToken);

        return MapCustomerToDto(customer);
    }

    private static CategoryDto MapCategoryToDto(Categoria c)
    {
        return new CategoryDto(
            c.Id,
            c.Nombre,
            c.Slug,
            c.Descripcion,
            c.CategoriaPadreId,
            c.SubCategorias.Select(MapCategoryToDto).ToList()
        );
    }

    private static ProductDto MapProductToDto(Producto p)
    {
        return new ProductDto(
            p.Id,
            p.Sku,
            p.Barcode,
            p.Nombre,
            p.Descripcion,
            p.CategoriaId,
            p.Categoria?.Nombre ?? string.Empty,
            p.PrecioUnitario,
            p.PrecioMayoreo,
            p.CantidadMinimaMayoreo,
            p.UnidadMedida,
            p.CoberturaPorUnidadM2,
            p.ImagenUrl,
            p.PiezasPorCaja,
            p.CoberturaM2Caja,
            p.LargoCm,
            p.AltoCm,
            p.AnchoCm,
            p.CantidadInventarioInicial,
            p.AnchoMm,
            p.LargoMm,
            p.EspesorMm,
            p.Material,
            p.SoloCotizacion,
            p.VisibleMasVendido,
            p.EstaActivo,
            p.Imagenes.Select(img => img.UrlImagen).ToList()
        );
    }

    private static CustomerDto MapCustomerToDto(Cliente c)
    {
        return new CustomerDto(
            c.Id,
            c.Nombre,
            c.Apellido,
            c.NombreEmpresa,
            c.NombreMostrar,
            c.Rfc,
            c.Email,
            c.Telefono,
            c.Direccion,
            c.Ciudad,
            c.Estado,
            c.CodigoPostal,
            c.TipoCliente,
            c.PorcentajeDescuentoEspecial,
            c.Notas
        );
    }
}
