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
    Guid RoleId,
    string RoleName,
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
    Guid RoleId
);

public record UpdateUserRequestDto(
    string Email,
    string FirstName,
    string LastName,
    string JobTitle,
    Guid RoleId,
    bool IsActive,
    string? NewPassword
);
