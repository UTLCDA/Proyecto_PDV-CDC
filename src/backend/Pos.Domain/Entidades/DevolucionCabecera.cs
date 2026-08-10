using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class DevolucionCabecera : EntidadBase
{
    public string NumeroDevolucion { get; set; } = string.Empty; // e.g. DEV-2026-00001
    public Guid VentaId { get; set; }
    public int? IdVenta { get; set; }
    public Guid? UsuarioId { get; set; }
    public decimal MontoTotalDevuelto { get; set; }
    public decimal MontoAplicadoSaldoPendiente { get; set; }
    public decimal MontoReembolsado { get; set; }
    public string FormaReembolso { get; set; } = RefundMethods.StoreCredit;
    public string Motivo { get; set; } = string.Empty;
    public string Estado { get; set; } = ReturnStatuses.Completed;

    public Venta Venta { get; set; } = null!;
    public Usuario? Usuario { get; set; }
    public ICollection<DevolucionDetalle> Detalle { get; set; } = new List<DevolucionDetalle>();
}
