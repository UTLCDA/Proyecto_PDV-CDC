using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class Empleado : EntidadBase
{
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Puesto { get; set; } = string.Empty;
}
