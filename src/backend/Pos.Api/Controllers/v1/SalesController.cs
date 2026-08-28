using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Sales.DTOs;
using Pos.Application.Sales.Services;
using Pos.Application.Common.Security;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class SalesController : ControllerBase
{
    private readonly ISaleApplicationService _saleService;

    public SalesController(ISaleApplicationService saleService)
    {
        _saleService = saleService;
    }

    [HttpGet]
    [Authorize(Policy = PermissionCodes.Sales.History)]
    public async Task<ActionResult<List<SaleDto>>> GetSales(
        [FromQuery] string? search,
        [FromQuery] Guid? customerId,
        [FromQuery] string? status,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] DateTime? startDateUtc,
        [FromQuery] DateTime? endDateUtc,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 500,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var effectiveStart = startDate ?? startDateUtc;
            var effectiveEnd = endDate ?? endDateUtc;
            return Ok(await _saleService.GetSalesAsync(search, customerId, status, effectiveStart, effectiveEnd, cancellationToken, page, pageSize));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("summary")]
    [Authorize(Policy = AuthorizationPolicyNames.SalesRead)]
    public async Task<ActionResult<SalesSummaryDto>> GetSalesSummary(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] DateTime? startDateUtc,
        [FromQuery] DateTime? endDateUtc,
        CancellationToken cancellationToken)
    {
        try
        {
            var effectiveStart = startDate ?? startDateUtc;
            var effectiveEnd = endDate ?? endDateUtc;
            return Ok(await _saleService.GetSalesSummaryAsync(search, status, effectiveStart, effectiveEnd, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    [HttpGet("by-guid/{id:guid}")]
    [Authorize(Policy = PermissionCodes.Sales.History)]
    public async Task<ActionResult<SaleDto>> GetSaleById(Guid id, CancellationToken cancellationToken)
    {
        var sale = await _saleService.GetSaleByIdAsync(id, cancellationToken);
        if (sale == null) return NotFound(new { message = "Venta no encontrada." });
        return Ok(sale);
    }

    [HttpGet("{idVenta:int}")]
    [HttpGet("folio/{idVenta:int}")]
    [Authorize(Policy = PermissionCodes.Sales.History)]
    public async Task<ActionResult<SaleDto>> GetSaleByOperationalId(int idVenta, CancellationToken cancellationToken)
    {
        var sale = await _saleService.GetSaleByFolioAsync(idVenta, cancellationToken);
        if (sale == null) return NotFound(new { message = "Venta no encontrada." });
        return Ok(sale);
    }

    [HttpPost]
    [Authorize(Policy = PermissionCodes.Sales.Process)]
    public async Task<ActionResult<SaleDto>> ProcessSale([FromBody] CreateSaleDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        if (!currentUserId.HasValue) return Unauthorized(new { message = "La sesión no contiene un usuario válido." });
        var canApplyDiscount = User.HasClaim(PermissionCodes.ClaimType, PermissionCodes.Sales.Discount);
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var sale = await _saleService.ProcessSaleAsync(request, currentUserId, correlationId, ipAddress, canApplyDiscount, cancellationToken);
            return CreatedAtAction(nameof(GetSaleByOperationalId), new { idVenta = sale.IdVenta }, sale);
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

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = PermissionCodes.Sales.Cancel)]
    public async Task<ActionResult<SaleDto>> CancelSale(Guid id, [FromBody] CancelSaleDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        if (!currentUserId.HasValue) return Unauthorized(new { message = "La sesión no contiene un usuario válido." });

        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var sale = await _saleService.CancelSaleAsync(id, request.Reason, currentUserId.Value, correlationId, ipAddress, cancellationToken);
            return Ok(sale);
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
