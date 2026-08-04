namespace Pos.Application.Users.DTOs;

public record UserManagementDto(
    Guid Id,
    string Username,
    string Email,
    string FirstName,
    string LastName,
    string FullName,
    string JobTitle,
    bool IsActive,
    List<string> Roles,
    DateTime CreatedAtUtc
);

public record CreateUserRequestDto(
    string Username,
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string JobTitle,
    string RoleName
);

public record UpdateUserRequestDto(
    string Email,
    string FirstName,
    string LastName,
    string JobTitle,
    string RoleName,
    bool IsActive,
    string? NewPassword
);
