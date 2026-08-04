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
        // 1. Bitácora en Base de Datos (SQL Server / EF Core)
        var auditLog = new LogAuditoria
        {
            IdCorrelacion = correlationId,
            UsuarioId = userId,
            Accion = action,
            NombreEntidad = entityName,
            EntidadId = entityId,
            ValoresAnterioresJson = oldValuesJson,
            ValoresNuevosJson = newValuesJson,
            DireccionIp = ipAddress,
            Motivo = reason,
            FechaCreacionUtc = DateTime.UtcNow
        };

        _dbContext.AuditLogs.Add(auditLog);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // 2. Bitácora en Archivo de Log Rotativo (Serilog)
        _logger.LogInformation(
            "[AUDITORIA WPC BAJIO] CorrelationId: {CorrelationId} | Action: {Action} | Entity: {EntityName} ({EntityId}) | User: {UserId} | IP: {IpAddress} | Reason: {Reason} | OldValues: {OldValues} | NewValues: {NewValues}",
            correlationId,
            action,
            entityName,
            entityId ?? "N/A",
            userId?.ToString() ?? "Anonimo",
            ipAddress,
            reason ?? "Sin motivo especificado",
            oldValuesJson ?? "N/A",
            newValuesJson ?? "N/A");
    }
}
