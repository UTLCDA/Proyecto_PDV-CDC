using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Pos.Application.Auth.DTOs;
using Pos.Application.Commercial.DTOs;
using Pos.Application.Common.Models;
using Xunit;

namespace Pos.Api.IntegrationTests.Controllers;

public class QuotesControllerIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public QuotesControllerIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateQuote_WithAuthenticatedUser_ReturnsCreatedQuote()
    {
        // 1. Login
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequestDto("admin@lambrin.com", "Admin123!"));
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(auth);

        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // 2. Fetch products and customers
        var products = await _client.GetFromJsonAsync<PagedResult<Pos.Application.Catalog.DTOs.ProductDto>>("/api/v1/products");
        Assert.NotNull(products);
        Assert.NotEmpty(products.Items);
        var product = products.Items.First();

        var customers = await _client.GetFromJsonAsync<PagedResult<Pos.Application.Catalog.DTOs.CustomerDto>>("/api/v1/customers");
        Assert.NotNull(customers);
        Assert.NotEmpty(customers.Items);
        var customer = customers.Items.First();

        var request = new CreateQuoteDto(
            CustomerId: customer.Id,
            DiscountAmount: 0m,
            ValidityDays: 15,
            Notes: "Cotización de prueba de integración",
            Items: new List<CreateQuoteItemDto>
            {
                new(product.Id, 3m, product.UnitPrice, 0m)
            }
        );

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/quotes", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var quote = await response.Content.ReadFromJsonAsync<QuoteDto>();
        Assert.NotNull(quote);
        Assert.StartsWith("COT-", quote.QuoteNumber);
    }
}
