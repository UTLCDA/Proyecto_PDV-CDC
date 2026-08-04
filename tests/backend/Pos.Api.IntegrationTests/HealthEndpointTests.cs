using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Pos.Api.IntegrationTests;

public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_ReturnsOkStatusCode()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/health");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
