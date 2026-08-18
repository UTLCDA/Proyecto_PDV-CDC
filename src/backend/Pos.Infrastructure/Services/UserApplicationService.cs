using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pos.Application.Common.Interfaces;
using Pos.Application.Common.Security;
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
            .AsNoTracking()
            .Include(user => user.Empleado)
            .Include(user => user.UsuarioRoles)
                .ThenInclude(userRole => userRole.Rol)
            .OrderByDescending(user => user.FechaCreacionUtc)
            .ToListAsync(cancellationToken);

        return users.Select(MapUserToDto).ToList();
    }

    public async Task<UserManagementDto?> GetUserByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .Include(item => item.Empleado)
            .Include(item => item.UsuarioRoles)
                .ThenInclude(userRole => userRole.Rol)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return user == null ? null : MapUserToDto(user);
    }

    public async Task<UserManagementDto> CreateUserAsync(
        CreateUserRequestDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        var username = ValidateRequired(request.Username, "nombre de usuario", 3, 80);
        var email = ValidateEmail(request.Email);
        var firstName = ValidateRequired(request.FirstName, "nombre", 2, 100);
        var lastName = ValidateRequired(request.LastName, "apellido", 2, 100);
        var jobTitle = ValidateOptional(request.JobTitle, "puesto", 120);
        ValidatePassword(request.Password);

        var normalizedUsername = username.ToLowerInvariant();
        var normalizedEmail = email.ToLowerInvariant();
        var existingUser = await _dbContext.Users.FirstOrDefaultAsync(
            user => user.NombreUsuario.ToLower() == normalizedUsername || user.Email.ToLower() == normalizedEmail,
            cancellationToken);
        if (existingUser != null)
        {
            throw new InvalidOperationException("El nombre de usuario o correo electrónico ya se encuentra registrado.");
        }

        var role = await GetActiveRoleAsync(request.RoleId, cancellationToken);
        var employee = new Empleado
        {
            Nombre = firstName,
            Apellido = lastName,
            Email = email,
            Puesto = jobTitle
        };
        var user = new Usuario
        {
            NombreUsuario = username,
            Email = email,
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
            JsonSerializer.Serialize(new
            {
                Username = user.NombreUsuario,
                user.Email,
                RoleId = role.Id,
                RoleName = role.Nombre,
                user.EstaActivo
            }),
            ipAddress,
            $"Nuevo usuario registrado en WPC Bajío: {user.NombreUsuario}",
            module: "Usuarios",
            eventType: "USER_CREATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return (await GetUserByIdAsync(user.Id, cancellationToken))!;
    }

    public async Task<UserManagementDto> UpdateUserAsync(
        Guid id,
        UpdateUserRequestDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        var email = ValidateEmail(request.Email);
        var firstName = ValidateRequired(request.FirstName, "nombre", 2, 100);
        var lastName = ValidateRequired(request.LastName, "apellido", 2, 100);
        var jobTitle = ValidateOptional(request.JobTitle, "puesto", 120);
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            ValidatePassword(request.NewPassword);
        }

        var user = await _dbContext.Users
            .Include(item => item.Empleado)
            .Include(item => item.UsuarioRoles)
                .ThenInclude(userRole => userRole.Rol)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"Usuario con ID '{id}' no encontrado.");

        var targetRole = await GetActiveRoleAsync(request.RoleId, cancellationToken);
        var normalizedEmail = email.ToLowerInvariant();
        if (await _dbContext.Users.AnyAsync(
                item => item.Id != user.Id && item.Email.ToLower() == normalizedEmail,
                cancellationToken))
        {
            throw new InvalidOperationException("El correo electrónico ya se encuentra registrado por otro usuario.");
        }

        var currentRole = user.UsuarioRoles.Select(userRole => userRole.Rol).FirstOrDefault();
        if (currentUserId == user.Id && (!request.IsActive || currentRole?.Id != targetRole.Id))
        {
            throw new InvalidOperationException("No puede desactivar su propia cuenta ni cambiar su propio rol durante una sesión activa.");
        }

        if (currentRole != null &&
            string.Equals(currentRole.Nombre, SystemRoleNames.Administrator, StringComparison.OrdinalIgnoreCase) &&
            (!request.IsActive || !string.Equals(targetRole.Nombre, SystemRoleNames.Administrator, StringComparison.OrdinalIgnoreCase)))
        {
            var otherActiveAdministrators = await _dbContext.UserRoles.CountAsync(
                userRole => userRole.UsuarioId != user.Id &&
                    userRole.Usuario.EstaActivo &&
                    userRole.Rol.Nombre == SystemRoleNames.Administrator,
                cancellationToken);
            if (otherActiveAdministrators == 0)
            {
                throw new InvalidOperationException("Debe permanecer al menos un administrador activo en el sistema.");
            }
        }

        var oldValues = JsonSerializer.Serialize(new
        {
            user.Email,
            user.EstaActivo,
            RoleId = currentRole?.Id,
            RoleName = currentRole?.Nombre,
            FirstName = user.Empleado?.Nombre,
            LastName = user.Empleado?.Apellido,
            JobTitle = user.Empleado?.Puesto
        });
        var securityChanged = user.EstaActivo != request.IsActive ||
            currentRole?.Id != targetRole.Id ||
            !string.IsNullOrWhiteSpace(request.NewPassword);

        user.Email = email;
        user.EstaActivo = request.IsActive;
        user.FechaActualizacionUtc = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        }

        if (user.Empleado == null)
        {
            user.Empleado = new Empleado();
        }
        user.Empleado.Nombre = firstName;
        user.Empleado.Apellido = lastName;
        user.Empleado.Email = email;
        user.Empleado.Puesto = jobTitle;
        user.Empleado.FechaActualizacionUtc = DateTime.UtcNow;

        if (currentRole?.Id != targetRole.Id || user.UsuarioRoles.Count != 1)
        {
            _dbContext.UserRoles.RemoveRange(user.UsuarioRoles);
            _dbContext.UserRoles.Add(new UsuarioRol { UsuarioId = user.Id, RolId = targetRole.Id });
        }

        if (securityChanged)
        {
            var activeRefreshTokens = await _dbContext.RefreshTokens
                .Where(token => token.UsuarioId == user.Id && !token.EsRevocado)
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
            "USER_UPDATED",
            "Usuario",
            user.Id.ToString(),
            oldValues,
            JsonSerializer.Serialize(new
            {
                user.Email,
                user.EstaActivo,
                RoleId = targetRole.Id,
                RoleName = targetRole.Nombre,
                FirstName = firstName,
                LastName = lastName,
                JobTitle = jobTitle,
                PasswordChanged = !string.IsNullOrWhiteSpace(request.NewPassword)
            }),
            ipAddress,
            $"Usuario actualizado: {user.NombreUsuario}",
            module: "Usuarios",
            eventType: "USER_UPDATED",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return (await GetUserByIdAsync(user.Id, cancellationToken))!;
    }

    private async Task<Rol> GetActiveRoleAsync(Guid roleId, CancellationToken cancellationToken)
    {
        var role = await _dbContext.Roles.FirstOrDefaultAsync(
            item => item.Id == roleId && item.EstaActivo,
            cancellationToken);
        return role ?? throw new InvalidOperationException("El rol seleccionado no existe o se encuentra inactivo.");
    }

    private static string ValidateRequired(string? value, string fieldName, int minLength, int maxLength)
    {
        var normalizedValue = value?.Trim() ?? string.Empty;
        if (normalizedValue.Length < minLength || normalizedValue.Length > maxLength)
        {
            throw new InvalidOperationException($"El {fieldName} debe contener entre {minLength} y {maxLength} caracteres.");
        }

        return normalizedValue;
    }

    private static string ValidateOptional(string? value, string fieldName, int maxLength)
    {
        var normalizedValue = value?.Trim() ?? string.Empty;
        if (normalizedValue.Length > maxLength)
        {
            throw new InvalidOperationException($"El {fieldName} no puede exceder {maxLength} caracteres.");
        }

        return normalizedValue;
    }

    private static string ValidateEmail(string? value)
    {
        var email = value?.Trim() ?? string.Empty;
        if (email.Length > 180 || !System.Net.Mail.MailAddress.TryCreate(email, out _))
        {
            throw new InvalidOperationException("Capture un correo electrónico válido.");
        }

        return email;
    }

    private static void ValidatePassword(string? password)
    {
        if (string.IsNullOrWhiteSpace(password) ||
            password.Length < 8 ||
            !password.Any(char.IsUpper) ||
            !password.Any(char.IsLower) ||
            !password.Any(char.IsDigit) ||
            !password.Any(character => !char.IsLetterOrDigit(character)))
        {
            throw new InvalidOperationException("La contraseña debe tener al menos 8 caracteres e incluir mayúscula, minúscula, número y símbolo.");
        }
    }

    private static UserManagementDto MapUserToDto(Usuario user)
    {
        var orderedRoles = user.UsuarioRoles
            .Select(userRole => userRole.Rol)
            .OrderBy(role => role.Nombre)
            .ToList();
        var primaryRole = orderedRoles.FirstOrDefault();
        var firstName = user.Empleado?.Nombre ?? user.NombreUsuario;
        var lastName = user.Empleado?.Apellido ?? string.Empty;
        var fullName = user.Empleado != null
            ? $"{user.Empleado.Nombre} {user.Empleado.Apellido}".Trim()
            : user.NombreUsuario;

        return new UserManagementDto(
            user.Id,
            user.NombreUsuario,
            user.Email,
            firstName,
            lastName,
            fullName,
            user.Empleado?.Puesto ?? "Empleado",
            user.EstaActivo,
            primaryRole?.Id ?? Guid.Empty,
            primaryRole?.Nombre ?? string.Empty,
            orderedRoles.Select(role => role.Nombre).ToList(),
            user.FechaCreacionUtc);
    }
}
