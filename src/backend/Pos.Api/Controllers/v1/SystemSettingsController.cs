using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Catalog.Services;
using Pos.Application.Common.Security;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/system-settings")]
public class SystemSettingsController : ControllerBase
{
    private readonly IPricingService _pricingService;

    public SystemSettingsController(IPricingService pricingService)
    {
        _pricingService = pricingService;
    }

    [HttpGet("ecommerce-pricing")]
    [AllowAnonymous]
    public async Task<IActionResult> GetEcommercePricing(CancellationToken cancellationToken)
    {
        var percentage = await _pricingService.GetOnlineMarkupPercentageAsync(cancellationToken);
        return Ok(new
        {
            percentage,
            description = "Porcentaje de incremento aplicado a precios en tienda online para compensar comisi?n de pasarela de pago Stripe."
        });
    }

    [HttpPut("ecommerce-pricing")]
    [Authorize]
    public async Task<IActionResult> UpdateEcommercePricing([FromBody] UpdateEcommercePricingDto dto, CancellationToken cancellationToken)
    {
        if (dto.Percentage < 0 || dto.Percentage >= 100)
        {
            return BadRequest(new { message = "El porcentaje de comisi?n debe estar entre 0 y menor a 100%." });
        }

        await _pricingService.SetOnlineMarkupPercentageAsync(dto.Percentage, cancellationToken);
        return Ok(new
        {
            percentage = dto.Percentage,
            success = true,
            message = "Porcentaje de comisi?n para tienda online actualizado correctamente."
        });
    }
}

public record UpdateEcommercePricingDto(decimal Percentage);
