using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Auth.DTOs;
using Pos.Application.Common.Security;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Identity;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;
using Xunit;

namespace Pos.Application.Tests.Auth;

public class AuthServiceTests
{
    private PosDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<PosDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new PosDbContext(options);
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnAuthResponse_WhenCredentialsAreValid()
    {
        // Arrange
        var context = GetInMemoryDbContext();
        var passwordHasher = new PasswordHasherService();

        var inMemoryConfig = new Dictionary<string, string?>
        {
            {"JwtSettings:Secret", "LambrinPosSuperSecretKey_MustBeLongerThan32BytesForSecurity!"},
            {"JwtSettings:Issuer", "LambrinPosApi"},
            {"JwtSettings:Audience", "LambrinPosApp"}
        };

        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemoryConfig)
            .Build();

        var jwtGenerator = new JwtTokenGenerator(config);
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);

        await DbInitializer.SeedAsync(context, passwordHasher);

        var authService = new AuthApplicationService(context, passwordHasher, jwtGenerator, auditService);
        var loginRequest = new LoginRequestDto("admin@lambrin.com", "Admin123!");

        // Act
        var response = await authService.LoginAsync(loginRequest, "test-corr-id", "127.0.0.1");

        // Assert
        Assert.NotNull(response);
        Assert.NotEmpty(response.AccessToken);
        Assert.NotEmpty(response.RefreshToken);
        Assert.Equal("admin@lambrin.com", response.User.Email);
        Assert.Contains("Administrador", response.User.Roles);
    }

    [Fact]
    public async Task LoginAsync_ShouldThrowUnauthorizedAccessException_WhenPasswordIsInvalid()
    {
        // Arrange
        var context = GetInMemoryDbContext();
        var passwordHasher = new PasswordHasherService();

        var inMemoryConfig = new Dictionary<string, string?>
        {
            {"JwtSettings:Secret", "LambrinPosSuperSecretKey_MustBeLongerThan32BytesForSecurity!"}
        };

        IConfiguration config = new ConfigurationBuilder().AddInMemoryCollection(inMemoryConfig).Build();
        var jwtGenerator = new JwtTokenGenerator(config);
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);

        await DbInitializer.SeedAsync(context, passwordHasher);
        var authService = new AuthApplicationService(context, passwordHasher, jwtGenerator, auditService);

        var loginRequest = new LoginRequestDto("admin@lambrin.com", "WrongPassword!");

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            authService.LoginAsync(loginRequest, "test-corr-id", "127.0.0.1"));
    }

    [Fact]
    public async Task LoginAsync_CashierShouldReceiveOnlyPointOfSalePermissions()
    {
        var context = GetInMemoryDbContext();
        var passwordHasher = new PasswordHasherService();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "JwtSettings:Secret", "LambrinPosSuperSecretKey_MustBeLongerThan32BytesForSecurity!" },
                { "JwtSettings:Issuer", "LambrinPosApi" },
                { "JwtSettings:Audience", "LambrinPosApp" }
            })
            .Build();

        await DbInitializer.SeedAsync(context, passwordHasher);
        var cashierRole = await context.Roles.SingleAsync(role => role.Nombre == "Cajero");
        var cashier = new Usuario
        {
            NombreUsuario = "cajero-prueba",
            Email = "cajero-prueba@lambrin.com",
            PasswordHash = passwordHasher.HashPassword("Cashier123!"),
            EstaActivo = true
        };
        context.Users.Add(cashier);
        context.UserRoles.Add(new UsuarioRol { Usuario = cashier, Rol = cashierRole });
        await context.SaveChangesAsync();

        var authService = new AuthApplicationService(
            context,
            passwordHasher,
            new JwtTokenGenerator(config),
            new AuditLogService(context, NullLogger<AuditLogService>.Instance));

        var response = await authService.LoginAsync(
            new LoginRequestDto(cashier.Email, "Cashier123!"),
            "cashier-permissions-test",
            "127.0.0.1");

        Assert.Contains("Cajero", response.User.Roles);
        Assert.Equal(
            new[]
            {
                PermissionCodes.Catalog.ProductsView,
                PermissionCodes.Customers.Create,
                PermissionCodes.Customers.View,
                PermissionCodes.Sales.Process
            },
            response.User.Permissions.OrderBy(permission => permission));
    }
}
