using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class TokenRefresco : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime FechaExpiracionUtc { get; set; }
    public bool EsRevocado { get; set; }

    public Usuario Usuario { get; set; } = null!;
}
