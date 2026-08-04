using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Commercial.DTOs;
using Pos.Application.Commercial.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ReturnsController : ControllerBase
{
    private readonly ICommercialOperationsService _commercialService;

    public ReturnsController(ICommercialOperationsService commercialService)
    {
        _commercialService = commercialService;
    }

    [HttpPost]
    public async Task<ActionResult<ReturnHeaderDto>> ProcessReturn([FromBody] CreateReturnDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var returnDto = await _commercialService.ProcessReturnAsync(request, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(returnDto);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
