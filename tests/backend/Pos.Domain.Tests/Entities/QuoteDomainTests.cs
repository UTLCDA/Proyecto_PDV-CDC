using Pos.Domain.Entities;
using Xunit;

namespace Pos.Domain.Tests.Entities;

public class QuoteDomainTests
{
    [Fact]
    public void CalculateTotals_ShouldComputeSubtotalTaxAndTotalAmount()
    {
        // Arrange
        var quote = new Quote
        {
            DiscountAmount = 100m
        };

        quote.Items.Add(new QuoteItem { Quantity = 3m, UnitPrice = 300m, TotalPrice = 900m });

        // Act
        quote.CalculateTotals(0.16m);

        // Assert
        Assert.Equal(900m, quote.SubTotal);
        Assert.Equal(144m, quote.TaxAmount); // 900 * 0.16 = 144
        Assert.Equal(944m, quote.TotalAmount); // 900 - 100 + 144 = 944
    }
}
