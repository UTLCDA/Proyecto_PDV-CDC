using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Sales.DTOs;
using Pos.Domain.Common;
using Pos.Domain.Entidades;
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

    private static async Task SeedOpenShiftAsync(PosDbContext context, Guid userId)
    {
        context.CashShifts.Add(new Pos.Domain.Entidades.TurnoCaja
        {
            NumeroTurno = $"TURNO-{Guid.NewGuid():N}",
            UsuarioId = userId,
            MontoApertura = 1000m,
            MontoCierreEsperado = 1000m,
            Estado = CashShiftStatuses.Open,
            FechaAperturaUtc = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
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
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        await SeedOpenShiftAsync(context, userId);
        var expectedSubtotal = product.PrecioUnitario * 2m;
        var expectedTotal = expectedSubtotal + Math.Round(expectedSubtotal * 0.16m, 2);

        var request1 = new CreateSaleDto(
            CustomerId: null,
            PaymentType: SalePaymentTypes.FullPayment,
            DiscountAmount: 0m,
            AdvanceAmount: 0m,
            CashAmount: expectedTotal,
            CardAmount: 0m,
            TransferAmount: 0m,
            Notes: "Venta 1",
            Items: new List<CreateSaleItemDto> { new(product.Id, 2m, product.PrecioUnitario, 0m) }
        );
        var sale = await saleService.ProcessSaleAsync(request1, userId, "corr-1", "127.0.0.1");
        var refundAmount = expectedTotal / 2m;
        var returnHeader = new DevolucionCabecera
        {
            VentaId = sale.Id,
            UsuarioId = userId,
            NumeroDevolucion = $"DEV-TEST-{Guid.NewGuid():N}",
            MontoTotalDevuelto = refundAmount,
            MontoReembolsado = refundAmount,
            FormaReembolso = RefundMethods.Cash,
            Motivo = "Prueba de reporte neto",
            Estado = ReturnStatuses.Completed
        };
        returnHeader.Detalle.Add(new DevolucionDetalle
        {
            ProductoId = product.Id,
            Cantidad = 1m,
            PrecioUnitarioDevolucion = refundAmount,
            PrecioTotalDevolucion = refundAmount
        });
        context.ReturnHeaders.Add(returnHeader);
        await context.SaveChangesAsync();

        // Act
        var report = await reportingService.GetSalesSummaryReportAsync(null, null);

        // Assert
        Assert.NotNull(report);
        Assert.Equal(1, report.TotalSalesCount);
        Assert.Equal(expectedTotal, report.TotalSalesAmount);
        Assert.Equal(refundAmount, report.TotalReturnedAmount);
        Assert.Equal(expectedTotal - refundAmount, report.NetSalesAmount);
        Assert.Equal(expectedTotal - refundAmount, report.TotalCashIncome);

        var topProducts = await reportingService.GetTopSellingProductsReportAsync(null, null, 10);
        var topProduct = Assert.Single(topProducts);
        Assert.Equal(2m, topProduct.TotalQuantitySold);
        Assert.Equal(1m, topProduct.TotalQuantityReturned);
        Assert.Equal(1m, topProduct.NetQuantitySold);

        var futureReport = await reportingService.GetSalesSummaryReportAsync(
            DateTime.UtcNow.AddDays(1),
            DateTime.UtcNow.AddDays(2));
        Assert.Equal(0, futureReport.TotalSalesCount);
        await Assert.ThrowsAsync<ArgumentException>(() => reportingService.GetSalesSummaryReportAsync(
            DateTime.UtcNow,
            DateTime.UtcNow.AddDays(-1)));
    }

    [Fact]
    public async Task GetInventorySummaryReportAsync_ShouldReturnOnlyRealStockMetrics()
    {
        var context = GetInMemoryDbContext();
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var reportingService = new ReportingApplicationService(context);

        var summary = await reportingService.GetInventorySummaryReportAsync();

        Assert.Equal(2, summary.TotalProducts);
        Assert.Equal(230m, summary.TotalUnitsOnHand);
        Assert.Equal(0, summary.LowStockProducts);
        Assert.Equal(0, summary.OutOfStockProducts);
        Assert.True(summary.InventoryRetailValue > 0m);
    }
}
