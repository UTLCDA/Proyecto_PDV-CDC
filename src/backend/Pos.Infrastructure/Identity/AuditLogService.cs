using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Pos.Application.Common.Interfaces;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Identity;

public class AuditLogService : IAuditLogService
{
    private static readonly Regex SensitiveFieldsRegex = new(
        @"""(password|contrasena|contraseña|token|refreshToken|secret|cvv|authorization|connectionString)""\s*:\s*""[^""]*""",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

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
        string? module = null,
        string? eventType = null,
        string? resultStatus = null,
        CancellationToken cancellationToken = default)
    {
        var sanitizedOld = SanitizeJson(oldValuesJson);
        var sanitizedNew = EnrichAndSanitizeNewValues(newValuesJson, module, eventType, resultStatus);

        var safeOldValues = TruncateString(sanitizedOld, 3500);
        var safeNewValues = TruncateString(sanitizedNew, 3500);
        var safeReason = TruncateString(reason, 1000);

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
    }

    private static string? EnrichAndSanitizeNewValues(string? newValuesJson, string? module, string? eventType, string? resultStatus)
    {
        var sanitized = SanitizeJson(newValuesJson);

        if (string.IsNullOrWhiteSpace(module) && string.IsNullOrWhiteSpace(eventType) && string.IsNullOrWhiteSpace(resultStatus))
        {
            return sanitized;
        }

        try
        {
            var metaDict = new Dictionary<string, object?>
            {
                ["schemaVersion"] = 1,
                ["module"] = module,
                ["eventType"] = eventType,
                ["resultStatus"] = resultStatus ?? "SUCCESS"
            };

            if (!string.IsNullOrWhiteSpace(sanitized))
            {
                if (sanitized.TrimStart().StartsWith("{"))
                {
                    using var doc = JsonDocument.Parse(sanitized);
                    metaDict["payload"] = doc.RootElement.Clone();
                }
                else
                {
                    metaDict["payload"] = sanitized;
                }
            }

            return JsonSerializer.Serialize(metaDict);
        }
        catch
        {
            return sanitized;
        }
    }

    private static string? SanitizeJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return json;
        return SensitiveFieldsRegex.Replace(json, @"""$1"":""***REDACTED***""");
    }

    private static string? TruncateString(string? str, int maxLength)
    {
        if (string.IsNullOrEmpty(str)) return str;
        return str.Length <= maxLength ? str : str.Substring(0, maxLength);
    }
}
