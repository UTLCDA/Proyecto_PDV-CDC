using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pos.Application.Auth.DTOs;
using Pos.Application.Auth.Services;

namespace Pos.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthApplicationService _authService;

    public AuthController(IAuthApplicationService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

        try
        {
            var response = await _authService.LoginAsync(request, correlationId, ipAddress, cancellationToken);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> RefreshToken([FromBody] RefreshTokenRequestDto request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

        try
        {
            var response = await _authService.RefreshTokenAsync(request, correlationId, ipAddress, cancellationToken);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequestDto request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

        await _authService.RevokeRefreshTokenAsync(request.RefreshToken, correlationId, ipAddress, cancellationToken);
        return Ok(new { message = "Sesión cerrada correctamente." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetCurrentUser(CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
            User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(new { message = "La sesión no contiene un identificador de usuario válido." });
        }

        try
        {
            return Ok(await _authService.GetCurrentUserAsync(userId, cancellationToken));
        }
        catch (KeyNotFoundException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }
}
