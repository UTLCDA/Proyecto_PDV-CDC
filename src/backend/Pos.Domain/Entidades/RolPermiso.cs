namespace Pos.Domain.Entidades;

public class RolPermiso
{
    public Guid RolId { get; set; }
    public Guid PermisoId { get; set; }

    public Rol Rol { get; set; } = null!;
    public Permiso Permiso { get; set; } = null!;
}
