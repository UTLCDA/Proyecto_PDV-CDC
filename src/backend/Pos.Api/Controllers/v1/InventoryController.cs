using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Inventory.DTOs;
using Pos.Application.Inventory.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryApplicationService _inventoryService;

    public InventoryController(IInventoryApplicationService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    public async Task<ActionResult<List<StockDto>>> GetStockLevels(
        [FromQuery] string? search,
        [FromQuery] bool? isLowStockOnly,
        CancellationToken cancellationToken)
    {
        var stocks = await _inventoryService.GetStockLevelsAsync(search, isLowStockOnly, cancellationToken);
        return Ok(stocks);
    }

    [HttpGet("product/{productId:guid}")]
    public async Task<ActionResult<StockDto>> GetStockByProductId(Guid productId, CancellationToken cancellationToken)
    {
        var stock = await _inventoryService.GetStockByProductIdAsync(productId, cancellationToken);
        if (stock == null) return NotFound(new { message = "Registro de existencia no encontrado." });
        return Ok(stock);
    }

    [HttpGet("movements")]
    public async Task<ActionResult<List<InventoryMovementDto>>> GetMovements(
        [FromQuery] Guid? productId,
        [FromQuery] string? movementType,
        CancellationToken cancellationToken)
    {
        var movements = await _inventoryService.GetMovementsAsync(productId, movementType, cancellationToken);
        return Ok(movements);
    }

    [HttpPost("movements")]
    public async Task<ActionResult<InventoryMovementDto>> RegisterMovement([FromBody] RegisterMovementDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var movement = await _inventoryService.RegisterMovementAsync(request, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(movement);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
