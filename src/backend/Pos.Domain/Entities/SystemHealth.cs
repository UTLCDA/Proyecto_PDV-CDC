using Pos.Domain.Common;
using Pos.Domain.Enums;

namespace Pos.Domain.Entities;

public class SystemHealth : BaseEntity
{
    public string Environment { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public SystemStatus Status { get; set; } = SystemStatus.Operational;

    public bool IsOperational() => Status == SystemStatus.Operational;
}
