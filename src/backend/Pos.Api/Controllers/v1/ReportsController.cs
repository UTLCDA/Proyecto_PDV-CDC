using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Common.Security;
using Pos.Application.Reporting.DTOs;
using Pos.Application.Reporting.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportingApplicationService _reportingService;

    public ReportsController(IReportingApplicationService reportingService)
    {
        _reportingService = reportingService;
    }

    [HttpGet("sales-summary")]
    [Authorize(Policy = PermissionCodes.Reports.SalesView)]
    public async Task<ActionResult<SalesSummaryReportDto>> GetSalesSummary([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, CancellationToken cancellationToken)
    {
        try
        {
            var summary = await _reportingService.GetSalesSummaryReportAsync(startDate, endDate, cancellationToken);
            return Ok(summary);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("top-products")]
    [Authorize(Policy = PermissionCodes.Reports.SalesView)]
    public async Task<ActionResult<List<TopProductReportDto>>> GetTopProducts(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int top = 10,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var products = await _reportingService.GetTopSellingProductsReportAsync(startDate, endDate, top, cancellationToken);
            return Ok(products);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("inventory-summary")]
    [Authorize(Policy = PermissionCodes.Reports.InventoryView)]
    public async Task<ActionResult<InventorySummaryReportDto>> GetInventorySummary(CancellationToken cancellationToken)
    {
        var summary = await _reportingService.GetInventorySummaryReportAsync(cancellationToken);
        return Ok(summary);
    }
}
