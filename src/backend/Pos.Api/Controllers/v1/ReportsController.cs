using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    public async Task<ActionResult<SalesSummaryReportDto>> GetSalesSummary([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, CancellationToken cancellationToken)
    {
        var summary = await _reportingService.GetSalesSummaryReportAsync(startDate, endDate, cancellationToken);
        return Ok(summary);
    }

    [HttpGet("top-products")]
    public async Task<ActionResult<List<TopProductReportDto>>> GetTopProducts([FromQuery] int top = 10, CancellationToken cancellationToken = default)
    {
        var products = await _reportingService.GetTopSellingProductsReportAsync(top, cancellationToken);
        return Ok(products);
    }
}
