using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class DevolucionCabecera : EntidadBase
{
    public string NumeroDevolucion { get; set; } = string.Empty; // e.g. DEV-2026-00001
    public Guid VentaId { get; set; }
    public Guid? UsuarioId { get; set; }
    public decimal MontoTotalDevuelto { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public string Estado { get; set; } = "Completada";

    public Venta Venta { get; set; } = null!;
    public Usuario? Usuario { get; set; }
    public ICollection<DevolucionDetalle> Detalle { get; set; } = new List<DevolucionDetalle>();
}
