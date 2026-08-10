using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.CashShift.DTOs;
using Pos.Application.CashShift.Services;
using Pos.Application.Common.Security;

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
    [Authorize(Policy = AuthorizationPolicyNames.CashShiftRead)]
    public async Task<ActionResult<CashShiftDto>> GetCurrentShift(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var shift = await _shiftService.GetCurrentOpenShiftAsync(userId.Value, cancellationToken);
        return Ok(shift);
    }

    [HttpPost("open")]
    [Authorize(Policy = PermissionCodes.Cash.Open)]
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
    [Authorize(Policy = PermissionCodes.Cash.Withdrawal)]
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

    [HttpPost("deposit")]
    [Authorize(Policy = AuthorizationPolicyNames.CashShiftRead)]
    public async Task<ActionResult<CashShiftDto>> RegisterDeposit([FromBody] CashDepositDto request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            return Ok(await _shiftService.RegisterDepositAsync(request, userId.Value, correlationId, ipAddress, cancellationToken));
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
    [Authorize(Policy = PermissionCodes.Cash.Close)]
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

    [HttpPost("x-report")]
    [Authorize(Policy = PermissionCodes.Cash.ZReport)]
    public async Task<ActionResult<CashShiftDto>> GenerateXReport(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            return Ok(await _shiftService.GenerateXReportAsync(userId.Value, correlationId, ipAddress, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("history")]
    [Authorize(Policy = PermissionCodes.Cash.ZReport)]
    public async Task<ActionResult<List<CashShiftDto>>> GetShiftHistory(CancellationToken cancellationToken)
    {
        var history = await _shiftService.GetShiftHistoryAsync(cancellationToken);
        return Ok(history);
    }

    [HttpGet("general-movements")]
    [Authorize(Policy = AuthorizationPolicyNames.CashShiftRead)]
    public async Task<ActionResult<List<CashGeneralMovementDto>>> GetGeneralMovements(CancellationToken cancellationToken)
    {
        return Ok(await _shiftService.GetGeneralMovementsAsync(cancellationToken));
    }
}
