using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Catalog.Services;
using Pos.Application.Commercial.DTOs;
using Pos.Application.Commercial.Services;
using Pos.Application.Common.Security;
using Pos.Application.Sales.DTOs;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = PermissionCodes.Commercial.Quotes)]
public class QuotesController : ControllerBase
{
    private readonly ICommercialOperationsService _commercialService;
    private readonly ICatalogApplicationService _catalogService;

    public QuotesController(ICommercialOperationsService commercialService, ICatalogApplicationService catalogService)
    {
        _commercialService = commercialService;
        _catalogService = catalogService;
    }

    [HttpGet("options")]
    public async Task<ActionResult<QuoteOptionsDto>> GetOptions(CancellationToken cancellationToken)
    {
        var products = await _catalogService.GetProductsAsync(null, null, null, cancellationToken);
        var customers = await _catalogService.GetCustomersAsync(null, null, false, cancellationToken);
        return Ok(new QuoteOptionsDto(products.Where(product => product.IsActive).ToList(), customers));
    }

    [HttpGet]
    public async Task<ActionResult<List<QuoteDto>>> GetQuotes([FromQuery] string? search, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 500, CancellationToken cancellationToken = default)
    {
        var quotes = await _commercialService.GetQuotesAsync(search, status, cancellationToken, page, pageSize);
        return Ok(quotes);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<QuoteDto>> GetQuoteById(Guid id, CancellationToken cancellationToken)
    {
        var quote = await _commercialService.GetQuoteByIdAsync(id, cancellationToken);
        if (quote == null) return NotFound(new { message = "Cotización no encontrada." });
        return Ok(quote);
    }

    [HttpPost]
    public async Task<ActionResult<QuoteDto>> CreateQuote([FromBody] CreateQuoteDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var canApplyDiscount = User.HasClaim(PermissionCodes.ClaimType, PermissionCodes.Sales.Discount);

        try
        {
            var quote = await _commercialService.CreateQuoteAsync(request, currentUserId, correlationId, ipAddress, canApplyDiscount, cancellationToken);
            return CreatedAtAction(nameof(GetQuoteById), new { id = quote.Id }, quote);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/convert")]
    public async Task<ActionResult<SaleDto>> ConvertQuoteToSale(Guid id, [FromBody] ConvertQuoteToSaleDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var sale = await _commercialService.ConvertQuoteToSaleAsync(id, request, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(sale);
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
}
