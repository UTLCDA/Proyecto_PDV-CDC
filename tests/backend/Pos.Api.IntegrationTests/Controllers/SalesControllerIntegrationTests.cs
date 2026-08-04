using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Pos.Application.Auth.DTOs;
using Pos.Application.Sales.DTOs;
using Xunit;

namespace Pos.Api.IntegrationTests.Controllers;

public class SalesControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public SalesControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ProcessSale_WithAuthenticatedUser_ReturnsCreatedSale()
    {
        // 1. Login
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequestDto("admin@lambrin.com", "Admin123!"));
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(auth);

        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // 2. Fetch products
        var products = await _client.GetFromJsonAsync<List<Pos.Application.Catalog.DTOs.ProductDto>>("/api/v1/products");
        Assert.NotNull(products);
        var product = products.First();

        var request = new CreateSaleDto(
            CustomerId: null,
            PaymentType: "FullPayment",
            DiscountAmount: 0m,
            AdvanceAmount: 0m,
            CashAmount: 0m,
            CardAmount: 0m,
            TransferAmount: 0m,
            Notes: "Venta de prueba de integración WPC Bajío",
            Items: new List<CreateSaleItemDto>
            {
                new(product.Id, 2m, product.UnitPrice, 0m)
            }
        );

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/sales", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var sale = await response.Content.ReadFromJsonAsync<SaleDto>();
        Assert.NotNull(sale);
        Assert.StartsWith("VENTA-", sale.FolioNumber);
    }
}
