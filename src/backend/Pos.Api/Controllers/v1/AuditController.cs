using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Reporting.DTOs;
using Pos.Application.Reporting.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class AuditController : ControllerBase
{
    private readonly IReportingApplicationService _reportingService;

    public AuditController(IReportingApplicationService reportingService)
    {
        _reportingService = reportingService;
    }

    [HttpGet("logs")]
    public async Task<ActionResult<List<AuditLogDto>>> GetLogs(
        [FromQuery] string? correlationId,
        [FromQuery] string? user,
        [FromQuery] string? action,
        CancellationToken cancellationToken)
    {
        var logs = await _reportingService.GetAuditLogsAsync(correlationId, user, action, cancellationToken);
        return Ok(logs);
    }
}
