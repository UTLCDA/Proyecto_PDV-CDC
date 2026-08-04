using Microsoft.EntityFrameworkCore;
using Pos.Application.Common.Interfaces;
using Pos.Application.Users.DTOs;
using Pos.Application.Users.Services;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class UserApplicationService : IUserApplicationService
{
    private readonly PosDbContext _dbContext;
    private readonly IPasswordHasherService _passwordHasher;
    private readonly IAuditLogService _auditLogService;

    public UserApplicationService(
        PosDbContext dbContext,
        IPasswordHasherService passwordHasher,
        IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _auditLogService = auditLogService;
    }

    public async Task<List<UserManagementDto>> GetUsersAsync(CancellationToken cancellationToken = default)
    {
        var users = await _dbContext.Users
            .Include(u => u.Empleado)
            .Include(u => u.UsuarioRoles)
                .ThenInclude(ur => ur.Rol)
            .OrderByDescending(u => u.FechaCreacionUtc)
            .ToListAsync(cancellationToken);

        return users.Select(MapUserToDto).ToList();
    }

    public async Task<UserManagementDto?> GetUserByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Empleado)
            .Include(u => u.UsuarioRoles)
                .ThenInclude(ur => ur.Rol)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        return user == null ? null : MapUserToDto(user);
    }

    public async Task<UserManagementDto> CreateUserAsync(CreateUserRequestDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var existingUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.NombreUsuario == request.Username.Trim() || u.Email == request.Email.Trim(), cancellationToken);
        if (existingUser != null)
        {
            throw new InvalidOperationException("El nombre de usuario o correo electrónico ya se encuentra registrado.");
        }

        var role = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Nombre.ToLower() == request.RoleName.Trim().ToLower(), cancellationToken)
                   ?? await _dbContext.Roles.FirstAsync(cancellationToken);

        var employee = new Empleado
        {
            Nombre = request.FirstName.Trim(),
            Apellido = request.LastName.Trim(),
            Email = request.Email.Trim(),
            Puesto = request.JobTitle.Trim()
        };

        var user = new Usuario
        {
            NombreUsuario = request.Username.Trim(),
            Email = request.Email.Trim(),
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            Empleado = employee,
            EstaActivo = true,
            FechaCreacionUtc = DateTime.UtcNow
        };

        _dbContext.Users.Add(user);
        _dbContext.UserRoles.Add(new UsuarioRol { Usuario = user, Rol = role });

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "USER_CREATED",
            "Usuario",
            user.Id.ToString(),
            null,
            $"Username={user.NombreUsuario}, Role={role.Nombre}",
            ipAddress,
            $"Nuevo usuario registrado en WPC Bajío: {user.NombreUsuario}",
            cancellationToken);

        return (await GetUserByIdAsync(user.Id, cancellationToken))!;
    }

    public async Task<UserManagementDto> UpdateUserAsync(Guid id, UpdateUserRequestDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Empleado)
            .Include(u => u.UsuarioRoles)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            throw new KeyNotFoundException($"Usuario con ID '{id}' no encontrado.");
        }

        var oldValues = $"Email={user.Email}, Active={user.EstaActivo}";

        user.Email = request.Email.Trim();
        user.EstaActivo = request.IsActive;
        user.FechaActualizacionUtc = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        }

        if (user.Empleado != null)
        {
            user.Empleado.Nombre = request.FirstName.Trim();
            user.Empleado.Apellido = request.LastName.Trim();
            user.Empleado.Email = request.Email.Trim();
            user.Empleado.Puesto = request.JobTitle.Trim();
        }

        // Update Role assignment
        var targetRole = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Nombre.ToLower() == request.RoleName.Trim().ToLower(), cancellationToken);
        if (targetRole != null)
        {
            _dbContext.UserRoles.RemoveRange(user.UsuarioRoles);
            _dbContext.UserRoles.Add(new UsuarioRol { UsuarioId = user.Id, RolId = targetRole.Id });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            "USER_UPDATED",
            "Usuario",
            user.Id.ToString(),
            oldValues,
            $"Email={user.Email}, Active={user.EstaActivo}",
            ipAddress,
            $"Usuario actualizado: {user.NombreUsuario}",
            cancellationToken);

        return (await GetUserByIdAsync(user.Id, cancellationToken))!;
    }

    private static UserManagementDto MapUserToDto(Usuario u)
    {
        var roles = u.UsuarioRoles?.Select(ur => ur.Rol.Nombre).ToList() ?? new List<string>();
        var firstName = u.Empleado?.Nombre ?? u.NombreUsuario;
        var lastName = u.Empleado?.Apellido ?? string.Empty;
        var fullName = u.Empleado != null ? $"{u.Empleado.Nombre} {u.Empleado.Apellido}" : u.NombreUsuario;

        return new UserManagementDto(
            u.Id,
            u.NombreUsuario,
            u.Email,
            firstName,
            lastName,
            fullName,
            u.Empleado?.Puesto ?? "Empleado",
            u.EstaActivo,
            roles,
            u.FechaCreacionUtc
        );
    }
}
