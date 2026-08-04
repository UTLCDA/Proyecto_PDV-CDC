using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Sales.DTOs;
using Pos.Application.Sales.Services;

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
    public async Task<ActionResult<List<SaleDto>>> GetSales(
        [FromQuery] string? search,
        [FromQuery] Guid? customerId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var sales = await _saleService.GetSalesAsync(search, customerId, status, cancellationToken);
        return Ok(sales);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SaleDto>> GetSaleById(Guid id, CancellationToken cancellationToken)
    {
        var sale = await _saleService.GetSaleByIdAsync(id, cancellationToken);
        if (sale == null) return NotFound(new { message = "Venta no encontrada." });
        return Ok(sale);
    }

    [HttpPost]
    public async Task<ActionResult<SaleDto>> ProcessSale([FromBody] CreateSaleDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var sale = await _saleService.ProcessSaleAsync(request, currentUserId, correlationId, ipAddress, cancellationToken);
            return CreatedAtAction(nameof(GetSaleById), new { id = sale.Id }, sale);
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
