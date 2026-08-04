using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.CashShift.DTOs;
using Pos.Application.CashShift.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/cashshifts")]
[Authorize]
public class CashShiftController : ControllerBase
{
    private readonly ICashShiftApplicationService _shiftService;

    public CashShiftController(ICashShiftApplicationService shiftService)
    {
        _shiftService = shiftService;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value
                          ?? User.FindFirst(ClaimTypes.Name)?.Value;

        if (Guid.TryParse(userIdClaim, out var userId)) return userId;
        return null;
    }

    [HttpGet("current")]
    public async Task<ActionResult<CashShiftDto>> GetCurrentShift(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var shift = await _shiftService.GetCurrentOpenShiftAsync(userId.Value, cancellationToken);
        if (shift == null) return NotFound(new { message = "No hay un turno de caja abierto." });
        return Ok(shift);
    }

    [HttpPost("open")]
    public async Task<ActionResult<CashShiftDto>> OpenShift([FromBody] OpenCashShiftDto request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var shift = await _shiftService.OpenShiftAsync(request, userId.Value, correlationId, ipAddress, cancellationToken);
            return Ok(shift);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("withdrawal")]
    public async Task<ActionResult<CashShiftDto>> RegisterWithdrawal([FromBody] CashWithdrawalDto request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var shift = await _shiftService.RegisterWithdrawalAsync(request, userId.Value, correlationId, ipAddress, cancellationToken);
            return Ok(shift);
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

    [HttpPost("close")]
    public async Task<ActionResult<CashShiftDto>> CloseShift([FromBody] CloseCashShiftDto request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var shift = await _shiftService.CloseShiftAsync(request, userId.Value, correlationId, ipAddress, cancellationToken);
            return Ok(shift);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("history")]
    public async Task<ActionResult<List<CashShiftDto>>> GetShiftHistory(CancellationToken cancellationToken)
    {
        var history = await _shiftService.GetShiftHistoryAsync(cancellationToken);
        return Ok(history);
    }
}
