using Pos.Application.Auth.DTOs;

namespace Pos.Application.Auth.Services;

public interface IAuthApplicationService
{
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequestDto request, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task RevokeRefreshTokenAsync(string token, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
