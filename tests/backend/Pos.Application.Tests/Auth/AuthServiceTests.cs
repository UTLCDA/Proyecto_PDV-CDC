using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Auth.DTOs;
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
}
