using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Pos.Application.Auth.DTOs;
using Pos.Application.Sales.DTOs;
using Pos.Domain.Common;
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

        // Open cash shift for testing if not already open
        await _client.PostAsJsonAsync("/api/v1/cashshifts/open", new Pos.Application.CashShift.DTOs.OpenCashShiftDto(1000m, "Apertura de prueba"));

        // 2. Fetch products
        var products = await _client.GetFromJsonAsync<List<Pos.Application.Catalog.DTOs.ProductDto>>("/api/v1/products");
        Assert.NotNull(products);
        var product = products.First(item => item.AvailableQuantity >= 1m && !item.IsQuoteOnly);
        var expectedSubtotal = product.UnitPrice;
        var expectedTotal = expectedSubtotal + Math.Round(expectedSubtotal * 0.16m, 2);

        var request = new CreateSaleDto(
            CustomerId: null,
            PaymentType: SalePaymentTypes.FullPayment,
            DiscountAmount: 0m,
            AdvanceAmount: 0m,
            CashAmount: expectedTotal,
            CardAmount: 0m,
            TransferAmount: 0m,
            Notes: "Venta de prueba de integración WPC Bajío",
            Items: new List<CreateSaleItemDto>
            {
                new(product.Id, 1m, 0.01m, 0m)
            }
        );

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/sales", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var sale = await response.Content.ReadFromJsonAsync<SaleDto>();
        Assert.NotNull(sale);
        Assert.StartsWith("VENTA-", sale.FolioNumber);
        Assert.Equal(product.UnitPrice, sale.Items.Single().UnitPrice);
        Assert.Equal(expectedTotal, sale.TotalAmount);
    }
}
