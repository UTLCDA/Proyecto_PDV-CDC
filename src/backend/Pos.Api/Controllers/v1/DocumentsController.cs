using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Commercial.DTOs;
using Pos.Application.Commercial.Services;
using Pos.Application.Common.Security;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = PermissionCodes.Commercial.Contracts)]
public class DocumentsController : ControllerBase
{
    private readonly ICommercialOperationsService _commercialService;

    public DocumentsController(ICommercialOperationsService commercialService)
    {
        _commercialService = commercialService;
    }

    [HttpGet("templates")]
    public async Task<ActionResult<List<DocumentTemplateDto>>> GetTemplates(CancellationToken cancellationToken)
    {
        var templates = await _commercialService.GetDocumentTemplatesAsync(cancellationToken);
        return Ok(templates);
    }

    [HttpPost("templates")]
    public async Task<ActionResult<DocumentTemplateDto>> CreateTemplate([FromBody] SaveDocumentTemplateDto request, CancellationToken cancellationToken)
    {
        var context = GetAuditContext();
        try
        {
            var template = await _commercialService.CreateDocumentTemplateAsync(request, context.UserId, context.CorrelationId, context.IpAddress, cancellationToken);
            return CreatedAtAction(nameof(GetTemplates), template);
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

    [HttpPut("templates/{id:guid}")]
    public async Task<ActionResult<DocumentTemplateDto>> UpdateTemplate(Guid id, [FromBody] SaveDocumentTemplateDto request, CancellationToken cancellationToken)
    {
        var context = GetAuditContext();
        try
        {
            return Ok(await _commercialService.UpdateDocumentTemplateAsync(id, request, context.UserId, context.CorrelationId, context.IpAddress, cancellationToken));
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

    private (Guid? UserId, string CorrelationId, string IpAddress) GetAuditContext()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return (
            Guid.TryParse(userIdClaim, out var userId) ? userId : null,
            HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString(),
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1");
    }
}
