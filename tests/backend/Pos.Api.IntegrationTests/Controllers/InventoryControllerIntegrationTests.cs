using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Pos.Application.Auth.DTOs;
using Pos.Application.Inventory.DTOs;
using Xunit;

namespace Pos.Api.IntegrationTests.Controllers;

public class InventoryControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public InventoryControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetInventory_WithAuthenticatedUser_ReturnsStockLevels()
    {
        // 1. Login as seeded Admin
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequestDto("admin@lambrin.com", "Admin123!"));
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(auth);

        // 2. Attach JWT token
        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // 3. Request Inventory
        var response = await _client.GetAsync("/api/v1/inventory");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var stocks = await response.Content.ReadFromJsonAsync<List<StockDto>>();
        Assert.NotNull(stocks);
        Assert.NotEmpty(stocks);
    }

    [Fact]
    public async Task RegisterMovement_WithEvidence_ReturnsEvidenceAndUpdatedQuantities()
    {
        var loginResponse = await _client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequestDto("admin@lambrin.com", "Admin123!"));
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(auth);
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var stockResponse = await _client.GetAsync("/api/v1/inventory");
        var stocks = await stockResponse.Content.ReadFromJsonAsync<List<StockDto>>();
        Assert.NotNull(stocks);
        Assert.NotEmpty(stocks);

        const string evidenceImageUrl = "data:image/png;base64,dGVzdA==";
        var request = new RegisterMovementDto(
            stocks[0].ProductId,
            "Entry",
            2m,
            "Validación de evidencia física desde API",
            "TEST-EVIDENCE-001",
            InventoryDefaults.DefaultWarehouseLocation,
            evidenceImageUrl);

        var response = await _client.PostAsJsonAsync("/api/v1/inventory/movements", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var movement = await response.Content.ReadFromJsonAsync<InventoryMovementDto>();
        Assert.NotNull(movement);
        Assert.Equal(evidenceImageUrl, movement.EvidenceImageUrl);
        Assert.Equal(movement.PreviousQuantity + 2m, movement.NewQuantity);
    }
}
