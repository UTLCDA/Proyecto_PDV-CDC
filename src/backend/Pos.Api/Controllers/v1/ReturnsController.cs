using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Commercial.DTOs;
using Pos.Application.Commercial.Services;
using Pos.Application.Common.Models;
using Pos.Application.Common.Security;
using Pos.Application.Sales.DTOs;
using Pos.Application.Sales.Services;
using Pos.Domain.Common;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = PermissionCodes.Commercial.Returns)]
public class ReturnsController : ControllerBase
{
    private readonly ICommercialOperationsService _commercialService;
    private readonly ISaleApplicationService _saleService;

    public ReturnsController(ICommercialOperationsService commercialService, ISaleApplicationService saleService)
    {
        _commercialService = commercialService;
        _saleService = saleService;
    }

    [HttpGet("eligible-sales")]
    public async Task<ActionResult<List<SaleDto>>> GetEligibleSales(CancellationToken cancellationToken)
    {
        var sales = await _saleService.GetSalesAsync(null, null, null, null, null, cancellationToken);
        return Ok(sales.Items.Where(sale => sale.Status is SaleStatuses.Completed or SaleStatuses.DepositPaid or SaleStatuses.PartiallyReturned).ToList());
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<ReturnHeaderDto>>> GetReturns(
        [FromQuery] int? idVenta,
        [FromQuery] Guid? saleId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int? page = null,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        CancellationToken cancellationToken = default)
    {
        var effectivePageNumber = page ?? pageNumber;
        return Ok(await _commercialService.GetReturnsAsync(idVenta, saleId, effectivePageNumber, pageSize, sortBy, sortDirection, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<ReturnHeaderDto>> ProcessReturn([FromBody] CreateReturnDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var returnDto = await _commercialService.ProcessReturnAsync(request, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(returnDto);
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
