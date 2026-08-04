using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Sales.DTOs;
using Pos.Infrastructure.Identity;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;
using Xunit;

namespace Pos.Application.Tests.Sales;

public class SaleApplicationTests
{
    private PosDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<PosDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new PosDbContext(options);
    }

    [Fact]
    public async Task ProcessSaleAsync_ShouldCreateSale_WhenStockIsAvailable()
    {
        // Arrange
        var context = GetInMemoryDbContext();
        var passwordHasher = new PasswordHasherService();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, passwordHasher);

        var saleService = new SaleApplicationService(context, auditService);

        var product = await context.Products.FirstAsync();
        var request = new CreateSaleDto(
            CustomerId: null,
            PaymentType: "FullPayment",
            CashAmount: 700m,
            CardAmount: 0m,
            TransferAmount: 0m,
            AdvanceAmount: 0m,
            DiscountAmount: 0m,
            Notes: "Venta de prueba",
            Items: new List<CreateSaleItemDto>
            {
                new(product.Id, 2m, product.PrecioUnitario, 0m)
            }
        );

        // Act
        var result = await saleService.ProcessSaleAsync(request, null, "corr-sale-1", "127.0.0.1");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.FolioNumber);
        Assert.Equal("Completada", result.Status);
        Assert.Single(result.Items);
    }
}
