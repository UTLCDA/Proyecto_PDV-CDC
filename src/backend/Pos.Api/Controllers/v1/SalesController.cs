using Pos.Domain.Entidades;
using Microsoft.EntityFrameworkCore;
using Pos.Infrastructure.Persistence;
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
    private readonly PosDbContext _dbContext;

    public SalesController(ISaleApplicationService saleService, PosDbContext dbContext)
    {
        _saleService = saleService;
        _dbContext = dbContext;
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
        if (!currentUserId.HasValue) return Unauthorized(new { message = "La sesiÃ³n no contiene un usuario vÃ¡lido." });
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
        if (!currentUserId.HasValue) return Unauthorized(new { message = "La sesiÃ³n no contiene un usuario vÃ¡lido." });

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

    /// <summary>
    /// Consulta los pedidos originados en la tienda en línea (E-Commerce) para preparación y despacho en PDV.
    /// </summary>
    [HttpGet("web-orders")]
    [Authorize(Policy = PermissionCodes.Sales.History)]
    public async Task<IActionResult> GetWebOrders(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Sales
            .AsNoTracking()
            .Include(s => s.Cliente)
            .Include(s => s.Partidas)
                .ThenInclude(p => p.Producto)
            .Where(s => s.NumeroFolio.StartsWith("WPC-") || s.Notas.Contains("[E-COMMERCE]"));

        if (!string.IsNullOrWhiteSpace(status) && status.ToLower() != "all")
        {
            var st = status.Trim().ToLower();
            query = query.Where(s => s.Estado.ToLower() == st || s.Notas.ToLower().Contains($"estado: {st}"));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s =>
                s.NumeroFolio.ToLower().Contains(term) ||
                (s.Cliente != null && (s.Cliente.Nombre.ToLower().Contains(term) || s.Cliente.Apellido.ToLower().Contains(term) || s.Cliente.Email.ToLower().Contains(term)))
            );
        }

        var totalRecords = await query.CountAsync(cancellationToken);
        var orders = await query
            .OrderByDescending(s => s.FechaCreacionUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new
            {
                id = s.Id,
                folio = s.NumeroFolio,
                estado = s.Estado,
                cliente = s.Cliente != null ? $"{s.Cliente.Nombre} {s.Cliente.Apellido}" : "Invitado",
                email = s.Cliente != null ? s.Cliente.Email : "",
                telefono = s.Cliente != null ? s.Cliente.Telefono : "",
                direccion = s.Cliente != null ? s.Cliente.Direccion : "",
                esRecoleccion = s.Notas.Contains("Recolección en Tienda"),
                total = s.MontoTotal,
                fechaCreacionUtc = s.FechaCreacionUtc,
                partidasCount = s.Partidas.Count,
                notas = s.Notas
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            totalRecords,
            page,
            pageSize,
            items = orders
        });
    }

    /// <summary>
    /// Actualiza el estado logístico de un pedido web desde el PDV (e.g. 'preparing', 'ready', 'shipped', 'delivered').
    /// </summary>
    [HttpPut("web-orders/{idOrFolio}/status")]
    [Authorize(Policy = PermissionCodes.Sales.History)]
    public async Task<IActionResult> UpdateWebOrderStatus(
        string idOrFolio,
        [FromBody] UpdateWebOrderStatusDto request,
        CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { message = "El nuevo estado es requerido." });
        }

        var isGuid = Guid.TryParse(idOrFolio, out var saleGuid);
        var sale = await _dbContext.Sales
            .FirstOrDefaultAsync(s => (isGuid && s.Id == saleGuid) || s.NumeroFolio == idOrFolio, cancellationToken);

        if (sale == null)
        {
            return NotFound(new { message = $"Pedido no encontrado: {idOrFolio}" });
        }

        var normalizedStatus = request.Status.Trim().ToLower();
        var validStatuses = new[] { "received", "paid", "preparing", "ready", "shipped", "delivered", "cancelled" };

        if (!validStatuses.Contains(normalizedStatus))
        {
            return BadRequest(new { message = $"Estado no válido. Valores admitidos: {string.Join(", ", validStatuses)}" });
        }

        var trackingInfo = !string.IsNullOrWhiteSpace(request.TrackingNumber)
            ? $" | Guía: {request.TrackingNumber} ({request.TrackingCarrier ?? "Paquetería"})"
            : "";

        sale.Notas += $" | [Estado: {normalizedStatus}{trackingInfo}]";
        sale.FechaActualizacionUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            id = sale.Id,
            folio = sale.NumeroFolio,
            newStatus = normalizedStatus,
            trackingCarrier = request.TrackingCarrier,
            trackingNumber = request.TrackingNumber,
            message = "Estado del pedido web actualizado exitosamente."
        });
    }
}

public record UpdateWebOrderStatusDto(string Status, string? TrackingCarrier, string? TrackingNumber, string? Notes);
