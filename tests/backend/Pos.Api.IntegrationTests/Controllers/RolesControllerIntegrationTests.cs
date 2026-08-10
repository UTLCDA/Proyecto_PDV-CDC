using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Pos.Application.Auth.DTOs;
using Pos.Application.Users.DTOs;
using Xunit;

namespace Pos.Api.IntegrationTests.Controllers;

public class RolesControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public RolesControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Administrator_ShouldListRolesAndPermissionCatalog()
    {
        var loginResponse = await _client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequestDto("admin@lambrin.com", "Admin123!"));
        loginResponse.EnsureSuccessStatusCode();
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(auth);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var rolesResponse = await _client.GetAsync("/api/v1/roles");
        var permissionsResponse = await _client.GetAsync("/api/v1/roles/permissions");

        Assert.Equal(HttpStatusCode.OK, rolesResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, permissionsResponse.StatusCode);
        var roles = await rolesResponse.Content.ReadFromJsonAsync<List<RoleManagementDto>>();
        var permissions = await permissionsResponse.Content.ReadFromJsonAsync<List<PermissionManagementDto>>();
        Assert.Contains(roles!, role => role.Name == "Administrador" && role.IsSystemRole);
        Assert.Contains(roles!, role => role.Name == "Cajero" && role.IsSystemRole);
        Assert.NotEmpty(permissions!);
    }
}
