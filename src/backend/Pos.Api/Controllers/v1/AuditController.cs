using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Common.Models;
using Pos.Application.Common.Security;
using Pos.Application.Reporting.DTOs;
using Pos.Application.Reporting.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = PermissionCodes.Users.Administer)]
public class AuditController : ControllerBase
{
    private readonly IReportingApplicationService _reportingService;

    public AuditController(IReportingApplicationService reportingService)
    {
        _reportingService = reportingService;
    }

    [HttpGet("logs")]
    public async Task<ActionResult<PagedResult<AuditLogDto>>> GetLogs(
        [FromQuery] string? correlationId,
        [FromQuery] string? user,
        [FromQuery] string? action,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? idVenta,
        [FromQuery] string? module,
        [FromQuery] string? eventType,
        [FromQuery] string? resultStatus,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int? page = null,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var effectivePageNumber = page ?? pageNumber;
            var logs = await _reportingService.GetAuditLogsAsync(
                correlationId, user, action, startDate, endDate, idVenta, module, eventType, resultStatus, effectivePageNumber, pageSize, sortBy, sortDirection, cancellationToken);
            return Ok(logs);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
