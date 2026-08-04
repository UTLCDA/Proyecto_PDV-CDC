namespace Pos.Application.Auth.DTOs;

public record LoginRequestDto(string EmailOrUsername, string Password);
public record RefreshTokenRequestDto(string AccessToken, string RefreshToken);
public record AuthResponseDto(string AccessToken, string RefreshToken, DateTime ExpiresAtUtc, UserDto User);
public record UserDto(Guid Id, string Username, string Email, string FullName, List<string> Roles, List<string> Permissions);
