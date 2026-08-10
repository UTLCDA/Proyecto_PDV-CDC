using Pos.Application.Users.DTOs;

namespace Pos.Application.Users.Services;

public interface IRoleApplicationService
{
    Task<List<RoleManagementDto>> GetRolesAsync(CancellationToken cancellationToken = default);
    Task<List<PermissionManagementDto>> GetPermissionsAsync(CancellationToken cancellationToken = default);
    Task<RoleManagementDto> CreateRoleAsync(CreateRoleRequestDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<RoleManagementDto> UpdateRoleAsync(Guid id, UpdateRoleRequestDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
}
