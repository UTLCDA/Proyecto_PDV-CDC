using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Sales.DTOs;
using Pos.Infrastructure.Identity;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;
using Xunit;

namespace Pos.Application.Tests.Reporting;

public class ReportingApplicationTests
{
    private PosDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<PosDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new PosDbContext(options);
    }

    [Fact]
    public async Task GetSalesSummaryReportAsync_ShouldReturnAggregatedMetrics()
    {
        // Arrange
        var context = GetInMemoryDbContext();
        var passwordHasher = new PasswordHasherService();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, passwordHasher);

        var saleService = new SaleApplicationService(context, auditService);
        var reportingService = new ReportingApplicationService(context);

        var product = await context.Products.FirstAsync();

        var request1 = new CreateSaleDto(
            CustomerId: null,
            PaymentType: "FullPayment",
            DiscountAmount: 0m,
            AdvanceAmount: 0m,
            CashAmount: 700m,
            CardAmount: 0m,
            TransferAmount: 0m,
            Notes: "Venta 1",
            Items: new List<CreateSaleItemDto> { new(product.Id, 2m, product.PrecioUnitario, 0m) }
        );
        await saleService.ProcessSaleAsync(request1, null, "corr-1", "127.0.0.1");

        // Act
        var report = await reportingService.GetSalesSummaryReportAsync(null, null);

        // Assert
        Assert.NotNull(report);
        Assert.True(report.TotalSalesCount >= 1);
        Assert.True(report.TotalSalesAmount > 0);
    }
}
