namespace Pos.Application.Common.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(
        string correlationId,
        Guid? userId,
        string action,
        string entityName,
        string? entityId,
        string? oldValuesJson,
        string? newValuesJson,
        string ipAddress,
        string? reason = null,
        string? module = null,
        string? eventType = null,
        string? resultStatus = null,
        CancellationToken cancellationToken = default);
}
