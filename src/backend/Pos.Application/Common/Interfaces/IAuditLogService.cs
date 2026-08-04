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
        CancellationToken cancellationToken = default);
}
