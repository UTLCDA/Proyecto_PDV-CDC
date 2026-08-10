using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Catalog.Services;
using Pos.Application.Common.Security;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly ICatalogApplicationService _catalogService;

    public ProductsController(ICatalogApplicationService catalogService)
    {
        _catalogService = catalogService;
    }

    [HttpGet]
    [Authorize(Policy = PermissionCodes.Catalog.ProductsView)]
    public async Task<ActionResult<List<ProductDto>>> GetProducts(
        [FromQuery] string? search,
        [FromQuery] Guid? categoryId,
        [FromQuery] bool? isTopSellerOnly,
        CancellationToken cancellationToken)
    {
        var products = await _catalogService.GetProductsAsync(search, categoryId, isTopSellerOnly, cancellationToken);
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
}

public record UpdatePriceRequest(decimal UnitPrice, decimal WholesalePrice);
