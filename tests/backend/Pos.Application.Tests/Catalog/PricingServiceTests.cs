using Microsoft.EntityFrameworkCore;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;
using Xunit;

namespace Pos.Application.Tests.Catalog;

public class PricingServiceTests
{
    private static PosDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<PosDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new PosDbContext(options);
    }

    [Theory]
    [InlineData(2.00, 4.88, 2.50)] // 2.00 / 0.9512 = 2.1026 -> sube a 2.50
    [InlineData(2.11, 0.00, 2.50)] // 2.11 directo -> sube a 2.50
    [InlineData(2.60, 0.00, 3.00)] // 2.60 directo -> sube a 3.00
    [InlineData(158.00, 4.88, 166.50)] // 158 / 0.9512 = 166.1059 -> sube a 166.50
    [InlineData(100.00, 5.00, 105.50)] // 100 / 0.95 = 105.263 -> sube a 105.50
    public void CalculateOnlinePrice_RoundsUpToNextHalfPeso(decimal basePrice, decimal markupPercentage, decimal expected)
    {
        using var context = CreateContext();
        var service = new PricingService(context);

        var result = service.CalculateOnlinePrice(basePrice, markupPercentage);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void CalculateOnlinePrice_WithManualPrice_RoundsUpToNextHalfPeso()
    {
        using var context = CreateContext();
        var service = new PricingService(context);

        // 2.11 manual -> 2.50
        var result1 = service.CalculateOnlinePrice(1.00m, 4.88m, 2.11m);
        Assert.Equal(2.50m, result1);

        // 2.60 manual -> 3.00
        var result2 = service.CalculateOnlinePrice(1.00m, 4.88m, 2.60m);
        Assert.Equal(3.00m, result2);

        // 170.00 manual -> 170.00
        var result3 = service.CalculateOnlinePrice(158.00m, 4.88m, 170.00m);
        Assert.Equal(170.00m, result3);
    }

    [Fact]
    public void CalculateOnlinePrice_ZeroMarkup_RoundsUpToNextHalfPeso()
    {
        using var context = CreateContext();
        var service = new PricingService(context);

        var result = service.CalculateOnlinePrice(158.00m, 0.00m);

        Assert.Equal(158.00m, result);
    }

    [Fact]
    public void CalculateOnlinePrice_InvalidMarkup_ThrowsArgumentOutOfRangeException()
    {
        using var context = CreateContext();
        var service = new PricingService(context);

        Assert.Throws<ArgumentOutOfRangeException>(() => service.CalculateOnlinePrice(158.00m, -1m));
        Assert.Throws<ArgumentOutOfRangeException>(() => service.CalculateOnlinePrice(158.00m, 100m));
        Assert.Throws<ArgumentOutOfRangeException>(() => service.CalculateOnlinePrice(158.00m, 105m));
    }

    [Fact]
    public async Task GetAndSetOnlineMarkupPercentage_UpdatesDatabaseAndReturnsNewValue()
    {
        await using var context = CreateContext();
        var service = new PricingService(context);

        var defaultPct = await service.GetOnlineMarkupPercentageAsync();
        Assert.Equal(4.88m, defaultPct);

        await service.SetOnlineMarkupPercentageAsync(5.50m);

        var updatedPct = await service.GetOnlineMarkupPercentageAsync();
        Assert.Equal(5.50m, updatedPct);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => service.SetOnlineMarkupPercentageAsync(-2m));
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => service.SetOnlineMarkupPercentageAsync(100m));
    }
}
