using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.CashShift.DTOs;
using Pos.Domain.Common;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Identity;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;
using Xunit;

namespace Pos.Application.Tests.CashShift;

public class CashShiftApplicationTests
{
    [Fact]
    public async Task CloseShiftAsync_ShouldOnlyIncludeActiveSalesCreatedDuringShift()
    {
        await using var context = CreateDbContext();
        var (service, userId) = await CreateServiceAsync(context);
        var opened = await service.OpenShiftAsync(new OpenCashShiftDto(100m, string.Empty), userId, "open", "127.0.0.1");

        context.Sales.AddRange(
            CreateSale(userId, opened.OpenedAtUtc.AddMinutes(-10), 500m),
            CreateSale(userId, opened.OpenedAtUtc.AddMilliseconds(1), 125m),
            CreateSale(userId, opened.OpenedAtUtc.AddMilliseconds(2), 75m, isActive: false),
            CreateSale(userId, opened.OpenedAtUtc.AddMilliseconds(3), 60m, status: "Cancelada"));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var closed = await service.CloseShiftAsync(
            new CloseCashShiftDto(225m, string.Empty),
            userId,
            "close",
            "127.0.0.1");

        Assert.Equal(125m, closed.TotalSalesCash);
        Assert.Equal(225m, closed.ExpectedClosingAmount);
        Assert.Equal(0m, closed.DifferenceAmount);
        Assert.Equal(CashShiftStatuses.Closed, closed.Status);
    }

    [Fact]
    public async Task RegisterWithdrawalAsync_ShouldRejectAmountAboveExpectedCash()
    {
        await using var context = CreateDbContext();
        var (service, userId) = await CreateServiceAsync(context);
        await service.OpenShiftAsync(new OpenCashShiftDto(100m, string.Empty), userId, "open", "127.0.0.1");
        context.ChangeTracker.Clear();

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.RegisterWithdrawalAsync(
                new CashWithdrawalDto(100.01m, "Retiro de prueba"),
                userId,
                "withdrawal",
                "127.0.0.1"));

        Assert.Contains("excede el efectivo esperado", exception.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0m, (await context.CashShifts.SingleAsync()).TotalRetiros);
    }

    [Fact]
    public async Task CloseShiftAsync_ShouldRequireJustificationWhenThereIsDifference()
    {
        await using var context = CreateDbContext();
        var (service, userId) = await CreateServiceAsync(context);
        await service.OpenShiftAsync(new OpenCashShiftDto(100m, string.Empty), userId, "open", "127.0.0.1");
        context.ChangeTracker.Clear();

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CloseShiftAsync(
                new CloseCashShiftDto(90m, string.Empty),
                userId,
                "close-difference",
                "127.0.0.1"));

        Assert.Contains("justificación", exception.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(CashShiftStatuses.Open, (await context.CashShifts.SingleAsync()).Estado);
    }

    [Fact]
    public async Task GenerateXReportAsync_ShouldRefreshTotalsWithoutClosingShift()
    {
        await using var context = CreateDbContext();
        var (service, userId) = await CreateServiceAsync(context);
        var opened = await service.OpenShiftAsync(new OpenCashShiftDto(50m, string.Empty), userId, "open", "127.0.0.1");
        context.Sales.Add(CreateSale(userId, opened.OpenedAtUtc.AddMilliseconds(1), 80m, cardAmount: 20m, idVenta: 8054));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var report = await service.GenerateXReportAsync(userId, "x-report", "127.0.0.1");
        var movements = await service.GetGeneralMovementsAsync();
        var saleMovement = Assert.Single(movements, item => item.Category == "Venta");

        Assert.Equal(CashShiftStatuses.Open, report.Status);
        Assert.Null(report.ClosedAtUtc);
        Assert.Equal(80m, report.TotalSalesCash);
        Assert.Equal(20m, report.TotalSalesCard);
        Assert.Equal(130m, report.ExpectedClosingAmount);
        Assert.Equal(8054, saleMovement.IdVenta);
        Assert.Equal("Venta #8054", saleMovement.Reference);
        Assert.Contains(context.AuditLogs, log => log.Accion == "CASH_X_REPORT_GENERATED");
    }

    [Fact]
    public async Task GetGeneralMovementsAsync_ShouldExposeOperationalReceiptReference()
    {
        await using var context = CreateDbContext();
        var (service, userId) = await CreateServiceAsync(context);
        var opened = await service.OpenShiftAsync(new OpenCashShiftDto(50m, string.Empty), userId, "open", "127.0.0.1");
        var sale = CreateSale(userId, opened.OpenedAtUtc.AddMilliseconds(1), 100m, idVenta: 8055);
        context.Sales.Add(sale);
        context.PaymentInstallments.Add(new AbonoPago
        {
            VentaId = sale.Id,
            IdVenta = sale.IdVenta,
            NumeroRecibo = "RECIBO-20260810-LEGACYGUID",
            MontoAbonado = 25m,
            SaldoPendienteAnterior = 75m,
            SaldoPendienteNuevo = 50m,
            FormaPago = PaymentMethods.Cash,
            UsuarioId = userId,
            FechaCreacionUtc = opened.OpenedAtUtc.AddMilliseconds(2)
        });
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var movements = await service.GetGeneralMovementsAsync();
        var installmentMovement = Assert.Single(movements, item => item.Category == "Abono");

        Assert.Equal(sale.IdVenta, installmentMovement.IdVenta);
        Assert.Contains(ReceiptReferences.Create(sale.IdVenta), installmentMovement.Reference);
        Assert.DoesNotContain("LEGACYGUID", installmentMovement.Reference);
    }

    private static async Task<(CashShiftApplicationService Service, Guid UserId)> CreateServiceAsync(PosDbContext context)
    {
        var passwordHasher = new PasswordHasherService();
        await DbInitializer.SeedAsync(context, passwordHasher);
        var userId = await context.Users.Select(user => user.Id).SingleAsync();
        var audit = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        return (new CashShiftApplicationService(context, audit), userId);
    }

    private static Venta CreateSale(
        Guid userId,
        DateTime createdAtUtc,
        decimal cashAmount,
        decimal cardAmount = 0m,
        bool isActive = true,
        string status = "Completada",
        int idVenta = 0) => new()
    {
        IdVenta = idVenta,
        NumeroFolio = $"TEST-{Guid.NewGuid():N}",
        UsuarioId = userId,
        MontoEfectivo = cashAmount,
        MontoTarjeta = cardAmount,
        Estado = status,
        EstaActivo = isActive,
        FechaCreacionUtc = createdAtUtc
    };

    private static PosDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<PosDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new PosDbContext(options);
    }
}
