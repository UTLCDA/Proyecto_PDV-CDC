namespace Pos.Application.Common.Models;

public record HealthCheckDto(
    string Status,
    string ServiceName,
    string Version,
    DateTime TimestampUtc,
    string Environment
);
