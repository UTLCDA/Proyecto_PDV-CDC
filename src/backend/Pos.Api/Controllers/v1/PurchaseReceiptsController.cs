using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Common.Models;
using Pos.Application.Common.Security;
using Pos.Application.Inventory.DTOs;
using Pos.Application.Inventory.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/purchase-receipts")]
[Authorize]
public class PurchaseReceiptsController : ControllerBase
{
    private readonly IPurchaseReceiptApplicationService _receiptService;

    public PurchaseReceiptsController(IPurchaseReceiptApplicationService receiptService)
    {
        _receiptService = receiptService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<PurchaseReceiptDto>>> GetReceipts(
        [FromQuery] string? search,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int? page = null,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        CancellationToken cancellationToken = default)
    {
        var effectivePageNumber = page ?? pageNumber;
        var result = await _receiptService.GetReceiptsAsync(search, effectivePageNumber, pageSize, sortBy, sortDirection, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PurchaseReceiptDto>> GetReceiptById(Guid id, CancellationToken cancellationToken)
    {
        var receipt = await _receiptService.GetReceiptByIdAsync(id, cancellationToken);
        if (receipt == null)
        {
            return NotFound(new { message = "Recibo de compra no encontrado." });
        }
        return Ok(receipt);
    }

    [HttpPost]
    public async Task<ActionResult<PurchaseReceiptDto>> CreateReceipt(
        [FromBody] CreatePurchaseReceiptDto request,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var receipt = await _receiptService.CreateReceiptAsync(request, currentUserId, correlationId, ipAddress, cancellationToken);
            return CreatedAtAction(nameof(GetReceiptById), new { id = receipt.Id }, receipt);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PurchaseReceiptDto>> UpdateReceipt(
        Guid id,
        [FromBody] UpdatePurchaseReceiptDto request,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var receipt = await _receiptService.UpdateReceiptAsync(id, request, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(receipt);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}
