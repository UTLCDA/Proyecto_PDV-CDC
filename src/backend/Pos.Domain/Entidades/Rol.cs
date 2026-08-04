using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class Rol : EntidadBase
{
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;

    public ICollection<UsuarioRol> UsuarioRoles { get; set; } = new List<UsuarioRol>();
    public ICollection<RolPermiso> RolPermisos { get; set; } = new List<RolPermiso>();
}
