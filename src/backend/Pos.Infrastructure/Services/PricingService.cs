using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Pos.Application.Catalog.Services;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class PricingService : IPricingService
{
    private const string SettingKey = "PORCENTAJE_AJUSTE_PRECIO_ONLINE";
    private const decimal DefaultPercentage = 4.88m;
    private readonly PosDbContext _context;

    public PricingService(PosDbContext context)
    {
        _context = context;
    }

    public async Task<decimal> GetOnlineMarkupPercentageAsync(CancellationToken cancellationToken = default)
    {
        var setting = await _context.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Clave == SettingKey, cancellationToken);

        if (setting != null && decimal.TryParse(setting.Valor, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsedVal))
        {
            return parsedVal;
        }

        return DefaultPercentage;
    }

    public async Task SetOnlineMarkupPercentageAsync(decimal percentage, CancellationToken cancellationToken = default)
    {
        if (percentage < 0m || percentage >= 100m)
        {
            throw new ArgumentOutOfRangeException(nameof(percentage), "El porcentaje de comisi?n debe estar entre 0 y menor a 100.");
        }

        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Clave == SettingKey, cancellationToken);

        if (setting == null)
        {
            setting = new ConfiguracionSistema
            {
                Clave = SettingKey,
                Valor = percentage.ToString("0.##", CultureInfo.InvariantCulture),
                Descripcion = "Porcentaje de incremento aplicado a precios en tienda online para compensar comisi?n de pasarela de pago Stripe.",
                FechaModificacionUtc = DateTime.UtcNow
            };
            _context.SystemSettings.Add(setting);
        }
        else
        {
            setting.Valor = percentage.ToString("0.##", CultureInfo.InvariantCulture);
            setting.FechaModificacionUtc = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public decimal CalculateOnlinePrice(decimal basePrice, decimal markupPercentage, decimal? manualOnlinePrice = null)
    {
        if (manualOnlinePrice.HasValue && manualOnlinePrice.Value > 0)
        {
            return Math.Round(manualOnlinePrice.Value, 0, MidpointRounding.AwayFromZero);
        }

        if (basePrice <= 0)
        {
            return 0m;
        }

        if (markupPercentage < 0m || markupPercentage >= 100m)
        {
            throw new ArgumentOutOfRangeException(nameof(markupPercentage), "El porcentaje de comisi?n debe estar entre 0 y menor a 100.");
        }

        if (markupPercentage == 0m)
        {
            return Math.Round(basePrice, 0, MidpointRounding.AwayFromZero);
        }

        decimal rate = markupPercentage / 100m;
        decimal divisor = 1m - rate;
        if (divisor <= 0) return Math.Round(basePrice, 0, MidpointRounding.AwayFromZero);

        decimal calculatedPrice = basePrice / divisor;
        return Math.Round(calculatedPrice, 0, MidpointRounding.AwayFromZero);
    }
}
