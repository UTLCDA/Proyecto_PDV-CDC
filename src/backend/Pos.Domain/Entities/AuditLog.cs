using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class AuditLog : BaseEntity
{
    public string CorrelationId { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? OldValuesJson { get; set; }
    public string? NewValuesJson { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string? Reason { get; set; }

    public User? User { get; set; }
}
