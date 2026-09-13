using Pos.Application.Common.Interfaces;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Catalog.Services;
using Pos.Application.Common.Models;
using Pos.Application.Common.Security;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = PermissionCodes.Catalog.CategoriesView)]
public class CategoriesController : ControllerBase
{
    private readonly ICatalogApplicationService _catalogService;
    private readonly ICategoryImageStorageService _imageStorageService;

    public CategoriesController(
        ICatalogApplicationService catalogService,
        ICategoryImageStorageService imageStorageService)
    {
        _catalogService = catalogService;
        _imageStorageService = imageStorageService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<CategoryDto>>> GetCategories(
        [FromQuery] string? search,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        [FromQuery] int? page = null,
        CancellationToken cancellationToken = default)
    {
        var effectivePage = page.HasValue && page.Value > 0 ? page.Value : pageNumber;
        var categories = await _catalogService.GetCategoriesAsync(
            search, cancellationToken, effectivePage, pageSize, sortBy, sortDirection);
        return Ok(categories);
    }

    [HttpPost]
    [Authorize(Policy = PermissionCodes.Catalog.CategoriesCreate)]
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
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = PermissionCodes.Catalog.CategoriesCreate)]
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
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = PermissionCodes.Catalog.CategoriesCreate)]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            await _catalogService.DeleteCategoryAsync(id, currentUserId, correlationId, ipAddress, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/image")]
    [Authorize(Policy = PermissionCodes.Catalog.CategoriesCreate)]
    public async Task<ActionResult<ProductImageResultDto>> UploadCategoryImage(Guid id, IFormFile? image, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        if (image == null || image.Length == 0)
        {
            return BadRequest(new { message = "Debe proporcionar un archivo de imagen válido." });
        }

        try
        {
            using var stream = image.OpenReadStream();
            var storageResult = await _imageStorageService.SaveCategoryImageAsync(id, stream, image.FileName, cancellationToken);
            await _catalogService.UpdateCategoryImageAsync(id, storageResult.PosUrl, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(storageResult);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new { message = "Ocurrió un error inesperado al procesar y almacenar la imagen de la categoría." });
        }
    }

    [HttpDelete("{id:guid}/image")]
    [Authorize(Policy = PermissionCodes.Catalog.CategoriesCreate)]
    public async Task<IActionResult> DeleteCategoryImage(Guid id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            await _imageStorageService.DeleteCategoryImageAsync(id, cancellationToken);
            await _catalogService.RemoveCategoryImageAsync(id, currentUserId, correlationId, ipAddress, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new { message = "Ocurrió un error inesperado al eliminar la imagen de la categoría." });
        }
    }
}
