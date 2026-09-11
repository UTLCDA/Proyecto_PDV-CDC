using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Catalog.Services;
using Pos.Application.Common.Interfaces;
using Pos.Application.Common.Models;
using Pos.Application.Common.Security;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly ICatalogApplicationService _catalogService;
    private readonly IProductImageStorageService _imageStorageService;

    public ProductsController(
        ICatalogApplicationService catalogService,
        IProductImageStorageService imageStorageService)
    {
        _catalogService = catalogService;
        _imageStorageService = imageStorageService;
    }

    [HttpGet]
    [Authorize(Policy = PermissionCodes.Catalog.ProductsView)]
    public async Task<ActionResult<PagedResult<ProductDto>>> GetProducts(
        [FromQuery] string? search,
        [FromQuery] Guid? categoryId,
        [FromQuery] bool? isTopSellerOnly,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        [FromQuery] int? page = null,
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var effectivePage = page.HasValue && page.Value > 0 ? page.Value : pageNumber;
        var products = await _catalogService.GetProductsAsync(
            search, categoryId, isTopSellerOnly, cancellationToken, effectivePage, pageSize, sortBy, sortDirection, includeInactive);
        return Ok(products);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = PermissionCodes.Catalog.ProductsView)]
    public async Task<ActionResult<ProductDto>> GetProductById(Guid id, CancellationToken cancellationToken)
    {
        var product = await _catalogService.GetProductByIdAsync(id, cancellationToken);
        if (product == null) return NotFound(new { message = "Producto no encontrado." });
        return Ok(product);
    }

    [HttpGet("code/{code}")]
    [Authorize(Policy = PermissionCodes.Catalog.ProductsView)]
    public async Task<ActionResult<ProductDto>> GetProductByCode(string code, CancellationToken cancellationToken)
    {
        var product = await _catalogService.GetProductByCodeAsync(code, cancellationToken);
        if (product == null) return NotFound(new { message = $"Producto no encontrado con el código '{code}'." });
        return Ok(product);
    }

    [HttpPost]
    [Authorize(Policy = PermissionCodes.Catalog.ProductsCreate)]
    public async Task<ActionResult<ProductDto>> CreateProduct([FromBody] CreateProductDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var product = await _catalogService.CreateProductAsync(request, currentUserId, correlationId, ipAddress, cancellationToken);
            return CreatedAtAction(nameof(GetProductById), new { id = product.Id }, product);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new { message = "Ocurrió un error inesperado al registrar el producto." });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = PermissionCodes.Catalog.ProductsEdit)]
    public async Task<ActionResult<ProductDto>> UpdateProduct(Guid id, [FromBody] UpdateProductDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var product = await _catalogService.UpdateProductAsync(id, request, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(product);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new { message = "Ocurrió un error inesperado al actualizar el producto." });
        }
    }

    [HttpPut("{id:guid}/price")]
    [Authorize(Policy = PermissionCodes.Catalog.ProductsEdit)]
    public async Task<ActionResult<ProductDto>> UpdatePrice(Guid id, [FromBody] UpdatePriceRequest request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var product = await _catalogService.UpdateProductPriceAsync(id, request.UnitPrice, request.WholesalePrice, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(product);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new { message = "Ocurrió un error inesperado al actualizar el precio." });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = PermissionCodes.Catalog.ProductsEdit)]
    public async Task<IActionResult> DeleteProduct(Guid id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            await _catalogService.DeleteProductAsync(id, currentUserId, correlationId, ipAddress, cancellationToken);
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
        catch (Exception)
        {
            return StatusCode(500, new { message = "Ocurrió un error inesperado al dar de baja el producto." });
        }
    }

    [HttpPost("{id:guid}/image")]
    [Authorize(Policy = PermissionCodes.Catalog.ProductsEdit)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ProductImageResultDto>> UploadProductImage(Guid id, IFormFile? image, CancellationToken cancellationToken)
    {
        if (image == null || image.Length == 0)
        {
            return BadRequest(new { message = "Debe proporcionar un archivo de imagen válido." });
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            using var stream = image.OpenReadStream();
            var storageResult = await _imageStorageService.SaveProductImageAsync(id, stream, image.FileName, cancellationToken);
            await _catalogService.UpdateProductImageAsync(id, storageResult.PosUrl, currentUserId, correlationId, ipAddress, cancellationToken);

            return Ok(storageResult);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new { message = "Ocurrió un error inesperado al procesar y almacenar la imagen." });
        }
    }

    [HttpDelete("{id:guid}/image")]
    [Authorize(Policy = PermissionCodes.Catalog.ProductsEdit)]
    public async Task<IActionResult> DeleteProductImage(Guid id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            await _catalogService.RemoveProductImageAsync(id, currentUserId, correlationId, ipAddress, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(500, new { message = "Ocurrió un error inesperado al eliminar la imagen del producto." });
        }
    }

    [HttpPost("migrate-base64-images")]
    [Authorize(Policy = PermissionCodes.Catalog.ProductsEdit)]
    public async Task<ActionResult<MigrateBase64ImagesResultDto>> MigrateBase64Images(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var result = await _catalogService.MigrateExistingBase64ImagesAsync(currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(result);
        }
        catch (Exception)
        {
            return StatusCode(500, new { message = "Ocurrió un error inesperado al ejecutar la migración de imágenes." });
        }
    }
}

public record UpdatePriceRequest(decimal UnitPrice, decimal WholesalePrice);
