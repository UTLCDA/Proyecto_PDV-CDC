using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class Usuario : EntidadBase
{
    public string NombreUsuario { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public Guid? EmpleadoId { get; set; }

    public Empleado? Empleado { get; set; }
    public ICollection<UsuarioRol> UsuarioRoles { get; set; } = new List<UsuarioRol>();
    public ICollection<TokenRefresco> TokensRefresco { get; set; } = new List<TokenRefresco>();
}
