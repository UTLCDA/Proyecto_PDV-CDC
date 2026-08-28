using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Catalog.DTOs;
using Pos.Infrastructure.Identity;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;
using Xunit;

namespace Pos.Application.Tests.Catalog;

public class CustomerApplicationTests
{
    [Fact]
    public async Task CreateCustomerAsync_ShouldNormalizeAndAuditValidCustomer()
    {
        await using var context = CreateContext();
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        var service = new CatalogApplicationService(context, new AuditLogService(context, NullLogger<AuditLogService>.Instance));

        var result = await service.CreateCustomerAsync(
            CreateRequest("  Cliente@Ejemplo.COM ", "ABCD010101ABC", "+52 477 123 4567"),
            userId,
            "customer-create",
            "127.0.0.1");

        Assert.Equal("cliente@ejemplo.com", result.Email);
        Assert.Equal("ABCD010101ABC", result.TaxId);
        Assert.Equal("+524771234567", result.Phone);
        Assert.True(result.IsActive);
        Assert.Contains(context.AuditLogs, log => log.Accion == "CUSTOMER_CREATED");
    }

    [Fact]
    public async Task CreateCustomerAsync_ShouldRejectDuplicateEmailAndTaxId()
    {
        await using var context = CreateContext();
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        var service = new CatalogApplicationService(context, new AuditLogService(context, NullLogger<AuditLogService>.Instance));
        await service.CreateCustomerAsync(CreateRequest("cliente@ejemplo.com", "ABCD010101ABC", "4771234567"), userId, "first", "127.0.0.1");

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateCustomerAsync(
            CreateRequest("CLIENTE@EJEMPLO.COM", "EFGH010101ABC", "4771234568"),
            userId,
            "duplicate-email",
            "127.0.0.1"));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateCustomerAsync(
            CreateRequest("otro@ejemplo.com", "abcd010101abc", "4771234569"),
            userId,
            "duplicate-rfc",
            "127.0.0.1"));
    }

    [Theory]
    [InlineData("RFC-INVALIDO", "4771234567")]
    [InlineData("ABCD010101ABC", "123")]
    public async Task CreateCustomerAsync_ShouldRejectInvalidFiscalOrContactData(string taxId, string phone)
    {
        await using var context = CreateContext();
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        var service = new CatalogApplicationService(context, new AuditLogService(context, NullLogger<AuditLogService>.Instance));

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateCustomerAsync(
            CreateRequest("cliente@ejemplo.com", taxId, phone),
            userId,
            "invalid-customer",
            "127.0.0.1"));
    }

    private static CreateCustomerDto CreateRequest(string email, string taxId, string phone) => new(
        "Ana",
        "Pérez",
        "Diseño Bajío",
        taxId,
        email,
        phone,
        "Av. Principal 100",
        "León",
        "Guanajuato",
        "37000",
        "Mayorista",
        5m,
        0m,
        "Cliente de prueba");

    private static PosDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<PosDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new PosDbContext(options);
    }
}
