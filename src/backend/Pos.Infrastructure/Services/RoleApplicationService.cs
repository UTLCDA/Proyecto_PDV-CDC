using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pos.Application.Common.Interfaces;
using Pos.Application.Common.Security;
using Pos.Application.Users.DTOs;
using Pos.Application.Users.Services;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class RoleApplicationService : IRoleApplicationService
{
    private static readonly IReadOnlySet<string> CashierPermissionCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        PermissionCodes.Sales.Process,
        PermissionCodes.Catalog.ProductsView,
        PermissionCodes.Customers.View
    };

    private readonly PosDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    public RoleApplicationService(PosDbContext dbContext, IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    public async Task<List<RoleManagementDto>> GetRolesAsync(CancellationToken cancellationToken = default)
    {
        var roles = await _dbContext.Roles
            .AsNoTracking()
            .Include(role => role.RolPermisos)
                .ThenInclude(rolePermission => rolePermission.Permiso)
            .Include(role => role.UsuarioRoles)
                .ThenInclude(userRole => userRole.Usuario)
            .OrderBy(role => role.Nombre)
            .ToListAsync(cancellationToken);

        return roles.Select(MapRoleToDto).ToList();
    }

    public async Task<List<PermissionManagementDto>> GetPermissionsAsync(CancellationToken cancellationToken = default)
    {
        var permissions = await _dbContext.Permissions
            .AsNoTracking()
            .Where(permission => permission.EstaActivo)
            .OrderBy(permission => permission.Modulo)
            .ThenBy(permission => permission.Accion)
            .ToListAsync(cancellationToken);

        return permissions.Select(permission => new PermissionManagementDto(
                permission.Id,
                permission.ClavePermiso,
                permission.Modulo,
                permission.Accion,
                permission.Descripcion))
            .ToList();
    }

    public async Task<RoleManagementDto> CreateRoleAsync(
        CreateRoleRequestDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        var roleName = ValidateRoleName(request.Name);
        if (SystemRoleNames.IsSystemRole(roleName))
        {
            throw new InvalidOperationException("El nombre corresponde a un rol protegido del sistema.");
        }

        await EnsureUniqueRoleNameAsync(roleName, null, cancellationToken);
        var permissions = await ResolvePermissionsAsync(request.PermissionCodes, cancellationToken);

        var role = new Rol
        {
            Nombre = roleName,
            Descripcion = ValidateDescription(request.Description),
            EstaActivo = true
        };

        _dbContext.Roles.Add(role);
        foreach (var permission in permissions)
        {
            _dbContext.RolePermissions.Add(new RolPermiso { Rol = role, Permiso = permission });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "ROLE_CREATED",
            "Rol",
            role.Id.ToString(),
            null,
            JsonSerializer.Serialize(new
            {
                role.Nombre,
                role.Descripcion,
                Permissions = permissions.Select(permission => permission.ClavePermiso).OrderBy(code => code)
            }),
            ipAddress,
            $"Rol creado: {role.Nombre}",
            module: "Roles",
            eventType: "ROLE_CREATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return await GetRoleByIdAsync(role.Id, cancellationToken);
    }

    public async Task<RoleManagementDto> UpdateRoleAsync(
        Guid id,
        UpdateRoleRequestDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        var role = await _dbContext.Roles
            .Include(item => item.RolPermisos)
                .ThenInclude(rolePermission => rolePermission.Permiso)
            .Include(item => item.UsuarioRoles)
                .ThenInclude(userRole => userRole.Usuario)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"Rol con ID '{id}' no encontrado.");

        var requestedName = ValidateRoleName(request.Name);
        var description = ValidateDescription(request.Description);
        var permissions = await ResolvePermissionsAsync(request.PermissionCodes, cancellationToken);
        var requestedCodes = permissions.Select(permission => permission.ClavePermiso).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var isAdminRole = string.Equals(role.Nombre, SystemRoleNames.Administrator, StringComparison.OrdinalIgnoreCase);

        if (isAdminRole)
        {
            if (!string.Equals(requestedName, role.Nombre, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("El nombre del rol Administrador no se puede modificar.");
            }
            if (!request.IsActive)
            {
                throw new InvalidOperationException("El rol Administrador debe permanecer activo en el sistema.");
            }
        }
        else
        {
            if (string.Equals(role.Nombre, SystemRoleNames.Cashier, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(requestedName, role.Nombre, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("El nombre del rol Cajero no se puede modificar.");
            }

            if (SystemRoleNames.IsSystemRole(requestedName) && !string.Equals(requestedName, role.Nombre, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("El nombre corresponde a un rol protegido del sistema.");
            }

            if (!string.Equals(requestedName, role.Nombre, StringComparison.OrdinalIgnoreCase))
            {
                await EnsureUniqueRoleNameAsync(requestedName, role.Id, cancellationToken);
            }

            if (!request.IsActive && role.UsuarioRoles.Any(userRole => userRole.Usuario.EstaActivo))
            {
                var activeUserCount = role.UsuarioRoles.Count(userRole => userRole.Usuario.EstaActivo);
                throw new InvalidOperationException($"No se puede desactivar el rol '{role.Nombre}' porque tiene {activeUserCount} usuario(s) activo(s) asignado(s). Reasigne los usuarios a otro rol primero.");
            }
        }

        var oldValues = JsonSerializer.Serialize(new
        {
            role.Nombre,
            role.Descripcion,
            role.EstaActivo,
            Permissions = role.RolPermisos.Select(item => item.Permiso.ClavePermiso).OrderBy(code => code)
        });
        var previousCodes = role.RolPermisos.Select(item => item.Permiso.ClavePermiso).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var securityChanged = !previousCodes.SetEquals(requestedCodes) || role.EstaActivo != request.IsActive;

        role.Nombre = (isAdminRole || string.Equals(role.Nombre, SystemRoleNames.Cashier, StringComparison.OrdinalIgnoreCase)) ? role.Nombre : requestedName;
        role.Descripcion = description;
        role.EstaActivo = isAdminRole ? true : request.IsActive;
        role.FechaActualizacionUtc = DateTime.UtcNow;

        if (!previousCodes.SetEquals(requestedCodes))
        {
            _dbContext.RolePermissions.RemoveRange(role.RolPermisos);
            foreach (var permission in permissions)
            {
                _dbContext.RolePermissions.Add(new RolPermiso { RolId = role.Id, PermisoId = permission.Id });
            }
        }

        if (securityChanged)
        {
            var userIds = role.UsuarioRoles.Select(userRole => userRole.UsuarioId).ToList();
            var activeRefreshTokens = await _dbContext.RefreshTokens
                .Where(token => userIds.Contains(token.UsuarioId) && !token.EsRevocado)
                .ToListAsync(cancellationToken);
            foreach (var token in activeRefreshTokens)
            {
                token.EsRevocado = true;
                token.FechaActualizacionUtc = DateTime.UtcNow;
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "ROLE_UPDATED",
            "Rol",
            role.Id.ToString(),
            oldValues,
            JsonSerializer.Serialize(new
            {
                role.Nombre,
                role.Descripcion,
                role.EstaActivo,
                Permissions = requestedCodes.OrderBy(code => code)
            }),
            ipAddress,
            $"Rol actualizado: {role.Nombre}",
            module: "Roles",
            eventType: "ROLE_UPDATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return await GetRoleByIdAsync(role.Id, cancellationToken);
    }

    private async Task<RoleManagementDto> GetRoleByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var role = await _dbContext.Roles
            .AsNoTracking()
            .Include(item => item.RolPermisos)
                .ThenInclude(rolePermission => rolePermission.Permiso)
            .Include(item => item.UsuarioRoles)
                .ThenInclude(userRole => userRole.Usuario)
            .SingleAsync(item => item.Id == id, cancellationToken);

        return MapRoleToDto(role);
    }

    private async Task<List<Permiso>> ResolvePermissionsAsync(IReadOnlyList<string>? requestedCodes, CancellationToken cancellationToken)
    {
        var normalizedCodes = (requestedCodes ?? [])
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code.Trim().ToLowerInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalizedCodes.Count == 0)
        {
            throw new InvalidOperationException("Seleccione al menos un permiso para el rol.");
        }

        var activePermissions = await _dbContext.Permissions
            .Where(permission => permission.EstaActivo)
            .ToListAsync(cancellationToken);
        var permissions = activePermissions
            .Where(permission => normalizedCodes.Contains(permission.ClavePermiso, StringComparer.OrdinalIgnoreCase))
            .ToList();

        var resolvedCodes = permissions.Select(permission => permission.ClavePermiso).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var unknownCodes = normalizedCodes.Where(code => !resolvedCodes.Contains(code)).ToList();
        if (unknownCodes.Count > 0)
        {
            throw new InvalidOperationException($"Permisos no reconocidos: {string.Join(", ", unknownCodes)}.");
        }

        return permissions;
    }

    private async Task EnsureUniqueRoleNameAsync(string roleName, Guid? excludedRoleId, CancellationToken cancellationToken)
    {
        var normalizedName = roleName.ToLowerInvariant();
        var exists = await _dbContext.Roles.AnyAsync(
            role => role.Nombre.ToLower() == normalizedName && (!excludedRoleId.HasValue || role.Id != excludedRoleId.Value),
            cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException("Ya existe un rol con ese nombre.");
        }
    }

    private static string ValidateRoleName(string? roleName)
    {
        var normalizedName = roleName?.Trim() ?? string.Empty;
        if (normalizedName.Length is < 2 or > 80)
        {
            throw new InvalidOperationException("El nombre del rol debe contener entre 2 y 80 caracteres.");
        }

        return normalizedName;
    }

    private static string ValidateDescription(string? description)
    {
        var normalizedDescription = description?.Trim() ?? string.Empty;
        if (normalizedDescription.Length > 250)
        {
            throw new InvalidOperationException("La descripción del rol no puede exceder 250 caracteres.");
        }

        return normalizedDescription;
    }

    private static RoleManagementDto MapRoleToDto(Rol role) => new(
        role.Id,
        role.Nombre,
        role.Descripcion,
        role.EstaActivo,
        SystemRoleNames.IsSystemRole(role.Nombre),
        role.UsuarioRoles.Count(userRole => userRole.Usuario.EstaActivo),
        role.RolPermisos
            .Where(rolePermission => rolePermission.Permiso.EstaActivo)
            .Select(rolePermission => rolePermission.Permiso.ClavePermiso)
            .OrderBy(code => code)
            .ToList());
}
