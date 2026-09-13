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

    [Fact]
    public void CalculateOnlinePrice_Base158_Markup488_Returns16611()
    {
        using var context = CreateContext();
        var service = new PricingService(context);

        // 158 / (1 - 0.0488) = 158 / 0.9512 = 166.10597... -> 166.11
        var result = service.CalculateOnlinePrice(158.00m, 4.88m);

        Assert.Equal(166.11m, result);
    }

    [Fact]
    public void CalculateOnlinePrice_Base100_Markup5_Returns10526()
    {
        using var context = CreateContext();
        var service = new PricingService(context);

        // 100 / (1 - 0.05) = 100 / 0.95 = 105.26315... -> 105.26
        var result = service.CalculateOnlinePrice(100.00m, 5.00m);

        Assert.Equal(105.26m, result);
    }

    [Fact]
    public void CalculateOnlinePrice_WithManualPrice_OverridesCalculated()
    {
        using var context = CreateContext();
        var service = new PricingService(context);

        var result = service.CalculateOnlinePrice(158.00m, 4.88m, 170.00m);

        Assert.Equal(170.00m, result);
    }

    [Fact]
    public void CalculateOnlinePrice_ZeroMarkup_ReturnsBasePrice()
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

        // Default when empty in DB
        var defaultPct = await service.GetOnlineMarkupPercentageAsync();
        Assert.Equal(4.88m, defaultPct);

        // Set to new percentage
        await service.SetOnlineMarkupPercentageAsync(5.50m);

        var updatedPct = await service.GetOnlineMarkupPercentageAsync();
        Assert.Equal(5.50m, updatedPct);

        // Invalid percentages should throw
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => service.SetOnlineMarkupPercentageAsync(-2m));
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => service.SetOnlineMarkupPercentageAsync(100m));
    }
}
