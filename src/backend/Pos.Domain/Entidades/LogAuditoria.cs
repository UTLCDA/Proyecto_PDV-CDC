using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class LogAuditoria : EntidadBase
{
    public string IdCorrelacion { get; set; } = string.Empty;
    public Guid? UsuarioId { get; set; }
    public string Accion { get; set; } = string.Empty;
    public string NombreEntidad { get; set; } = string.Empty;
    public string? EntidadId { get; set; }
    public string? ValoresAnterioresJson { get; set; }
    public string? ValoresNuevosJson { get; set; }
    public string DireccionIp { get; set; } = string.Empty;
    public string? Motivo { get; set; }

    public Usuario? Usuario { get; set; }
}
