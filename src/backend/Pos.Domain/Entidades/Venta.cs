using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class Venta : EntidadBase
{
    public string NumeroFolio { get; set; } = string.Empty; // e.g. VENTA-2026-00001
    public Guid? ClienteId { get; set; }
    public Guid? UsuarioId { get; set; }

    public string TipoPago { get; set; } = "PagoTotal"; // PagoTotal, VentaApartado, PagoMixto
    public decimal SubTotal { get; set; }
    public decimal MontoDescuento { get; set; }
    public decimal MontoIva { get; set; }
    public decimal MontoTotal { get; set; }

    // Mixed Payment breakdown
    public decimal MontoEfectivo { get; set; }
    public decimal MontoTarjeta { get; set; }
    public decimal MontoTransferencia { get; set; }

    public decimal MontoAnticipo { get; set; }
    public decimal SaldoPendiente { get; set; }

    public string Estado { get; set; } = "Completada"; // Completada, ApartadoPagado, SaldoPendiente, Cancelada
    public string Notas { get; set; } = string.Empty;

    public Cliente? Cliente { get; set; }
    public Usuario? Usuario { get; set; }
    public ICollection<PartidaVenta> Partidas { get; set; } = new List<PartidaVenta>();

    public void CalcularTotales(decimal tasaIva = 0.16m)
    {
        SubTotal = Partidas.Sum(p => p.PrecioTotal);
        MontoIva = Math.Round((SubTotal - MontoDescuento) * tasaIva, 2);
        MontoTotal = Math.Max(0, SubTotal - MontoDescuento + MontoIva);

        if (TipoPago == "VentaApartado")
        {
            SaldoPendiente = Math.Max(0, MontoTotal - MontoAnticipo);
            Estado = SaldoPendiente > 0 ? "ApartadoPagado" : "Completada";
        }
        else
        {
            MontoAnticipo = MontoTotal;
            SaldoPendiente = 0m;
            Estado = "Completada";
        }
    }
}
