using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Commercial.DTOs;
using Pos.Application.Commercial.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
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
}
