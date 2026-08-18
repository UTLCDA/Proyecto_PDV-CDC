using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Pos.Application.Common.Security;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Identity;
using Xunit;

namespace Pos.Api.IntegrationTests.Controllers;

public class AuthorizationControllerIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthorizationControllerIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CashierToken_AllowsPointOfSaleDependenciesAndRejectsRestrictedModules()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "JwtSettings:Secret", "LambrinPosSuperSecretKey_MustBeLongerThan32BytesForSecurity!" },
                { "JwtSettings:Issuer", "LambrinPosApi" },
                { "JwtSettings:Audience", "LambrinPosApp" }
            })
            .Build();
        var cashier = new Usuario
        {
            Id = Guid.NewGuid(),
            NombreUsuario = "cashier-authorization-test",
            Email = "cashier-authorization-test@lambrin.com",
            EstaActivo = true
        };
        var (accessToken, _) = new JwtTokenGenerator(configuration).GenerateAccessToken(
            cashier,
            ["Cajero"],
            [
                PermissionCodes.Sales.Process,
                PermissionCodes.Catalog.ProductsView,
                PermissionCodes.Customers.View
            ]);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/v1/products")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/v1/customers")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync("/api/v1/inventory")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync("/api/v1/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync("/api/v1/roles")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync("/api/v1/cashshifts/current")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync("/api/v1/reports/sales-summary")).StatusCode);
    }

    [Fact]
    public async Task CashClosePermission_ShouldReadCurrentShiftButNotOpenOne()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "JwtSettings:Secret", "LambrinPosSuperSecretKey_MustBeLongerThan32BytesForSecurity!" },
                { "JwtSettings:Issuer", "LambrinPosApi" },
                { "JwtSettings:Audience", "LambrinPosApp" }
            })
            .Build();
        var user = new Usuario
        {
            Id = Guid.NewGuid(),
            NombreUsuario = "cash-close-test",
            Email = "cash-close-test@lambrin.com",
            EstaActivo = true
        };
        var (accessToken, _) = new JwtTokenGenerator(configuration).GenerateAccessToken(
            user,
            ["Supervisor de Caja"],
            [PermissionCodes.Cash.Close]);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var currentShiftResponse = await _client.GetAsync("/api/v1/cashshifts/current");
        Assert.True(currentShiftResponse.StatusCode == HttpStatusCode.OK || currentShiftResponse.StatusCode == HttpStatusCode.NoContent);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.PostAsJsonAsync(
            "/api/v1/cashshifts/open",
            new Pos.Application.CashShift.DTOs.OpenCashShiftDto(0m, string.Empty))).StatusCode);
    }

    [Fact]
    public async Task InventoryReportPermission_ShouldNotExposeSalesOrAuditData()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "JwtSettings:Secret", "LambrinPosSuperSecretKey_MustBeLongerThan32BytesForSecurity!" },
                { "JwtSettings:Issuer", "LambrinPosApi" },
                { "JwtSettings:Audience", "LambrinPosApp" }
            })
            .Build();
        var user = new Usuario
        {
            Id = Guid.NewGuid(),
            NombreUsuario = "inventory-report-test",
            Email = "inventory-report-test@lambrin.com",
            EstaActivo = true
        };
        var (accessToken, _) = new JwtTokenGenerator(configuration).GenerateAccessToken(
            user,
            ["Analista de Inventario"],
            [PermissionCodes.Reports.InventoryView]);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/v1/reports/inventory-summary")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync("/api/v1/reports/sales-summary")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync("/api/v1/audit/logs")).StatusCode);
    }
}
