using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Users.DTOs;
using Pos.Application.Users.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserApplicationService _userService;

    public UsersController(IUserApplicationService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<List<UserManagementDto>>> GetUsers(CancellationToken cancellationToken)
    {
        var users = await _userService.GetUsersAsync(cancellationToken);
        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserManagementDto>> GetUserById(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userService.GetUserByIdAsync(id, cancellationToken);
        if (user == null) return NotFound(new { message = "Usuario no encontrado." });
        return Ok(user);
    }

    [HttpPost]
    public async Task<ActionResult<UserManagementDto>> CreateUser([FromBody] CreateUserRequestDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var user = await _userService.CreateUserAsync(request, currentUserId, correlationId, ipAddress, cancellationToken);
            return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserManagementDto>> UpdateUser(Guid id, [FromBody] UpdateUserRequestDto request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var user = await _userService.UpdateUserAsync(id, request, currentUserId, correlationId, ipAddress, cancellationToken);
            return Ok(user);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
