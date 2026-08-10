namespace Pos.Application.Users.DTOs;

public record PermissionManagementDto(
    Guid Id,
    string Code,
    string Module,
    string Action,
    string Description
);

public record RoleManagementDto(
    Guid Id,
    string Name,
    string Description,
    bool IsActive,
    bool IsSystemRole,
    int UserCount,
    IReadOnlyList<string> PermissionCodes
);

public record CreateRoleRequestDto(
    string Name,
    string Description,
    IReadOnlyList<string> PermissionCodes
);

public record UpdateRoleRequestDto(
    string Name,
    string Description,
    bool IsActive,
    IReadOnlyList<string> PermissionCodes
);
