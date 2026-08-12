using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Commercial.DTOs;
using Pos.Application.Commercial.Services;
using Pos.Application.Common.Security;
using Pos.Application.Sales.DTOs;
using Pos.Application.Sales.Services;
using Pos.Domain.Common;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = PermissionCodes.Commercial.Installments)]
public class PaymentsController : ControllerBase
{
    private readonly ICommercialOperationsService _commercialService;
    private readonly ISaleApplicationService _saleService;

    public PaymentsController(ICommercialOperationsService commercialService, ISaleApplicationService saleService)
    {
        _commercialService = commercialService;
        _saleService = saleService;
    }

    [HttpGet("pending-sales")]
    public async Task<ActionResult<List<SaleDto>>> GetPendingSales(CancellationToken cancellationToken)
    {
        var sales = await _saleService.GetSalesAsync(null, null, null, null, null, cancellationToken);
        return Ok(sales.Where(sale => sale.PendingBalance > 0).ToList());
    }

    [HttpPost("installment")]
    public async Task<ActionResult<PaymentInstallmentDto>> RegisterInstallment([FromBody] CreateInstallmentDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var installment = await _commercialService.RegisterInstallmentPaymentAsync(request, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(installment);
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

    [HttpGet("sale/{idVenta:int}")]
    public async Task<ActionResult<List<PaymentInstallmentDto>>> GetInstallmentsByIdVenta(int idVenta, CancellationToken cancellationToken)
    {
        var installments = await _commercialService.GetInstallmentsByIdVentaAsync(idVenta, cancellationToken);
        return Ok(installments);
    }

    [HttpGet("sale/{saleId:guid}")]
    [HttpGet("sale/by-guid/{saleId:guid}")]
    public async Task<ActionResult<List<PaymentInstallmentDto>>> GetInstallmentsBySaleId(Guid saleId, CancellationToken cancellationToken)
    {
        var installments = await _commercialService.GetInstallmentsBySaleIdAsync(saleId, cancellationToken);
        return Ok(installments);
    }

    [HttpGet("installments")]
    [Authorize(Policy = PermissionCodes.Commercial.Installments)]
    public async Task<ActionResult<List<PaymentInstallmentDto>>> GetInstallmentHistory(
        [FromQuery] string? search,
        [FromQuery] string? paymentMethod,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] DateTime? startDateUtc,
        [FromQuery] DateTime? endDateUtc,
        [FromQuery] string? customerId,
        CancellationToken cancellationToken)
    {
        try
        {
            var effectiveStart = startDate ?? startDateUtc;
            var effectiveEnd = endDate ?? endDateUtc;
            return Ok(await _commercialService.GetInstallmentHistoryAsync(search, paymentMethod, effectiveStart, effectiveEnd, customerId, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("transactions")]
    [Authorize(Policy = PermissionCodes.Commercial.Installments)]
    public async Task<ActionResult<List<PaymentTransactionDto>>> GetPaymentTransactions(
        [FromQuery] string? search,
        [FromQuery] string? paymentMethod,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] DateTime? startDateUtc,
        [FromQuery] DateTime? endDateUtc,
        [FromQuery] string? customerId,
        CancellationToken cancellationToken)
    {
        try
        {
            var effectiveStart = startDate ?? startDateUtc;
            var effectiveEnd = endDate ?? endDateUtc;
            return Ok(await _commercialService.GetPaymentTransactionsAsync(search, paymentMethod, effectiveStart, effectiveEnd, customerId, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
