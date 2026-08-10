using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Catalog.DTOs;
using Pos.Application.Catalog.Services;
using Pos.Application.Common.Security;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly ICatalogApplicationService _catalogService;

    public CustomersController(ICatalogApplicationService catalogService)
    {
        _catalogService = catalogService;
    }

    [HttpGet]
    [Authorize(Policy = PermissionCodes.Customers.View)]
    public async Task<ActionResult<List<CustomerDto>>> GetCustomers([FromQuery] string? search, [FromQuery] string? type, [FromQuery] bool includeInactive, CancellationToken cancellationToken)
    {
        var canAdministerUsers = User.HasClaim(PermissionCodes.ClaimType, PermissionCodes.Users.Administer);
        var customers = await _catalogService.GetCustomersAsync(search, type, includeInactive && canAdministerUsers, cancellationToken);
        return Ok(customers);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = PermissionCodes.Customers.View)]
    public async Task<ActionResult<CustomerDto>> GetCustomerById(Guid id, CancellationToken cancellationToken)
    {
        var customer = await _catalogService.GetCustomerByIdAsync(id, cancellationToken);
        if (customer == null) return NotFound(new { message = "Cliente no encontrado." });
        return Ok(customer);
    }

    [HttpPost]
    [Authorize(Policy = PermissionCodes.Customers.Create)]
    public async Task<ActionResult<CustomerDto>> CreateCustomer([FromBody] CreateCustomerDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var customer = await _catalogService.CreateCustomerAsync(request, currentUserId, correlationId, ipAddress, cancellationToken);
            return CreatedAtAction(nameof(GetCustomerById), new { id = customer.Id }, customer);
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

    [HttpPut("{id:guid}")]
    [Authorize(Policy = PermissionCodes.Customers.Edit)]
    public async Task<ActionResult<CustomerDto>> UpdateCustomer(Guid id, [FromBody] UpdateCustomerDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var canChangeStatus = User.HasClaim(PermissionCodes.ClaimType, PermissionCodes.Users.Administer);
            var customer = await _catalogService.UpdateCustomerAsync(id, request, canChangeStatus, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(customer);
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
