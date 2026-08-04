using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class Permission : BaseEntity
{
    public string Module { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public string PermissionCode => $"{Module}:{Action}".ToLowerInvariant();

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
