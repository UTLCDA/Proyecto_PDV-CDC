using Pos.Application.Common.Models;
using Pos.Application.Users.DTOs;

namespace Pos.Application.Users.Services;

public interface IUserApplicationService
{
    Task<PagedResult<UserManagementDto>> GetUsersAsync(
        string? search = null,
        int pageNumber = 1,
        int pageSize = 25,
        string? sortBy = null,
        string? sortDirection = null,
        CancellationToken cancellationToken = default);

    Task<UserManagementDto?> GetUserByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<UserManagementDto> CreateUserAsync(CreateUserRequestDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<UserManagementDto> UpdateUserAsync(Guid id, UpdateUserRequestDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
}
