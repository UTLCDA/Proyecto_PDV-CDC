using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Common.Security;
using Pos.Application.Users.DTOs;
using Pos.Application.Users.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Policy = PermissionCodes.Users.Administer)]
public class RolesController : ControllerBase
{
    private readonly IRoleApplicationService _roleService;

    public RolesController(IRoleApplicationService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet]
    public async Task<ActionResult<List<RoleManagementDto>>> GetRoles(CancellationToken cancellationToken)
    {
        return Ok(await _roleService.GetRolesAsync(cancellationToken));
    }

    [HttpGet("permissions")]
    public async Task<ActionResult<List<PermissionManagementDto>>> GetPermissions(CancellationToken cancellationToken)
    {
        return Ok(await _roleService.GetPermissionsAsync(cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<RoleManagementDto>> CreateRole([FromBody] CreateRoleRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var role = await _roleService.CreateRoleAsync(
                request,
                GetCurrentUserId(),
                GetCorrelationId(),
                GetIpAddress(),
                cancellationToken);
            return CreatedAtAction(nameof(GetRoles), new { id = role.Id }, role);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<RoleManagementDto>> UpdateRole(Guid id, [FromBody] UpdateRoleRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _roleService.UpdateRoleAsync(
                id,
                request,
                GetCurrentUserId(),
                GetCorrelationId(),
                GetIpAddress(),
                cancellationToken));
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
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(value, out var userId) ? userId : null;
    }

    private string GetCorrelationId() =>
        HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

    private string GetIpAddress() =>
        HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
}
