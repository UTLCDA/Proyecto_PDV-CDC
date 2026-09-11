using System.Net.Mail;
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Catalog.Services;
using Pos.Application.Common.Interfaces;
using Pos.Application.Common.Models;
using Pos.Application.Inventory.DTOs;
using Pos.Domain.Common;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class CatalogApplicationService : ICatalogApplicationService
{
    private readonly PosDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;
    private readonly IProductImageStorageService _imageStorageService;

    public CatalogApplicationService(
        PosDbContext dbContext,
        IAuditLogService auditLogService,
        IProductImageStorageService? imageStorageService = null)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
        _imageStorageService = imageStorageService ?? new NoOpProductImageStorageService();
    }

    // Categories
    public async Task<PagedResult<CategoryDto>> GetCategoriesAsync(
        string? search = null,
        CancellationToken cancellationToken = default,
        int page = 1,
        int pageSize = 25,
        string? sortBy = null,
        string? sortDirection = null)
    {
        var baseQuery = _dbContext.Categories.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            baseQuery = baseQuery.Where(c => c.Nombre.ToLower().Contains(term) ||
                                             c.Slug.ToLower().Contains(term) ||
                                             (c.Descripcion != null && c.Descripcion.ToLower().Contains(term)));
        }

        var totalItems = await baseQuery.CountAsync(cancellationToken);
        if (totalItems == 0)
        {
            return new PagedResult<CategoryDto>([], 0, page, pageSize);
        }

        bool isDesc = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var sortedQuery = (sortBy?.ToLowerInvariant()) switch
        {
            "name" or "nombre" => isDesc ? baseQuery.OrderByDescending(c => c.Nombre) : baseQuery.OrderBy(c => c.Nombre),
            "slug" => isDesc ? baseQuery.OrderByDescending(c => c.Slug) : baseQuery.OrderBy(c => c.Slug),
            "description" or "descripcion" => isDesc ? baseQuery.OrderByDescending(c => c.Descripcion) : baseQuery.OrderBy(c => c.Descripcion),
            "isactive" or "activo" => isDesc ? baseQuery.OrderByDescending(c => c.EstaActivo) : baseQuery.OrderBy(c => c.EstaActivo),
            _ => baseQuery.OrderBy(c => c.Nombre)
        };

        var (skip, take) = QueryPaging.Normalize(page, pageSize, QueryPaging.DefaultStandardPageSize, QueryPaging.ExportMaxPageSize);
        var pagedCategoryIds = await sortedQuery
            .Skip(skip)
            .Take(take)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        if (pagedCategoryIds.Count == 0)
        {
            return new PagedResult<CategoryDto>([], totalItems, page, take);
        }

        var categories = await _dbContext.Categories
            .AsNoTracking()
            .Where(c => pagedCategoryIds.Contains(c.Id))
            .Include(c => c.SubCategorias)
            .AsSplitQuery()
            .ToListAsync(cancellationToken);

        var categoriesById = categories.ToDictionary(c => c.Id);
        var orderedCategories = pagedCategoryIds
            .Where(id => categoriesById.ContainsKey(id))
            .Select(id => categoriesById[id])
            .ToList();

        var dtos = orderedCategories.Select(MapCategoryToDto).ToList();
        return new PagedResult<CategoryDto>(dtos, totalItems, page, take);
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
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var name = NormalizeText(request.Name, "El nombre de la categoría", 120, required: true);
        var description = NormalizeText(request.Description, "La descripción de la categoría", 500, required: false);
        var slug = CreateSlug(name);
        await EnsureUniqueCategorySlugAsync(slug, null, cancellationToken);
        await EnsureValidCategoryParentAsync(null, request.ParentCategoryId, cancellationToken);
        var category = new Categoria
        {
            Nombre = name,
            Slug = slug,
            Descripcion = description,
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
            module: "Productos",
            eventType: "CATEGORY_CREATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return MapCategoryToDto(category);
    }

    public async Task<CategoryDto> UpdateCategoryAsync(Guid id, UpdateCategoryDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var category = await _dbContext.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (category == null)
        {
            throw new KeyNotFoundException($"Categoría con ID '{id}' no encontrada.");
        }

        var name = NormalizeText(request.Name, "El nombre de la categoría", 120, required: true);
        var slug = CreateSlug(name);
        await EnsureUniqueCategorySlugAsync(slug, id, cancellationToken);
        await EnsureValidCategoryParentAsync(id, request.ParentCategoryId, cancellationToken);
        var oldValues = JsonSerializer.Serialize(new { category.Nombre, category.Slug, category.Descripcion, category.CategoriaPadreId, category.EstaActivo });

        category.Nombre = name;
        category.Slug = slug;
        category.Descripcion = NormalizeText(request.Description, "La descripción de la categoría", 500, required: false);
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
            oldValues,
            JsonSerializer.Serialize(new { category.Nombre, category.Slug, category.Descripcion, category.CategoriaPadreId, category.EstaActivo }),
            ipAddress,
            $"Categoría actualizada: {category.Nombre}",
            module: "Productos",
            eventType: "CATEGORY_UPDATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return MapCategoryToDto(category);
    }

    public async Task DeleteCategoryAsync(Guid id, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var category = await _dbContext.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (category == null)
        {
            throw new KeyNotFoundException($"Categoría con ID '{id}' no encontrada.");
        }

        var oldValues = JsonSerializer.Serialize(new { category.Nombre, category.EstaActivo });
        category.EstaActivo = !category.EstaActivo;
        category.FechaActualizacionUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "CATEGORY_STATUS_TOGGLED",
            "Categoria",
            category.Id.ToString(),
            oldValues,
            JsonSerializer.Serialize(new { category.Nombre, category.EstaActivo }),
            ipAddress,
            $"Estado de categoría modificado: {category.Nombre} (Activo={category.EstaActivo})",
            module: "Productos",
            eventType: "CATEGORY_UPDATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);
    }

    // Products & Full CRUD
    public async Task<PagedResult<ProductDto>> GetProductsAsync(
        string? search,
        Guid? categoryId,
        bool? isTopSellerOnly,
        CancellationToken cancellationToken = default,
        int page = 1,
        int pageSize = 25,
        string? sortBy = null,
        string? sortDirection = null,
        bool includeInactive = false)
    {
        var baseQuery = _dbContext.Products.AsNoTracking();

        if (!includeInactive)
        {
            baseQuery = baseQuery.Where(p => p.EstaActivo);
        }

        if (categoryId.HasValue)
        {
            baseQuery = baseQuery.Where(p => p.CategoriaId == categoryId.Value);
        }

        if (isTopSellerOnly == true)
        {
            baseQuery = baseQuery.Where(p => p.VisibleMasVendido);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            var hasNumericId = int.TryParse(term, out var searchId) && searchId > 0;
            baseQuery = baseQuery.Where(p => (hasNumericId && p.IdProducto == searchId) ||
                                             p.Nombre.ToLower().Contains(term) ||
                                             p.Sku.ToLower().Contains(term) ||
                                             p.Barcode.Contains(term));
        }

        var totalItems = await baseQuery.CountAsync(cancellationToken);
        if (totalItems == 0)
        {
            return new PagedResult<ProductDto>([], 0, page, pageSize);
        }

        bool isDesc = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var sortedQuery = (sortBy?.ToLowerInvariant()) switch
        {
            "idproducto" or "id" => isDesc ? baseQuery.OrderByDescending(p => p.IdProducto) : baseQuery.OrderBy(p => p.IdProducto),
            "sku" => isDesc ? baseQuery.OrderByDescending(p => p.Sku) : baseQuery.OrderBy(p => p.Sku),
            "name" or "nombre" => isDesc ? baseQuery.OrderByDescending(p => p.Nombre) : baseQuery.OrderBy(p => p.Nombre),
            "categoryname" or "categoria" => isDesc ? baseQuery.OrderByDescending(p => p.Categoria.Nombre) : baseQuery.OrderBy(p => p.Categoria.Nombre),
            "unitprice" or "preciounitario" => isDesc ? baseQuery.OrderByDescending(p => p.PrecioUnitario) : baseQuery.OrderBy(p => p.PrecioUnitario),
            "wholesaleprice" or "preciomayoreo" => isDesc ? baseQuery.OrderByDescending(p => p.PrecioMayoreo) : baseQuery.OrderBy(p => p.PrecioMayoreo),
            "piecesperbox" or "piezasporcaja" => isDesc ? baseQuery.OrderByDescending(p => p.PiezasPorCaja) : baseQuery.OrderBy(p => p.PiezasPorCaja),
            "coverageperunitsqm" or "cobertura" => isDesc ? baseQuery.OrderByDescending(p => p.CoberturaPorUnidadM2) : baseQuery.OrderBy(p => p.CoberturaPorUnidadM2),
            "stock" or "inventario" or "existencias" or "availablequantity" => isDesc
                ? baseQuery.OrderByDescending(p => _dbContext.Stocks.Where(s => s.ProductoId == p.Id).Select(s => s.CantidadDisponible).FirstOrDefault())
                : baseQuery.OrderBy(p => _dbContext.Stocks.Where(s => s.ProductoId == p.Id).Select(s => s.CantidadDisponible).FirstOrDefault()),
            "isactive" or "activo" => isDesc ? baseQuery.OrderByDescending(p => p.EstaActivo) : baseQuery.OrderBy(p => p.EstaActivo),
            _ => baseQuery.OrderBy(p => p.Nombre)
        };

        var (skip, take) = QueryPaging.Normalize(page, pageSize, QueryPaging.DefaultStandardPageSize, QueryPaging.ExportMaxPageSize);
        var pagedProductIds = await sortedQuery
            .Skip(skip)
            .Take(take)
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);

        if (pagedProductIds.Count == 0)
        {
            return new PagedResult<ProductDto>([], totalItems, page, take);
        }

        var products = await _dbContext.Products
            .AsNoTracking()
            .Where(p => pagedProductIds.Contains(p.Id))
            .Include(p => p.Categoria)
            .ToListAsync(cancellationToken);

        var productsById = products.ToDictionary(p => p.Id);
        var orderedProducts = pagedProductIds
            .Where(id => productsById.ContainsKey(id))
            .Select(id => productsById[id])
            .ToList();

        var stockByProduct = await _dbContext.Stocks
            .Where(stock => pagedProductIds.Contains(stock.ProductoId))
            .ToDictionaryAsync(stock => stock.ProductoId, stock => stock.CantidadDisponible, cancellationToken);

        var dtos = orderedProducts.Select(product => MapProductToDto(
            product,
            stockByProduct.GetValueOrDefault(product.Id))).ToList();

        return new PagedResult<ProductDto>(dtos, totalItems, page, take);
    }

    public async Task<ProductDto?> GetProductByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var product = await _dbContext.Products
            .Include(p => p.Categoria)
            .Include(p => p.Imagenes)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (product == null) return null;
        var availableQuantity = await _dbContext.Stocks
            .Where(stock => stock.ProductoId == product.Id)
            .Select(stock => (decimal?)stock.CantidadDisponible)
            .FirstOrDefaultAsync(cancellationToken) ?? 0m;
        return MapProductToDto(product, availableQuantity);
    }

    public async Task<ProductDto?> GetProductByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        var term = code.Trim().ToLower();
        var product = await _dbContext.Products
            .Include(p => p.Categoria)
            .Include(p => p.Imagenes)
            .FirstOrDefaultAsync(p => p.Barcode.ToLower() == term || p.Sku.ToLower() == term, cancellationToken);

        if (product == null) return null;
        var availableQuantity = await _dbContext.Stocks
            .Where(stock => stock.ProductoId == product.Id)
            .Select(stock => (decimal?)stock.CantidadDisponible)
            .FirstOrDefaultAsync(cancellationToken) ?? 0m;
        return MapProductToDto(product, availableQuantity);
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var sku = NormalizeSku(request.Sku);
        var barcode = NormalizeBarcode(request.Barcode);
        await EnsureUniqueProductCodesAsync(sku, barcode, null, cancellationToken);
        await ValidateProductDetailsAsync(
            request.Name, request.Description, request.CategoryId, request.UnitPrice, request.WholesalePrice,
            request.WholesaleMinQuantity, request.UnitOfMeasure, request.CoveragePerUnitSqM, request.ImageUrl,
            request.PiecesPerBox, request.LengthCm, request.HeightCm, request.WidthCm, request.InitialInventoryQuantity,
            request.WidthMm, request.LengthMm, request.ThicknessMm, request.Material, cancellationToken);

        var piezasCaja = request.PiecesPerBox;
        var coberturaCaja = Math.Round(piezasCaja * request.CoveragePerUnitSqM, 4);

        var product = new Producto
        {
            Sku = sku,
            Barcode = barcode,
            Nombre = request.Name.Trim(),
            Descripcion = request.Description.Trim(),
            CategoriaId = request.CategoryId,
            PrecioUnitario = request.UnitPrice,
            CostoUnitario = request.UnitCost,
            PrecioMayoreo = request.WholesalePrice,
            CantidadMinimaMayoreo = request.WholesaleMinQuantity,
            UnidadMedida = NormalizeUnitOfMeasure(request.UnitOfMeasure),
            CoberturaPorUnidadM2 = request.CoveragePerUnitSqM,
            ImagenUrl = NormalizeImageUrl(request.ImageUrl) ?? string.Empty,
            PiezasPorCaja = piezasCaja,
            CoberturaM2Caja = coberturaCaja,
            LargoCm = request.LengthCm,
            AltoCm = request.HeightCm,
            AnchoCm = request.WidthCm,
            CantidadInventarioInicial = request.InitialInventoryQuantity,
            AnchoMm = request.WidthMm,
            LargoMm = request.LengthMm,
            EspesorMm = request.ThicknessMm,
            Material = request.Material.Trim(),
            Color = request.Color?.Trim() ?? string.Empty,
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
            Ubicacion = InventoryDefaults.DefaultWarehouseLocation
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
            module: "Productos",
            eventType: "PRODUCT_CREATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return (await GetProductByIdAsync(product.Id, cancellationToken))!;
    }

    public async Task<ProductDto> UpdateProductAsync(Guid id, UpdateProductDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var product = await _dbContext.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product == null)
        {
            throw new KeyNotFoundException($"Producto con ID '{id}' no encontrado.");
        }

        await ValidateProductDetailsAsync(
            request.Name, request.Description, request.CategoryId, request.UnitPrice, request.WholesalePrice,
            request.WholesaleMinQuantity, request.UnitOfMeasure, request.CoveragePerUnitSqM, request.ImageUrl,
            request.PiecesPerBox, request.LengthCm, request.HeightCm, request.WidthCm, null,
            request.WidthMm, request.LengthMm, request.ThicknessMm, request.Material, cancellationToken);
        var sku = NormalizeSku(request.Sku);
        var barcode = NormalizeBarcode(request.Barcode);
        await EnsureUniqueProductCodesAsync(sku, barcode, id, cancellationToken);

        var oldValues = JsonSerializer.Serialize(new { product.Sku, product.Barcode, product.Nombre, product.CategoriaId, product.PrecioUnitario, product.PrecioMayoreo, product.UnidadMedida, product.EstaActivo });

        var piezasCaja = request.PiecesPerBox;
        var coberturaCaja = Math.Round(piezasCaja * request.CoveragePerUnitSqM, 4);

        product.Sku = sku;
        product.Barcode = barcode;
        product.Nombre = request.Name.Trim();
        product.Descripcion = request.Description.Trim();
        product.CategoriaId = request.CategoryId;
        product.PrecioUnitario = request.UnitPrice;
        product.CostoUnitario = request.UnitCost;
        product.PrecioMayoreo = request.WholesalePrice;
        product.CantidadMinimaMayoreo = request.WholesaleMinQuantity;
        product.UnidadMedida = NormalizeUnitOfMeasure(request.UnitOfMeasure);
        product.CoberturaPorUnidadM2 = request.CoveragePerUnitSqM;
        if (request.ImageUrl != null)
        {
            product.ImagenUrl = NormalizeImageUrl(request.ImageUrl) ?? string.Empty;
        }
        product.PiezasPorCaja = piezasCaja;
        product.CoberturaM2Caja = coberturaCaja;
        product.LargoCm = request.LengthCm;
        product.AltoCm = request.HeightCm;
        product.AnchoCm = request.WidthCm;
        product.AnchoMm = request.WidthMm;
        product.LargoMm = request.LengthMm;
        product.EspesorMm = request.ThicknessMm;
        product.Material = request.Material.Trim();
        product.Color = request.Color?.Trim() ?? string.Empty;
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
            JsonSerializer.Serialize(new { product.Nombre, product.CategoriaId, product.PrecioUnitario, product.PrecioMayoreo, product.UnidadMedida, product.EstaActivo }),
            ipAddress,
            $"Producto actualizado: {product.Nombre}",
            module: "Productos",
            eventType: "PRODUCT_UPDATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return (await GetProductByIdAsync(product.Id, cancellationToken))!;
    }

    public async Task<ProductDto> UpdateProductPriceAsync(Guid id, decimal newUnitPrice, decimal newWholesalePrice, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        ValidatePrices(newUnitPrice, newWholesalePrice, 0m);
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
            module: "Productos",
            eventType: "PRODUCT_UPDATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return (await GetProductByIdAsync(product.Id, cancellationToken))!;
    }

    public async Task DeleteProductAsync(Guid id, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var product = await _dbContext.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product == null)
        {
            throw new KeyNotFoundException($"Producto con ID '{id}' no encontrado.");
        }

        var oldValues = JsonSerializer.Serialize(new { product.IdProducto, product.Sku, product.Nombre, product.EstaActivo });
        product.EstaActivo = false;
        product.FechaActualizacionUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "PRODUCT_DELETED",
            "Producto",
            product.Id.ToString(),
            oldValues,
            JsonSerializer.Serialize(new { product.IdProducto, product.Sku, product.Nombre, product.EstaActivo }),
            ipAddress,
            $"Baja lógica de producto: {product.Nombre} (ID #{product.IdProducto}, SKU: {product.Sku})",
            module: "Productos",
            eventType: "PRODUCT_DELETED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);
    }

    public async Task<ProductDto> UpdateProductImageAsync(Guid id, string imageUrl, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var product = await _dbContext.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product == null)
        {
            throw new KeyNotFoundException($"Producto con ID '{id}' no encontrado.");
        }

        var normalizedUrl = NormalizeImageUrl(imageUrl) ?? string.Empty;
        var oldUrl = product.ImagenUrl;
        product.ImagenUrl = normalizedUrl;
        product.FechaActualizacionUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "PRODUCT_IMAGE_UPLOADED",
            "Producto",
            product.Id.ToString(),
            oldUrl.StartsWith("data:image/") ? "[BASE64_IMAGE]" : oldUrl,
            normalizedUrl.StartsWith("data:image/") ? "[BASE64_IMAGE]" : normalizedUrl,
            ipAddress,
            $"Imagen de producto actualizada: {product.Nombre} (ID #{product.IdProducto}, SKU: {product.Sku})",
            module: "Productos",
            eventType: "PRODUCT_IMAGE_UPLOADED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return (await GetProductByIdAsync(product.Id, cancellationToken))!;
    }

    public async Task<ProductDto> RemoveProductImageAsync(Guid id, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var product = await _dbContext.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product == null)
        {
            throw new KeyNotFoundException($"Producto con ID '{id}' no encontrado.");
        }

        var oldUrl = product.ImagenUrl;
        await _imageStorageService.DeleteProductImageAsync(product.Id, cancellationToken);

        product.ImagenUrl = string.Empty;
        product.FechaActualizacionUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "PRODUCT_IMAGE_REMOVED",
            "Producto",
            product.Id.ToString(),
            oldUrl.StartsWith("data:image/") ? "[BASE64_IMAGE]" : oldUrl,
            string.Empty,
            ipAddress,
            $"Imagen de producto eliminada: {product.Nombre} (ID #{product.IdProducto}, SKU: {product.Sku})",
            module: "Productos",
            eventType: "PRODUCT_IMAGE_REMOVED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return (await GetProductByIdAsync(product.Id, cancellationToken))!;
    }

    public async Task<MigrateBase64ImagesResultDto> MigrateExistingBase64ImagesAsync(Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);

        var productsWithBase64 = await _dbContext.Products
            .Where(p => p.ImagenUrl.StartsWith("data:image/"))
            .ToListAsync(cancellationToken);

        var totalScanned = productsWithBase64.Count;
        var migratedCount = 0;
        var skippedCount = 0;
        var failedCount = 0;
        var errors = new List<string>();

        foreach (var product in productsWithBase64)
        {
            try
            {
                var result = await _imageStorageService.MigrateBase64ImageAsync(product.Id, product.ImagenUrl, cancellationToken);
                if (result != null)
                {
                    product.ImagenUrl = result.PosUrl;
                    product.FechaActualizacionUtc = DateTime.UtcNow;
                    migratedCount++;
                }
                else
                {
                    skippedCount++;
                }
            }
            catch (Exception ex)
            {
                failedCount++;
                var errorMsg = $"Error al migrar producto #{product.IdProducto} (SKU: {product.Sku}): {ex.Message}";
                errors.Add(errorMsg);
            }
        }

        if (migratedCount > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(
                correlationId,
                currentUserId,
                "PRODUCT_IMAGES_MIGRATED",
                "Producto",
                "BATCH",
                $"Migración ejecutada para {totalScanned} productos.",
                $"Migrados con éxito: {migratedCount}, Fallidos: {failedCount}",
                ipAddress,
                $"Migración de imágenes Base64 a WebP completada. Migrados: {migratedCount}, Fallidos: {failedCount}",
                module: "Productos",
                eventType: "PRODUCT_IMAGES_MIGRATED",
                resultStatus: "SUCCESS",
                cancellationToken: cancellationToken);
        }

        return new MigrateBase64ImagesResultDto(totalScanned, migratedCount, skippedCount, failedCount, errors);
    }

    // Customers CRUD
    public async Task<PagedResult<CustomerDto>> GetCustomersAsync(
        string? search,
        string? type,
        bool includeInactive,
        CancellationToken cancellationToken = default,
        int page = 1,
        int pageSize = 25,
        string? sortBy = null,
        string? sortDirection = null)
    {
        var baseQuery = _dbContext.Customers.AsNoTracking();

        if (!includeInactive)
        {
            baseQuery = baseQuery.Where(c => c.EstaActivo);
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            baseQuery = baseQuery.Where(c => c.TipoCliente.ToLower() == type.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            baseQuery = baseQuery.Where(c => c.Nombre.ToLower().Contains(term) ||
                                             c.Apellido.ToLower().Contains(term) ||
                                             (c.NombreEmpresa != null && c.NombreEmpresa.ToLower().Contains(term)) ||
                                             (c.Rfc != null && c.Rfc.ToLower().Contains(term)));
        }

        var totalItems = await baseQuery.CountAsync(cancellationToken);
        if (totalItems == 0)
        {
            return new PagedResult<CustomerDto>([], 0, page, pageSize);
        }

        bool isDesc = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var sortedQuery = (sortBy?.ToLowerInvariant()) switch
        {
            "name" or "nombre" => isDesc ? baseQuery.OrderByDescending(c => c.NombreEmpresa ?? c.Nombre) : baseQuery.OrderBy(c => c.NombreEmpresa ?? c.Nombre),
            "type" or "tipo" => isDesc ? baseQuery.OrderByDescending(c => c.TipoCliente) : baseQuery.OrderBy(c => c.TipoCliente),
            "rfc" => isDesc ? baseQuery.OrderByDescending(c => c.Rfc) : baseQuery.OrderBy(c => c.Rfc),
            "phone" or "telefono" => isDesc ? baseQuery.OrderByDescending(c => c.Telefono) : baseQuery.OrderBy(c => c.Telefono),
            "isactive" or "activo" => isDesc ? baseQuery.OrderByDescending(c => c.EstaActivo) : baseQuery.OrderBy(c => c.EstaActivo),
            _ => baseQuery.OrderBy(c => c.NombreEmpresa ?? c.Nombre).ThenBy(c => c.Id)
        };

        var (skip, take) = QueryPaging.Normalize(page, pageSize, QueryPaging.DefaultStandardPageSize, QueryPaging.ExportMaxPageSize);
        var customers = await sortedQuery
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        var dtos = customers.Select(MapCustomerToDto).ToList();
        return new PagedResult<CustomerDto>(dtos, totalItems, page, take);
    }

    public async Task<CustomerDto?> GetCustomerByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var customer = await _dbContext.Customers.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        return customer == null ? null : MapCustomerToDto(customer);
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var values = NormalizeCustomer(
            request.FirstName, request.LastName, request.CompanyName, request.TaxId,
            request.Email, request.Phone, request.Address, request.City, request.State,
            request.PostalCode, request.CustomerType, request.SpecialDiscountPercentage, request.Notes);
        await EnsureUniqueCustomerAsync(values.Email, values.TaxId, null, cancellationToken);

        var customer = new Cliente
        {
            Nombre = values.FirstName,
            Apellido = values.LastName,
            NombreEmpresa = values.CompanyName,
            Rfc = values.TaxId,
            Email = values.Email,
            Telefono = values.Phone,
            Direccion = values.Address,
            Ciudad = values.City,
            Estado = values.State,
            CodigoPostal = values.PostalCode,
            TipoCliente = values.CustomerType,
            PorcentajeDescuentoEspecial = values.Discount,
            LimiteCajasDiarias = request.DailyBoxLimit,
            Notas = values.Notes,
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
            JsonSerializer.Serialize(new { customer.Nombre, customer.Apellido, customer.NombreEmpresa, customer.Rfc, customer.Email, customer.Telefono, customer.TipoCliente, customer.PorcentajeDescuentoEspecial }),
            ipAddress,
            $"Nuevo cliente registrado: {customer.NombreMostrar}",
            module: "Clientes",
            eventType: "CLIENT_CREATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return MapCustomerToDto(customer);
    }

    public async Task<CustomerDto> UpdateCustomerAsync(Guid id, UpdateCustomerDto request, bool canChangeStatus, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        await EnsureActiveUserAsync(currentUserId, cancellationToken);
        var customer = await _dbContext.Customers.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (customer == null)
        {
            throw new KeyNotFoundException($"Cliente con ID '{id}' no encontrado.");
        }

        var values = NormalizeCustomer(
            request.FirstName, request.LastName, request.CompanyName, request.TaxId,
            request.Email, request.Phone, request.Address, request.City, request.State,
            request.PostalCode, request.CustomerType, request.SpecialDiscountPercentage, request.Notes);
        await EnsureUniqueCustomerAsync(values.Email, values.TaxId, id, cancellationToken);
        var oldValues = JsonSerializer.Serialize(new { customer.Nombre, customer.Apellido, customer.NombreEmpresa, customer.Rfc, customer.Email, customer.Telefono, customer.TipoCliente, customer.PorcentajeDescuentoEspecial, customer.EstaActivo });

        customer.Nombre = values.FirstName;
        customer.Apellido = values.LastName;
        customer.NombreEmpresa = values.CompanyName;
        customer.Rfc = values.TaxId;
        customer.Email = values.Email;
        customer.Telefono = values.Phone;
        customer.Direccion = values.Address;
        customer.Ciudad = values.City;
        customer.Estado = values.State;
        customer.CodigoPostal = values.PostalCode;
        customer.TipoCliente = values.CustomerType;
        customer.PorcentajeDescuentoEspecial = values.Discount;
        customer.LimiteCajasDiarias = request.DailyBoxLimit;
        customer.Notas = values.Notes;
        if (canChangeStatus)
        {
            customer.EstaActivo = request.IsActive;
        }
        customer.FechaActualizacionUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "CUSTOMER_UPDATED",
            "Cliente",
            customer.Id.ToString(),
            oldValues,
            JsonSerializer.Serialize(new { customer.Nombre, customer.Apellido, customer.NombreEmpresa, customer.Rfc, customer.Email, customer.Telefono, customer.TipoCliente, customer.PorcentajeDescuentoEspecial, customer.EstaActivo }),
            ipAddress,
            $"Cliente actualizado: {customer.NombreMostrar}",
            module: "Clientes",
            eventType: "CLIENT_UPDATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

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
            c.SubCategorias?.Select(MapCategoryToDto).ToList() ?? new List<CategoryDto>(),
            c.EstaActivo
        );
    }

    private static ProductDto MapProductToDto(Producto p, decimal availableQuantity = 0m)
    {
        return new ProductDto(
            p.Id,
            p.IdProducto,
            p.Sku,
            p.Barcode,
            p.Nombre,
            p.Descripcion,
            p.CategoriaId,
            p.Categoria?.Nombre ?? string.Empty,
            p.PrecioUnitario,
            p.CostoUnitario,
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
            p.Color,
            p.SoloCotizacion,
            p.VisibleMasVendido,
            p.EstaActivo,
            p.Imagenes != null ? p.Imagenes.Select(img => img.UrlImagen).ToList() : new List<string>(),
            availableQuantity
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
            c.LimiteCajasDiarias,
            c.Notas,
            c.EstaActivo
        );
    }

    private async Task ValidateProductDetailsAsync(
        string name,
        string description,
        Guid categoryId,
        decimal unitPrice,
        decimal wholesalePrice,
        decimal wholesaleMinQuantity,
        string unitOfMeasure,
        decimal coveragePerUnitSqM,
        string? imageUrl,
        int piecesPerBox,
        decimal lengthCm,
        decimal heightCm,
        decimal widthCm,
        decimal? initialInventoryQuantity,
        int widthMm,
        int lengthMm,
        int thicknessMm,
        string material,
        CancellationToken cancellationToken)
    {
        _ = NormalizeText(name, "El nombre del producto", 200, required: true);
        _ = NormalizeText(description, "La descripción", 2_000, required: false);
        _ = NormalizeText(material, "El material", 100, required: true);
        _ = NormalizeUnitOfMeasure(unitOfMeasure);
        _ = NormalizeImageUrl(imageUrl);
        ValidatePrices(unitPrice, wholesalePrice, wholesaleMinQuantity);

        if (piecesPerBox is < 1 or > 10_000)
        {
            throw new ArgumentException("Las piezas por caja deben estar entre 1 y 10,000.");
        }
        if (coveragePerUnitSqM < 0m || lengthCm < 0m || heightCm < 0m || widthCm < 0m ||
            widthMm < 0 || lengthMm < 0 || thicknessMm < 0)
        {
            throw new ArgumentException("Las coberturas y dimensiones no pueden ser negativas.");
        }
        if (initialInventoryQuantity < 0m)
        {
            throw new ArgumentException("El inventario inicial no puede ser negativo.");
        }
        if (!await _dbContext.Categories.AnyAsync(
            category => category.Id == categoryId && category.EstaActivo,
            cancellationToken))
        {
            throw new ArgumentException("La categoría seleccionada no existe o está inactiva.");
        }
    }

    private async Task EnsureUniqueProductCodesAsync(string sku, string barcode, Guid? excludedId, CancellationToken cancellationToken)
    {
        if (await _dbContext.Products.AnyAsync(product => product.Id != excludedId && product.Sku.ToUpper() == sku, cancellationToken))
        {
            throw new InvalidOperationException($"Ya existe un producto con el SKU '{sku}'.");
        }
        if (await _dbContext.Products.AnyAsync(product => product.Id != excludedId && product.Barcode.ToUpper() == barcode.ToUpper(), cancellationToken))
        {
            throw new InvalidOperationException($"Ya existe un producto con el código de barras '{barcode}'.");
        }
    }

    private async Task EnsureUniqueCategorySlugAsync(string slug, Guid? excludedId, CancellationToken cancellationToken)
    {
        if (await _dbContext.Categories.AnyAsync(
            category => category.Id != excludedId && category.Slug.ToLower() == slug,
            cancellationToken))
        {
            throw new InvalidOperationException("Ya existe una categoría con ese nombre.");
        }
    }

    private async Task EnsureValidCategoryParentAsync(Guid? categoryId, Guid? parentCategoryId, CancellationToken cancellationToken)
    {
        if (!parentCategoryId.HasValue)
        {
            return;
        }
        if (categoryId == parentCategoryId)
        {
            throw new ArgumentException("Una categoría no puede ser su propia categoría padre.");
        }

        var currentParentId = parentCategoryId;
        var visited = new HashSet<Guid>();
        while (currentParentId.HasValue)
        {
            if (!visited.Add(currentParentId.Value) || currentParentId == categoryId)
            {
                throw new ArgumentException("La categoría padre seleccionada genera una relación circular.");
            }

            var parent = await _dbContext.Categories
                .AsNoTracking()
                .Where(category => category.Id == currentParentId.Value && category.EstaActivo)
                .Select(category => new { category.CategoriaPadreId })
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new ArgumentException("La categoría padre seleccionada no existe o está inactiva.");
            currentParentId = parent.CategoriaPadreId;
        }
    }

    private static string NormalizeSku(string value)
    {
        var sku = NormalizeText(value, "El SKU", 64, required: true).Trim().ToUpperInvariant();
        return sku;
    }

    private static string NormalizeBarcode(string value)
    {
        var barcode = NormalizeText(value, "El código de barras", 64, required: true);
        if (!Regex.IsMatch(barcode, "^[A-Za-z0-9._-]{3,64}$"))
        {
            throw new ArgumentException("El código de barras contiene caracteres no válidos.");
        }
        return barcode;
    }

    private static string NormalizeUnitOfMeasure(string value)
    {
        var requested = value?.Trim();
        return ProductUnitMeasures.All.FirstOrDefault(unit =>
            string.Equals(unit, requested, StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException("La unidad de medida seleccionada no es válida.");
    }

    private static string? NormalizeImageUrl(string? value)
    {
        var imageUrl = value?.Trim();
        if (string.IsNullOrEmpty(imageUrl))
        {
            return null;
        }
        if (imageUrl.Length > InventoryDefaults.MaxEvidenceImageDataUrlLength)
        {
            throw new ArgumentException("La imagen del producto excede el tamaño permitido.");
        }
        if (imageUrl.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) || imageUrl.StartsWith('/'))
        {
            return imageUrl;
        }
        if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
        {
            throw new ArgumentException("La imagen del producto debe ser una imagen local, Base64 o una URL HTTP/HTTPS válida.");
        }
        return imageUrl;
    }

    private static void ValidatePrices(decimal unitPrice, decimal wholesalePrice, decimal wholesaleMinQuantity)
    {
        if (unitPrice <= 0m)
        {
            throw new ArgumentException("El precio unitario debe ser mayor a cero.");
        }
        if (wholesalePrice < 0m || wholesalePrice > unitPrice)
        {
            throw new ArgumentException("El precio de mayoreo debe ser cero o menor o igual al precio unitario.");
        }
        if (wholesaleMinQuantity < 0m || (wholesalePrice > 0m && wholesaleMinQuantity <= 0m))
        {
            throw new ArgumentException("La cantidad mínima de mayoreo debe ser mayor a cero cuando existe precio de mayoreo.");
        }
    }

    private static string CreateSlug(string name)
    {
        var decomposed = name.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        var lastWasSeparator = false;
        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }
            if (char.IsLetterOrDigit(character))
            {
                builder.Append(char.ToLowerInvariant(character));
                lastWasSeparator = false;
            }
            else if (!lastWasSeparator && builder.Length > 0)
            {
                builder.Append('-');
                lastWasSeparator = true;
            }
        }

        return builder.ToString().Trim('-');
    }

    private async Task EnsureActiveUserAsync(Guid? currentUserId, CancellationToken cancellationToken)
    {
        if (!currentUserId.HasValue ||
            !await _dbContext.Users.AnyAsync(user => user.Id == currentUserId.Value && user.EstaActivo, cancellationToken))
        {
            throw new InvalidOperationException("La sesión no corresponde a un usuario activo.");
        }
    }

    private async Task EnsureUniqueCustomerAsync(string email, string? taxId, Guid? excludedId, CancellationToken cancellationToken)
    {
        if (await _dbContext.Customers.AnyAsync(customer =>
            customer.Id != excludedId && customer.Email.ToLower() == email.ToLower(), cancellationToken))
        {
            throw new InvalidOperationException("Ya existe un cliente con el correo electrónico capturado.");
        }
        if (taxId != null && await _dbContext.Customers.AnyAsync(customer =>
            customer.Id != excludedId && customer.Rfc != null && customer.Rfc.ToUpper() == taxId, cancellationToken))
        {
            throw new InvalidOperationException("Ya existe un cliente con el RFC capturado.");
        }
    }

    private static CustomerValues NormalizeCustomer(
        string firstName, string lastName, string? companyName, string? taxId,
        string email, string phone, string address, string city, string state,
        string postalCode, string customerType, decimal discount, string notes)
    {
        var normalizedFirstName = NormalizeText(firstName, "El nombre", 100, required: true);
        var normalizedLastName = NormalizeText(lastName, "El apellido", 100, required: true);
        var normalizedCompany = NormalizeNullableText(companyName, "La razón social", 200);
        var normalizedTaxId = NormalizeNullableText(taxId, "El RFC", 13)?.ToUpperInvariant();
        if (normalizedTaxId != null && !Regex.IsMatch(normalizedTaxId, "^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$"))
        {
            throw new ArgumentException("El RFC debe contener 12 o 13 caracteres con formato mexicano válido.");
        }

        var normalizedEmail = NormalizeText(email, "El correo electrónico", 256, required: true).ToLowerInvariant();
        if (!MailAddress.TryCreate(normalizedEmail, out _))
        {
            throw new ArgumentException("El correo electrónico no tiene un formato válido.");
        }
        var normalizedPhone = Regex.Replace(NormalizeText(phone, "El teléfono", 25, required: true), "[\\s()-]", string.Empty);
        if (!Regex.IsMatch(normalizedPhone, "^\\+?[0-9]{10,15}$"))
        {
            throw new ArgumentException("El teléfono debe contener entre 10 y 15 dígitos.");
        }

        var normalizedPostalCode = NormalizeText(postalCode, "El código postal", 5, required: false);
        if (normalizedPostalCode.Length > 0 && !Regex.IsMatch(normalizedPostalCode, "^[0-9]{5}$"))
        {
            throw new ArgumentException("El código postal debe contener exactamente 5 dígitos.");
        }
        var normalizedType = CustomerTypes.All.FirstOrDefault(type =>
            string.Equals(type, customerType?.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException("El tipo de cliente seleccionado no es válido.");
        if (discount < 0 || discount > 100)
        {
            throw new ArgumentException("El descuento especial debe estar entre 0% y 100%.");
        }

        return new CustomerValues(
            normalizedFirstName,
            normalizedLastName,
            normalizedCompany,
            normalizedTaxId,
            normalizedEmail,
            normalizedPhone,
            NormalizeText(address, "La dirección", 300, required: false),
            NormalizeText(city, "La ciudad", 100, required: false),
            NormalizeText(state, "El estado", 100, required: false),
            normalizedPostalCode,
            normalizedType,
            discount,
            NormalizeText(notes, "Las notas", 500, required: false));
    }

    private static string NormalizeText(string? value, string fieldName, int maxLength, bool required)
    {
        var normalized = value?.Trim() ?? string.Empty;
        if (required && normalized.Length == 0) throw new ArgumentException($"{fieldName} es obligatorio.");
        if (normalized.Length > maxLength) throw new ArgumentException($"{fieldName} no puede exceder {maxLength} caracteres.");
        return normalized;
    }

    private static string? NormalizeNullableText(string? value, string fieldName, int maxLength)
    {
        var normalized = NormalizeText(value, fieldName, maxLength, required: false);
        return normalized.Length == 0 ? null : normalized;
    }

    private sealed record CustomerValues(
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
        decimal Discount,
        string Notes);
}

public class NoOpProductImageStorageService : IProductImageStorageService
{
    public Task<ProductImageResultDto> SaveProductImageAsync(Guid productId, Stream imageStream, string originalFileName, CancellationToken cancellationToken = default)
    {
        var idStr = productId.ToString("D");
        return Task.FromResult(new ProductImageResultDto($"/products/{idStr}/thumbnail.webp", $"/products/{idStr}/pos.webp", $"/products/{idStr}/preview.webp"));
    }

    public Task<bool> DeleteProductImageAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(true);
    }

    public Task<ProductImageResultDto?> MigrateBase64ImageAsync(Guid productId, string base64Data, CancellationToken cancellationToken = default)
    {
        var idStr = productId.ToString("D");
        return Task.FromResult<ProductImageResultDto?>(new ProductImageResultDto($"/products/{idStr}/thumbnail.webp", $"/products/{idStr}/pos.webp", $"/products/{idStr}/preview.webp"));
    }

    public string? GetVariantUrl(string? rawImageUrl, ProductImageVariant variant)
    {
        return rawImageUrl;
    }
}
