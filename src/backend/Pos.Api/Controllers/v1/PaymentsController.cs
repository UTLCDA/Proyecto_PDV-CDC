using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Commercial.DTOs;
using Pos.Application.Commercial.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly ICommercialOperationsService _commercialService;

    public PaymentsController(ICommercialOperationsService commercialService)
    {
        _commercialService = commercialService;
    }

    [HttpPost("installment")]
    public async Task<ActionResult<PaymentInstallmentDto>> RegisterInstallment([FromBody] CreateInstallmentDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var installment = await _commercialService.RegisterInstallmentPaymentAsync(request, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(installment);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("sale/{saleId:guid}")]
    public async Task<ActionResult<List<PaymentInstallmentDto>>> GetInstallmentsBySaleId(Guid saleId, CancellationToken cancellationToken)
    {
        var installments = await _commercialService.GetInstallmentsBySaleIdAsync(saleId, cancellationToken);
        return Ok(installments);
    }
}
