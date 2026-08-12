using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Sales.DTOs;
using Pos.Domain.Common;
using Pos.Domain.Entidades;
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

    private static async Task SeedOpenShiftAsync(PosDbContext context, Guid userId)
    {
        context.CashShifts.Add(new TurnoCaja
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
    public async Task ProcessSaleAsync_ShouldCreateSale_WhenStockIsAvailable()
    {
        // Arrange
        var context = GetInMemoryDbContext();
        var passwordHasher = new PasswordHasherService();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, passwordHasher);

        var saleService = new SaleApplicationService(context, auditService);

        var product = await context.Products.FirstAsync();
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        await SeedOpenShiftAsync(context, userId);

        var expectedSubtotal = product.PrecioUnitario * 2m;
        var expectedTax = Math.Round(expectedSubtotal * 0.16m, 2);
        var expectedTotal = expectedSubtotal + expectedTax;
        var request = new CreateSaleDto(
            CustomerId: null,
            PaymentType: SalePaymentTypes.FullPayment,
            CashAmount: expectedTotal,
            CardAmount: 0m,
            TransferAmount: 0m,
            AdvanceAmount: 0m,
            DiscountAmount: 0m,
            Notes: "Venta de prueba",
            Items: new List<CreateSaleItemDto>
            {
                new(product.Id, 2m, 0.01m, 0m)
            }
        );

        // Act
        var result = await saleService.ProcessSaleAsync(request, userId, "corr-sale-1", "127.0.0.1");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.FolioNumber);
        Assert.Equal(SaleStatuses.Completed, result.Status);
        Assert.Single(result.Items);
        Assert.Equal(product.PrecioUnitario, result.Items.Single().UnitPrice);
        Assert.Equal(expectedSubtotal, result.SubTotal);
        Assert.Equal(expectedTax, result.TaxAmount);
        Assert.Equal(expectedTotal, result.TotalAmount);
        Assert.Equal(148m, (await context.Stocks.SingleAsync(stock => stock.ProductoId == product.Id)).CantidadDisponible);
    }

    [Fact]
    public async Task ProcessSaleAsync_ShouldUseWholesalePrice_WhenMinimumQuantityIsReached()
    {
        var context = GetInMemoryDbContext();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var service = new SaleApplicationService(context, auditService);
        var product = await context.Products.FirstAsync(product => product.CantidadMinimaMayoreo > 0);
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        await SeedOpenShiftAsync(context, userId);

        var quantity = product.CantidadMinimaMayoreo;
        var expectedSubtotal = quantity * product.PrecioMayoreo;
        var expectedTotal = expectedSubtotal + Math.Round(expectedSubtotal * 0.16m, 2);

        var result = await service.ProcessSaleAsync(
            CreateFullPaymentRequest(product.Id, quantity, expectedTotal, unitPrice: 999_999m),
            userId,
            "corr-wholesale",
            "127.0.0.1");

        Assert.Equal(product.PrecioMayoreo, result.Items.Single().UnitPrice);
        Assert.Equal(expectedSubtotal, result.SubTotal);
    }

    [Fact]
    public async Task ProcessSaleAsync_ShouldRejectManualDiscount_WhenPermissionIsMissing()
    {
        var context = GetInMemoryDbContext();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var service = new SaleApplicationService(context, auditService);
        var product = await context.Products.FirstAsync();
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        await SeedOpenShiftAsync(context, userId);

        var request = CreateFullPaymentRequest(product.Id, 1m, product.PrecioUnitario * 1.16m, discountAmount: 10m);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ProcessSaleAsync(request, userId, "corr-discount", "127.0.0.1"));

        Assert.Contains("permiso", exception.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Empty(context.Sales);
    }

    [Fact]
    public async Task ProcessSaleAsync_ShouldCreatePendingBalance_ForValidAdvanceDeposit()
    {
        var context = GetInMemoryDbContext();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var service = new SaleApplicationService(context, auditService);
        var product = await context.Products.FirstAsync();
        var customerId = await context.Customers.Select(customer => customer.Id).FirstAsync();
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        await SeedOpenShiftAsync(context, userId);

        var total = product.PrecioUnitario * 1.16m;
        const decimal advance = 100m;
        var request = new CreateSaleDto(
            customerId,
            SalePaymentTypes.AdvanceDeposit,
            0m,
            advance,
            advance,
            0m,
            0m,
            "Apartado de prueba",
            [new CreateSaleItemDto(product.Id, 1m, 0.01m, 0m)]);

        var result = await service.ProcessSaleAsync(request, userId, "corr-advance", "127.0.0.1");

        Assert.Equal(SaleStatuses.DepositPaid, result.Status);
        Assert.Equal(advance, result.AdvanceAmount);
        Assert.Equal(total - advance, result.PendingBalance);
    }

    [Fact]
    public async Task ProcessSaleAsync_ShouldNotPersistChanges_WhenStockIsInsufficient()
    {
        var context = GetInMemoryDbContext();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var service = new SaleApplicationService(context, auditService);
        var product = await context.Products.FirstAsync();
        var stock = await context.Stocks.SingleAsync(item => item.ProductoId == product.Id);
        var originalStock = stock.CantidadDisponible;
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        await SeedOpenShiftAsync(context, userId);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ProcessSaleAsync(
            CreateFullPaymentRequest(product.Id, originalStock + 1m, 1m),
            userId,
            "corr-no-stock",
            "127.0.0.1"));

        Assert.Empty(context.Sales);
        Assert.Empty(context.InventoryMovements);
        Assert.Equal(originalStock, stock.CantidadDisponible);
    }

    [Fact]
    public async Task GetSaleByIdAndOperationalFolio_ShouldReturnTheSameSale()
    {
        await using var context = GetInMemoryDbContext();
        var service = new SaleApplicationService(
            context,
            new AuditLogService(context, NullLogger<AuditLogService>.Instance));
        var sale = new Venta
        {
            IdVenta = 157,
            NumeroFolio = "VENTA-TEST-IDVENTA-000157",
            TipoPago = SalePaymentTypes.FullPayment,
            SubTotal = 100m,
            MontoIva = 16m,
            MontoTotal = 116m,
            MontoEfectivo = 116m,
            MontoAnticipo = 116m,
            Estado = SaleStatuses.Completed,
            Notas = "Prueba de equivalencia GUID e IdVenta",
            EstaActivo = true,
            FechaCreacionUtc = DateTime.UtcNow
        };
        var legacyTextMatch = new Venta
        {
            IdVenta = 999,
            NumeroFolio = "VENTA-LEGACY-CONTAINS-157",
            TipoPago = SalePaymentTypes.FullPayment,
            Estado = SaleStatuses.Completed,
            EstaActivo = true,
            FechaCreacionUtc = DateTime.UtcNow.AddMinutes(-1)
        };
        context.Sales.AddRange(sale, legacyTextMatch);
        await context.SaveChangesAsync();

        var byGuid = await service.GetSaleByIdAsync(sale.Id);
        var byOperationalFolio = await service.GetSaleByFolioAsync(sale.IdVenta);
        var searchByOperationalFolio = await service.GetSalesAsync("157", null, null, null, null);

        Assert.NotNull(byGuid);
        Assert.NotNull(byOperationalFolio);
        Assert.Equal(byGuid.Id, byOperationalFolio.Id);
        Assert.Equal(157, byOperationalFolio.IdVenta);
        Assert.Equal(byGuid.FolioNumber, byOperationalFolio.FolioNumber);
        Assert.Equal(byGuid.TotalAmount, byOperationalFolio.TotalAmount);
        Assert.Equal(sale.Id, Assert.Single(searchByOperationalFolio).Id);
    }

    private static CreateSaleDto CreateFullPaymentRequest(
        Guid productId,
        decimal quantity,
        decimal cashAmount,
        decimal unitPrice = 0.01m,
        decimal discountAmount = 0m) => new(
            null,
            SalePaymentTypes.FullPayment,
            discountAmount,
            0m,
            cashAmount,
            0m,
            0m,
            "Venta de prueba",
            [new CreateSaleItemDto(productId, quantity, unitPrice, 0m)]);
}
