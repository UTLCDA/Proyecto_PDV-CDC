using Microsoft.Extensions.Logging;
using Pos.Application.Common.Interfaces;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Identity;

public class AuditLogService : IAuditLogService
{
    private readonly PosDbContext _dbContext;
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(PosDbContext dbContext, ILogger<AuditLogService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task LogAsync(
        string correlationId,
        Guid? userId,
        string action,
        string entityName,
        string? entityId,
        string? oldValuesJson,
        string? newValuesJson,
        string ipAddress,
        string? reason = null,
        CancellationToken cancellationToken = default)
    {
        // Truncate fields to safe lengths to prevent SQL Server string truncation errors
        var safeOldValues = TruncateString(oldValuesJson, 3500);
        var safeNewValues = TruncateString(newValuesJson, 3500);
        var safeReason = TruncateString(reason, 1000);

        // 1. Bitácora en Base de Datos (SQL Server / EF Core)
        var auditLog = new LogAuditoria
        {
            IdCorrelacion = correlationId,
            UsuarioId = userId,
            Accion = action,
            NombreEntidad = entityName,
            EntidadId = entityId,
            ValoresAnterioresJson = safeOldValues,
            ValoresNuevosJson = safeNewValues,
            DireccionIp = ipAddress,
            Motivo = safeReason,
            FechaCreacionUtc = DateTime.UtcNow
        };

        try
        {
            _dbContext.AuditLogs.Add(auditLog);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al guardar el registro de auditoría en la Base de Datos.");
        }

        // 2. Bitácora en Archivo de Log Rotativo (Serilog)
        _logger.LogInformation(
            "[AUDITORIA WPC BAJIO] CorrelationId: {CorrelationId} | Action: {Action} | Entity: {EntityName} ({EntityId}) | User: {UserId} | IP: {IpAddress} | Reason: {Reason} | OldValues: {OldValues} | NewValues: {NewValues}",
            correlationId,
            action,
            entityName,
            entityId ?? "N/A",
            userId?.ToString() ?? "Anonimo",
            ipAddress,
            safeReason ?? "Sin motivo especificado",
            safeOldValues ?? "N/A",
            safeNewValues ?? "N/A");
    }

    private static string? TruncateString(string? str, int maxLength)
    {
        if (string.IsNullOrEmpty(str)) return str;
        return str.Length <= maxLength ? str : str.Substring(0, maxLength);
    }
}
