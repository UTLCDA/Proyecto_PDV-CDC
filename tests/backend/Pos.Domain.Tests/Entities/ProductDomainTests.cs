using Pos.Domain.Entities;
using Xunit;

namespace Pos.Domain.Tests.Entities;

public class ProductDomainTests
{
    [Fact]
    public void CalculateEffectiveUnitPrice_ShouldReturnRetailPrice_WhenQuantityIsLessThanWholesaleMin()
    {
        // Arrange
        var product = new Product
        {
            UnitPrice = 350m,
            WholesalePrice = 290m,
            WholesaleMinQuantity = 10m
        };

        // Act
        var price = product.CalculateEffectiveUnitPrice(5m, false);

        // Assert
        Assert.Equal(350m, price);
    }

    [Fact]
    public void CalculateEffectiveUnitPrice_ShouldReturnWholesalePrice_WhenQuantityIsEqualOrGreaterThanMin()
    {
        // Arrange
        var product = new Product
        {
            UnitPrice = 350m,
            WholesalePrice = 290m,
            WholesaleMinQuantity = 10m
        };

        // Act
        var price = product.CalculateEffectiveUnitPrice(12m, false);

        // Assert
        Assert.Equal(290m, price);
    }

    [Fact]
    public void CalculateEffectiveUnitPrice_ShouldReturnWholesalePrice_WhenCustomerIsWholesaleType()
    {
        // Arrange
        var product = new Product
        {
            UnitPrice = 350m,
            WholesalePrice = 290m,
            WholesaleMinQuantity = 10m
        };

        // Act
        var price = product.CalculateEffectiveUnitPrice(2m, true);

        // Assert
        Assert.Equal(290m, price);
    }
}
