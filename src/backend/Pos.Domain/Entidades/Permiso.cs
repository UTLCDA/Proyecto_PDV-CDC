using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class Permiso : EntidadBase
{
    public string Modulo { get; set; } = string.Empty;
    public string Accion { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;

    public string ClavePermiso => $"{Modulo}:{Accion}";

    public ICollection<RolPermiso> RolPermisos { get; set; } = new List<RolPermiso>();
}
