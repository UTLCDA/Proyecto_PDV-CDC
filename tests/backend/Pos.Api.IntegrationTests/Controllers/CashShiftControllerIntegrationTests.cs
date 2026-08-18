using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Pos.Application.Auth.DTOs;
using Pos.Application.CashShift.DTOs;
using Xunit;

namespace Pos.Api.IntegrationTests.Controllers;

public class CashShiftControllerIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public CashShiftControllerIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task OpenShift_WithAuthenticatedUser_ReturnsOpenCashShift()
    {
        // 1. Login
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequestDto("admin@lambrin.com", "Admin123!"));
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(auth);

        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // 2. Open Cash Shift
        var request = new OpenCashShiftDto(1000m, "Fondo de apertura de turno");
        var response = await _client.PostAsJsonAsync("/api/v1/cashshifts/open", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var shift = await response.Content.ReadFromJsonAsync<CashShiftDto>();
        Assert.NotNull(shift);
        Assert.StartsWith("CAJA-", shift.ShiftNumber);
        Assert.Equal(1000m, shift.OpeningAmount);
    }
}
