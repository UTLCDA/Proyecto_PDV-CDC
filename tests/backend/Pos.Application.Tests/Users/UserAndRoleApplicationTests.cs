using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Common.Security;
using Pos.Application.Users.DTOs;
using Pos.Infrastructure.Identity;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;
using Xunit;

namespace Pos.Application.Tests.Users;

public class UserAndRoleApplicationTests
{
    [Fact]
    public async Task CreateUserAsync_ShouldRejectUnknownRoleInsteadOfAssigningFallbackRole()
    {
        await using var context = CreateDbContext();
        var passwordHasher = new PasswordHasherService();
        await DbInitializer.SeedAsync(context, passwordHasher);
        var service = new UserApplicationService(context, passwordHasher, CreateAuditService(context));

        var request = new CreateUserRequestDto(
            "operador",
            "operador@wpcbajio.com",
            "Operador123!",
            "Ana",
            "López",
            "Operadora",
            Guid.NewGuid());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateUserAsync(request, null, "user-invalid-role", "127.0.0.1"));

        Assert.Contains("rol seleccionado", exception.Message, StringComparison.OrdinalIgnoreCase);
        Assert.False(await context.Users.AnyAsync(user => user.NombreUsuario == request.Username));
    }

    [Fact]
    public async Task CreateUserAsync_ShouldAssignSelectedCashierRole()
    {
        await using var context = CreateDbContext();
        var passwordHasher = new PasswordHasherService();
        await DbInitializer.SeedAsync(context, passwordHasher);
        var cashierRole = await context.Roles.SingleAsync(role => role.Nombre == SystemRoleNames.Cashier);
        var service = new UserApplicationService(context, passwordHasher, CreateAuditService(context));

        var created = await service.CreateUserAsync(
            new CreateUserRequestDto(
                "cajera-uno",
                "cajera.uno@wpcbajio.com",
                "Cajera123!",
                "María",
                "Pérez",
                "Cajera",
                cashierRole.Id),
            null,
            "user-cashier-role",
            "127.0.0.1");

        Assert.Equal(cashierRole.Id, created.RoleId);
        Assert.Equal(SystemRoleNames.Cashier, created.RoleName);
        Assert.Equal([SystemRoleNames.Cashier], created.Roles);
        Assert.Contains(context.AuditLogs, log => log.Accion == "USER_CREATED" && log.EntidadId == created.Id.ToString());
    }

    [Fact]
    public async Task UpdateUserAsync_ShouldKeepAtLeastOneActiveAdministrator()
    {
        await using var context = CreateDbContext();
        var passwordHasher = new PasswordHasherService();
        await DbInitializer.SeedAsync(context, passwordHasher);
        var administrator = await context.Users.Include(user => user.Empleado).SingleAsync();
        var cashierRole = await context.Roles.SingleAsync(role => role.Nombre == SystemRoleNames.Cashier);
        var service = new UserApplicationService(context, passwordHasher, CreateAuditService(context));

        var request = new UpdateUserRequestDto(
            administrator.Email,
            administrator.Empleado!.Nombre,
            administrator.Empleado.Apellido,
            administrator.Empleado.Puesto,
            cashierRole.Id,
            true,
            null);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.UpdateUserAsync(administrator.Id, request, null, "last-admin", "127.0.0.1"));

        Assert.Contains("al menos un administrador activo", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateRoleAsync_ShouldPersistSelectedPermissionsAndAuditChange()
    {
        await using var context = CreateDbContext();
        var passwordHasher = new PasswordHasherService();
        await DbInitializer.SeedAsync(context, passwordHasher);
        var service = new RoleApplicationService(context, CreateAuditService(context));

        var role = await service.CreateRoleAsync(
            new CreateRoleRequestDto(
                "Supervisor de Ventas",
                "Consulta y operación controlada de ventas",
                [PermissionCodes.Sales.Process, PermissionCodes.Sales.History]),
            null,
            "create-role",
            "127.0.0.1");

        Assert.False(role.IsSystemRole);
        Assert.Equal(2, role.PermissionCodes.Count);
        Assert.Contains(PermissionCodes.Sales.Process, role.PermissionCodes);
        Assert.Contains(PermissionCodes.Sales.History, role.PermissionCodes);
        Assert.Contains(context.AuditLogs, log => log.Accion == "ROLE_CREATED" && log.EntidadId == role.Id.ToString());
    }

    [Fact]
    public async Task UpdateRoleAsync_ShouldAllowPermissionChangesForCashierRole()
    {
        await using var context = CreateDbContext();
        var passwordHasher = new PasswordHasherService();
        await DbInitializer.SeedAsync(context, passwordHasher);
        var cashier = await context.Roles.SingleAsync(role => role.Nombre == SystemRoleNames.Cashier);
        var service = new RoleApplicationService(context, CreateAuditService(context));

        var updatedRole = await service.UpdateRoleAsync(
            cashier.Id,
            new UpdateRoleRequestDto(
                cashier.Nombre,
                "Descripción actualizada de Cajero",
                true,
                [PermissionCodes.Sales.Process, PermissionCodes.Inventory.View]),
            null,
            "update-cashier",
            "127.0.0.1");

        Assert.NotNull(updatedRole);
        Assert.Equal("Descripción actualizada de Cajero", updatedRole.Description);
        Assert.Contains(PermissionCodes.Sales.Process, updatedRole.PermissionCodes);
        Assert.Contains(PermissionCodes.Inventory.View, updatedRole.PermissionCodes);
    }

    private static PosDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<PosDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new PosDbContext(options);
    }

    private static AuditLogService CreateAuditService(PosDbContext context) =>
        new(context, NullLogger<AuditLogService>.Instance);
}
