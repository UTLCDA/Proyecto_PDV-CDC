using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Catalog.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly ICatalogApplicationService _catalogService;

    public CategoriesController(ICatalogApplicationService catalogService)
    {
        _catalogService = catalogService;
    }

    [HttpGet]
    public async Task<ActionResult<List<CategoryDto>>> GetCategories(CancellationToken cancellationToken)
    {
        var categories = await _catalogService.GetCategoriesAsync(cancellationToken);
        return Ok(categories);
    }

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> CreateCategory([FromBody] CreateCategoryDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var category = await _catalogService.CreateCategoryAsync(request, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(category);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CategoryDto>> UpdateCategory(Guid id, [FromBody] UpdateCategoryDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var category = await _catalogService.UpdateCategoryAsync(id, request, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(category);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
