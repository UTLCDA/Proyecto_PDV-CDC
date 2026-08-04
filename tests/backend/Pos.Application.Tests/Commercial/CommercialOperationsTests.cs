using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Commercial.DTOs;
using Pos.Infrastructure.Identity;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;
using Xunit;

namespace Pos.Application.Tests.Commercial;

public class CommercialOperationsTests
{
    private PosDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<PosDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new PosDbContext(options);
    }

    [Fact]
    public async Task CreateQuoteAsync_ShouldCreateQuote_WithGeneratedNumber()
    {
        // Arrange
        var context = GetInMemoryDbContext();
        var passwordHasher = new PasswordHasherService();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, passwordHasher);

        var saleService = new SaleApplicationService(context, auditService);
        var commercialService = new CommercialOperationsService(context, saleService, auditService);
        var product = await context.Products.FirstAsync();

        var request = new CreateQuoteDto(
            CustomerId: null,
            DiscountAmount: 0m,
            Notes: "Cotizacion de prueba",
            Items: new List<CreateQuoteItemDto>
            {
                new(product.Id, 10m, product.PrecioUnitario, 0m)
            }
        );

        // Act
        var result = await commercialService.CreateQuoteAsync(request, null, "corr-quote-1");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.QuoteNumber);
        Assert.Equal("Activa", result.Status);
        Assert.Single(result.Items);
    }
}
