using Pos.Domain.Entities;
using Xunit;

namespace Pos.Domain.Tests.Entities;

public class StockDomainTests
{
    [Fact]
    public void AddStock_ShouldIncreaseQuantityOnHand()
    {
        // Arrange
        var stock = new Stock { QuantityOnHand = 50m };

        // Act
        stock.AddStock(25m);

        // Assert
        Assert.Equal(75m, stock.QuantityOnHand);
    }

    [Fact]
    public void DeductStock_ShouldDecreaseQuantityOnHand_WhenSufficientStockExists()
    {
        // Arrange
        var stock = new Stock { QuantityOnHand = 50m };

        // Act
        stock.DeductStock(20m);

        // Assert
        Assert.Equal(30m, stock.QuantityOnHand);
    }

    [Fact]
    public void DeductStock_ShouldThrowInvalidOperationException_WhenInsufficientStock()
    {
        // Arrange
        var stock = new Stock { QuantityOnHand = 10m };

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => stock.DeductStock(15m));
    }

    [Fact]
    public void IsLowStock_ShouldReturnTrue_WhenQuantityIsEqualOrBelowThreshold()
    {
        // Arrange
        var stock = new Stock
        {
            QuantityOnHand = 8m,
            MinimumAlertThreshold = 15m
        };

        // Act & Assert
        Assert.True(stock.IsLowStock);
        Assert.False(stock.IsOutOfStock);
    }
}
