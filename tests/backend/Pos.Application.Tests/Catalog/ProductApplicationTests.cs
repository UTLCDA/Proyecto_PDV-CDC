using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Inventory.DTOs;
using Pos.Infrastructure.Identity;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;
using Xunit;

namespace Pos.Application.Tests.Catalog;

public class ProductApplicationTests
{
    private PosDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<PosDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new PosDbContext(options);
    }

    [Fact]
    public async Task CreateProductAsync_ShouldCreateProduct_AndInitializeStock()
    {
        // Arrange
        var context = GetInMemoryDbContext();
        var passwordHasher = new PasswordHasherService();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, passwordHasher);

        var catalogService = new CatalogApplicationService(context, auditService);
        var category = await context.Categories.FirstAsync();
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        var request = CreateValidRequest(category.Id);

        // Act
        var result = await catalogService.CreateProductAsync(request, userId, "corr-prod-1", "127.0.0.1");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("WPC-TEST-001", result.Sku);
        Assert.Equal("Lambrin Test Product", result.Name);

        var stock = await context.Stocks.FirstOrDefaultAsync(s => s.ProductoId == result.Id);
        Assert.NotNull(stock);
        Assert.Equal(100m, stock.CantidadDisponible);
        Assert.Equal(InventoryDefaults.DefaultWarehouseLocation, stock.Ubicacion);
        Assert.True(await context.AuditLogs.AnyAsync(log => log.Accion == "PRODUCT_CREATED" && log.EntidadId == result.Id.ToString()));
    }

    [Fact]
    public async Task CreateProductAsync_ShouldRejectDuplicateBarcodeAndInvalidCategory()
    {
        var context = GetInMemoryDbContext();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var catalogService = new CatalogApplicationService(context, auditService);
        var categoryId = await context.Categories.Select(category => category.Id).FirstAsync();
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        var existingBarcode = await context.Products.Select(product => product.Barcode).FirstAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => catalogService.CreateProductAsync(
            CreateValidRequest(categoryId) with { Barcode = existingBarcode },
            userId,
            "corr-duplicate-barcode",
            "127.0.0.1"));
        await Assert.ThrowsAsync<ArgumentException>(() => catalogService.CreateProductAsync(
            CreateValidRequest(Guid.NewGuid()),
            userId,
            "corr-invalid-category",
            "127.0.0.1"));
    }

    [Fact]
    public async Task CreateCategoryAsync_ShouldNormalizeSlugAndRejectDuplicates()
    {
        var context = GetInMemoryDbContext();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var catalogService = new CatalogApplicationService(context, auditService);
        var userId = await context.Users.Select(user => user.Id).FirstAsync();

        var category = await catalogService.CreateCategoryAsync(
            new CreateCategoryDto("Accesorios de Instalación", "Perfiles y fijaciones", null),
            userId,
            "corr-category",
            "127.0.0.1");

        Assert.Equal("accesorios-de-instalacion", category.Slug);
        await Assert.ThrowsAsync<InvalidOperationException>(() => catalogService.CreateCategoryAsync(
            new CreateCategoryDto("Accesorios de Instalación", string.Empty, null),
            userId,
            "corr-category-duplicate",
            "127.0.0.1"));
    }

    private static CreateProductDto CreateValidRequest(Guid categoryId) => new(
        Sku: "WPC-TEST-001",
        Barcode: "750999888777",
        Name: "Lambrin Test Product",
        Description: "Lambrin de alta calidad para pruebas",
        CategoryId: categoryId,
        UnitPrice: 450m,
        UnitCost: 250m,
        WholesalePrice: 380m,
        WholesaleMinQuantity: 10m,
        UnitOfMeasure: "Pza",
        CoveragePerUnitSqM: 0.45m,
        ImageUrl: "/logo_wpc_bajio.jpeg",
        PiecesPerBox: 10,
        LengthCm: 290m,
        HeightCm: 2.4m,
        WidthCm: 16m,
        InitialInventoryQuantity: 100m,
        WidthMm: 160,
        LengthMm: 2900,
        ThicknessMm: 24,
        Material: "WPC Co-Extrusión",
        Color: "Teka",
        IsQuoteOnly: false,
        IsTopSellerVisible: true);
}
