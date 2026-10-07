using System.Net;
using Xunit;

namespace Pos.Api.IntegrationTests;

public class CorsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public CorsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Theory]
    [InlineData("https://pos-wpcbajio.aaronarenasmartinez.workers.dev")]
    [InlineData("https://wpcbajio.com")]
    [InlineData("https://admin.wpcbajio.com")]
    [InlineData("https://preview.aaronarenasmartinez.workers.dev")]
    [InlineData("https://custom.aaronarenasmartinez.pages.dev")]
    public async Task PreflightOptions_AuthorizedOrigin_ReturnsCorsHeaders(string origin)
    {
        // Arrange
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/v1/health");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "GET");

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.True(response.StatusCode == HttpStatusCode.NoContent || response.StatusCode == HttpStatusCode.OK);
        Assert.True(response.Headers.Contains("Access-Control-Allow-Origin"));
        Assert.Equal(origin, response.Headers.GetValues("Access-Control-Allow-Origin").First());
        Assert.True(response.Headers.Contains("Access-Control-Allow-Credentials"));
        Assert.Equal("true", response.Headers.GetValues("Access-Control-Allow-Credentials").First());
    }

    [Fact]
    public async Task PreflightOptions_UnauthorizedOrigin_DoesNotReturnCorsHeaders()
    {
        // Arrange
        const string unauthorizedOrigin = "https://malicious-attacker.workers.dev";
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/v1/health");
        request.Headers.Add("Origin", unauthorizedOrigin);
        request.Headers.Add("Access-Control-Request-Method", "GET");

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task GetEndpoint_AuthorizedWorkerOrigin_IncludesCorsHeaders()
    {
        // Arrange
        const string origin = "https://pos-wpcbajio.aaronarenasmartinez.workers.dev";
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/health");
        request.Headers.Add("Origin", origin);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.Contains("Access-Control-Allow-Origin"));
        Assert.Equal(origin, response.Headers.GetValues("Access-Control-Allow-Origin").First());
    }
}
