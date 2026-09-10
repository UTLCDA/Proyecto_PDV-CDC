using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Pos.Application.Auth.DTOs;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Common.Models;
using System.Text.Json;
using Xunit;

namespace Pos.Api.IntegrationTests.Controllers;

public class ProductsControllerIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ProductsControllerIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetProducts_ReturnsSeededLambrinProducts()
    {
        // 1. Login
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequestDto("admin@lambrin.com", "Admin123!"));
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(auth);

        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // Act
        var response = await _client.GetAsync("/api/v1/products");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var paged = await response.Content.ReadFromJsonAsync<PagedResult<ProductDto>>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(paged);
        Assert.NotEmpty(paged.Items);
        Assert.Contains(paged.Items, p => p.Sku.StartsWith("WPC-") || p.Sku.StartsWith("LAM-"));
    }

    [Fact]
    public async Task DeleteProduct_SoftDeletesProduct_AndReturnsNoContent()
    {
        // 1. Login as admin
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequestDto("admin@lambrin.com", "Admin123!"));
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(auth);

        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // 2. Get categories to get a valid CategoryId
        var catResponse = await _client.GetAsync("/api/v1/categories");
        var catPaged = await catResponse.Content.ReadFromJsonAsync<PagedResult<CategoryDto>>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(catPaged);
        Assert.NotEmpty(catPaged.Items);
        var categoryId = catPaged.Items.First().Id;

        // 3. Create a temporary product
        var createRequest = new CreateProductDto(
            Sku: $"WPC-DEL-INT-{Guid.NewGuid().ToString("N")[..6]}",
            Barcode: $"750{Random.Shared.Next(100000000, 999999999)}",
            Name: "Producto Temporal Para Baja Lógica",
            Description: "Producto creado exclusivamente para prueba de borrado lógico",
            CategoryId: categoryId,
            UnitPrice: 320m,
            UnitCost: 180m,
            WholesalePrice: 280m,
            WholesaleMinQuantity: 5m,
            UnitOfMeasure: "Pza",
            CoveragePerUnitSqM: 0.5m,
            ImageUrl: null,
            PiecesPerBox: 10,
            LengthCm: 290m,
            HeightCm: 2.4m,
            WidthCm: 16m,
            InitialInventoryQuantity: 25m,
            WidthMm: 160,
            LengthMm: 2900,
            ThicknessMm: 24,
            Material: "WPC",
            Color: "Nogal",
            IsQuoteOnly: false,
            IsTopSellerVisible: false
        );

        var createResponse = await _client.PostAsJsonAsync("/api/v1/products", createRequest);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var targetProduct = await createResponse.Content.ReadFromJsonAsync<ProductDto>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(targetProduct);
        Assert.True(targetProduct.IdProducto > 0);

        // 4. Delete product
        var deleteResponse = await _client.DeleteAsync($"/api/v1/products/{targetProduct.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // 5. Verify product no longer returned in default (active) list
        var verifyResponse = await _client.GetAsync($"/api/v1/products?search={targetProduct.Sku}");
        var verifyPaged = await verifyResponse.Content.ReadFromJsonAsync<PagedResult<ProductDto>>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(verifyPaged);
        Assert.DoesNotContain(verifyPaged.Items, p => p.Id == targetProduct.Id);

        // 6. Verify product returned when includeInactive is true
        var inactiveResponse = await _client.GetAsync($"/api/v1/products?search={targetProduct.Sku}&includeInactive=true");
        var inactivePaged = await inactiveResponse.Content.ReadFromJsonAsync<PagedResult<ProductDto>>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(inactivePaged);
        Assert.Contains(inactivePaged.Items, p => p.Id == targetProduct.Id && !p.IsActive);
    }
}
