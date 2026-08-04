using Pos.Domain.Entities;
using Xunit;

namespace Pos.Domain.Tests.Entities;

public class CashShiftDomainTests
{
    [Fact]
    public void CloseShift_ShouldCalculateExpectedAndDifferenceAmounts()
    {
        // Arrange
        var shift = new CashShift
        {
            OpeningAmount = 1000m,
            TotalSalesCash = 2500m,
            TotalWithdrawals = 500m
        };

        // Act
        shift.CloseShift(2980m); // Actual count: $2980. Expected: 1000 + 2500 - 500 = 3000. Difference = -20 (Faltante)

        // Assert
        Assert.Equal(3000m, shift.ExpectedClosingAmount);
        Assert.Equal(2980m, shift.ActualClosingAmount);
        Assert.Equal(-20m, shift.DifferenceAmount);
        Assert.Equal("Closed", shift.Status);
    }
}
