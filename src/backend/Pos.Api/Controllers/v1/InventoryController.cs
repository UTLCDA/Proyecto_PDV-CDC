using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Common.Models;
using Pos.Application.Inventory.DTOs;
using Pos.Application.Inventory.Services;
using Pos.Application.Common.Security;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = PermissionCodes.Inventory.View)]
public class InventoryController : ControllerBase
{
    private readonly IInventoryApplicationService _inventoryService;

    public InventoryController(IInventoryApplicationService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<StockDto>>> GetStockLevels(
        [FromQuery] string? search,
        [FromQuery] bool? isLowStockOnly,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int? page = null,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        CancellationToken cancellationToken = default)
    {
        var effectivePageNumber = page ?? pageNumber;
        var stocks = await _inventoryService.GetStockLevelsAsync(search, isLowStockOnly, effectivePageNumber, pageSize, sortBy, sortDirection, cancellationToken);
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
    [Authorize(Policy = PermissionCodes.Users.Administer)]
    public async Task<ActionResult<PagedResult<InventoryMovementDto>>> GetMovements(
        [FromQuery] Guid? productId,
        [FromQuery] string? movementType,
        [FromQuery] string? search,
        [FromQuery] DateTime? startDateUtc,
        [FromQuery] DateTime? endDateUtc,
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
            var movements = await _inventoryService.GetMovementsAsync(productId, movementType, search, startDateUtc, endDateUtc, effectivePageNumber, pageSize, sortBy, sortDirection, cancellationToken);
            return Ok(movements);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("movements")]
    [Authorize(Policy = PermissionCodes.Inventory.Movements)]
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
