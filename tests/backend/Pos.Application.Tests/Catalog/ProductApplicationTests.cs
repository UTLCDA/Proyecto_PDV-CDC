using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Catalog.DTOs;
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

        var request = new CreateProductDto(
            Sku: "LAM-TEST-001",
            Barcode: "750999888777",
            Name: "Lambrin Test Product",
            Description: "Lambrin de alta calidad para pruebas",
            CategoryId: category.Id,
            UnitPrice: 450m,
            WholesalePrice: 380m,
            WholesaleMinQuantity: 10m,
            UnitOfMeasure: "Pza",
            CoveragePerUnitSqM: 0.45m,
            WidthMm: 160,
            LengthMm: 2900,
            ThicknessMm: 24,
            Material: "WPC Co-Extrusión",
            IsQuoteOnly: false,
            IsTopSellerVisible: true
        );

        // Act
        var result = await catalogService.CreateProductAsync(request, null, "corr-prod-1", "127.0.0.1");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("LAM-TEST-001", result.Sku);
        Assert.Equal("Lambrin Test Product", result.Name);

        var stock = await context.Stocks.FirstOrDefaultAsync(s => s.ProductoId == result.Id);
        Assert.NotNull(stock);
        Assert.Equal(100m, stock.CantidadDisponible);
    }
}
