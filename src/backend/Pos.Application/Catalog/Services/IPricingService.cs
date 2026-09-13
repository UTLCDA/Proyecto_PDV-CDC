namespace Pos.Application.Catalog.Services;

public interface IPricingService
{
    Task<decimal> GetOnlineMarkupPercentageAsync(CancellationToken cancellationToken = default);
    Task SetOnlineMarkupPercentageAsync(decimal percentage, CancellationToken cancellationToken = default);
    decimal CalculateOnlinePrice(decimal basePrice, decimal markupPercentage, decimal? manualOnlinePrice = null);
}
