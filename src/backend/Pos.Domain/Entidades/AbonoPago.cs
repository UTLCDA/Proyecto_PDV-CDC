using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class AbonoPago : EntidadBase
{
    public Guid VentaId { get; set; }
    public string NumeroRecibo { get; set; } = string.Empty; // e.g. RECIBO-2026-00001
    public decimal MontoAbonado { get; set; }
    public decimal SaldoPendienteAnterior { get; set; }
    public decimal SaldoPendienteNuevo { get; set; }
    public string FormaPago { get; set; } = PaymentMethods.Cash;
    public Guid? UsuarioId { get; set; }
    public string Notas { get; set; } = string.Empty;

    public Venta Venta { get; set; } = null!;
    public Usuario? Usuario { get; set; }
}
