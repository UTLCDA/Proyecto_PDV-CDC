using Microsoft.EntityFrameworkCore;
using Pos.Application.Auth.DTOs;
using Pos.Application.Auth.Services;
using Pos.Application.Common.Interfaces;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class AuthApplicationService : IAuthApplicationService
{
    private readonly PosDbContext _dbContext;
    private readonly IPasswordHasherService _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IAuditLogService _auditLogService;

    public AuthApplicationService(
        PosDbContext dbContext,
        IPasswordHasherService passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _auditLogService = auditLogService;
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Empleado)
            .Include(u => u.UsuarioRoles)
                .ThenInclude(ur => ur.Rol)
                    .ThenInclude(r => r.RolPermisos)
                        .ThenInclude(rp => rp.Permiso)
            .FirstOrDefaultAsync(u => (u.Email == request.EmailOrUsername || u.NombreUsuario == request.EmailOrUsername) && u.EstaActivo, cancellationToken);

        if (user == null || !_passwordHasher.VerifyPassword(user.PasswordHash, request.Password))
        {
            await _auditLogService.LogAsync(
                correlationId,
                null,
                "LOGIN_FAILED",
                "Usuario",
                null,
                null,
                $"AttemptedEmailOrUsername={request.EmailOrUsername}",
                ipAddress,
                "Intento fallido de inicio de sesión",
                module: "Seguridad",
                eventType: "LOGIN_FAILED",
                resultStatus: "WARNING",
                cancellationToken: cancellationToken);

            throw new UnauthorizedAccessException("Credenciales de acceso inválidas.");
        }

        var roles = user.UsuarioRoles
            .Where(ur => ur.Rol.EstaActivo)
            .Select(ur => ur.Rol.Nombre)
            .ToList();
        var permissions = user.UsuarioRoles
            .Where(ur => ur.Rol.EstaActivo)
            .SelectMany(ur => ur.Rol.RolPermisos)
            .Where(rp => rp.Permiso.EstaActivo)
            .Select(rp => rp.Permiso.ClavePermiso)
            .Distinct()
            .ToList();

        var (accessToken, expiresAtUtc) = _jwtTokenGenerator.GenerateAccessToken(user, roles, permissions);
        var refreshTokenValue = _jwtTokenGenerator.GenerateRefreshToken();

        var refreshTokenEntity = new TokenRefresco
        {
            UsuarioId = user.Id,
            Token = refreshTokenValue,
            FechaExpiracionUtc = DateTime.UtcNow.AddDays(7),
            EsRevocado = false,
            FechaCreacionUtc = DateTime.UtcNow
        };

        _dbContext.RefreshTokens.Add(refreshTokenEntity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            user.Id,
            "LOGIN_SUCCESS",
            "Usuario",
            user.Id.ToString(),
            null,
            $"Username={user.NombreUsuario}",
            ipAddress,
            "Inicio de sesión exitoso WPC Bajío",
            module: "Seguridad",
            eventType: "LOGIN_SUCCESS",
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        var fullName = user.Empleado != null ? $"{user.Empleado.Nombre} {user.Empleado.Apellido}" : user.NombreUsuario;
        var userDto = new UserDto(user.Id, user.NombreUsuario, user.Email, fullName, roles, permissions);

        return new AuthResponseDto(accessToken, refreshTokenValue, expiresAtUtc, userDto);
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequestDto request, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var refreshToken = await _dbContext.RefreshTokens
            .Include(r => r.Usuario)
                .ThenInclude(u => u.Empleado)
            .Include(r => r.Usuario)
                .ThenInclude(u => u.UsuarioRoles)
                    .ThenInclude(ur => ur.Rol)
                        .ThenInclude(r => r.RolPermisos)
                            .ThenInclude(rp => rp.Permiso)
            .FirstOrDefaultAsync(r => r.Token == request.RefreshToken && !r.EsRevocado, cancellationToken);

        if (refreshToken == null || refreshToken.FechaExpiracionUtc <= DateTime.UtcNow || !refreshToken.Usuario.EstaActivo)
        {
            throw new UnauthorizedAccessException("Token de refresco inválido o expirado.");
        }

        refreshToken.EsRevocado = true;
        refreshToken.FechaActualizacionUtc = DateTime.UtcNow;

        var user = refreshToken.Usuario;
        var roles = user.UsuarioRoles
            .Where(ur => ur.Rol.EstaActivo)
            .Select(ur => ur.Rol.Nombre)
            .ToList();
        var permissions = user.UsuarioRoles
            .Where(ur => ur.Rol.EstaActivo)
            .SelectMany(ur => ur.Rol.RolPermisos)
            .Where(rp => rp.Permiso.EstaActivo)
            .Select(rp => rp.Permiso.ClavePermiso)
            .Distinct()
            .ToList();

        var (accessToken, expiresAtUtc) = _jwtTokenGenerator.GenerateAccessToken(user, roles, permissions);
        var newRefreshTokenValue = _jwtTokenGenerator.GenerateRefreshToken();

        var newRefreshTokenEntity = new TokenRefresco
        {
            UsuarioId = user.Id,
            Token = newRefreshTokenValue,
            FechaExpiracionUtc = DateTime.UtcNow.AddDays(7),
            EsRevocado = false,
            FechaCreacionUtc = DateTime.UtcNow
        };

        _dbContext.RefreshTokens.Add(newRefreshTokenEntity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var fullName = user.Empleado != null ? $"{user.Empleado.Nombre} {user.Empleado.Apellido}" : user.NombreUsuario;
        var userDto = new UserDto(user.Id, user.NombreUsuario, user.Email, fullName, roles, permissions);

        return new AuthResponseDto(accessToken, newRefreshTokenValue, expiresAtUtc, userDto);
    }

    public async Task RevokeRefreshTokenAsync(string token, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var refreshToken = await _dbContext.RefreshTokens.FirstOrDefaultAsync(r => r.Token == token, cancellationToken);
        if (refreshToken != null)
        {
            refreshToken.EsRevocado = true;
            refreshToken.FechaActualizacionUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync(
                correlationId,
                refreshToken.UsuarioId,
                "LOGOUT",
                "Usuario",
                refreshToken.UsuarioId.ToString(),
                null,
                null,
                ipAddress,
                "Cierre de sesión y revocación de token de refresco",
                module: "Seguridad",
                eventType: "LOGOUT",
                resultStatus: "SUCCESS",
                cancellationToken: cancellationToken);
        }
    }

    public async Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Empleado)
            .Include(u => u.UsuarioRoles)
                .ThenInclude(ur => ur.Rol)
                    .ThenInclude(r => r.RolPermisos)
                        .ThenInclude(rp => rp.Permiso)
            .FirstOrDefaultAsync(u => u.Id == userId && u.EstaActivo, cancellationToken);

        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        var roles = user.UsuarioRoles
            .Where(ur => ur.Rol.EstaActivo)
            .Select(ur => ur.Rol.Nombre)
            .ToList();
        var permissions = user.UsuarioRoles
            .Where(ur => ur.Rol.EstaActivo)
            .SelectMany(ur => ur.Rol.RolPermisos)
            .Where(rp => rp.Permiso.EstaActivo)
            .Select(rp => rp.Permiso.ClavePermiso)
            .Distinct()
            .ToList();

        var fullName = user.Empleado != null ? $"{user.Empleado.Nombre} {user.Empleado.Apellido}" : user.NombreUsuario;
        return new UserDto(user.Id, user.NombreUsuario, user.Email, fullName, roles, permissions);
    }
}
