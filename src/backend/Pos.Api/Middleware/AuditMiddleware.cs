using System.Security.Claims;
using Pos.Application.Common.Interfaces;

namespace Pos.Api.Middleware;

public class AuditMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditMiddleware> _logger;

    public AuditMiddleware(RequestDelegate next, ILogger<AuditMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IServiceProvider serviceProvider)
    {
        var correlationId = context.Request.Headers["X-Correlation-ID"].FirstOrDefault() ?? Guid.NewGuid().ToString();
        context.Items["CorrelationId"] = correlationId;
        context.Response.Headers["X-Correlation-ID"] = correlationId;

        var path = context.Request.Path.Value ?? "";

        // Skip static files or swagger assets from audit
        if (path.StartsWith("/swagger") || path.StartsWith("/favicon"))
        {
            await _next(context);
            return;
        }

        await _next(context);

        try
        {
            var userIdClaim = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Guid? userId = Guid.TryParse(userIdClaim, out var parsedId) ? parsedId : null;

            var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            var action = $"{context.Request.Method} {path}";
            var statusCode = context.Response.StatusCode;

            using var scope = serviceProvider.CreateScope();
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditLogService>();

            await auditService.LogAsync(
                correlationId: correlationId,
                userId: userId,
                action: action,
                entityName: "HttpRequest",
                entityId: statusCode.ToString(),
                oldValuesJson: null,
                newValuesJson: null,
                ipAddress: ipAddress,
                reason: $"HTTP Response StatusCode: {statusCode}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error writing audit middleware log");
        }
    }
}
