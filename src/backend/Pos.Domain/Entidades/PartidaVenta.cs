using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class PartidaVenta : EntidadBase
{
    public Guid VentaId { get; set; }
    public Guid ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal MontoDescuento { get; set; }
    public decimal PrecioTotal { get; set; }

    public Venta Venta { get; set; } = null!;
    public Producto Producto { get; set; } = null!;

    public void CalcularTotalPartida()
    {
        PrecioTotal = Math.Max(0, (Cantidad * PrecioUnitario) - MontoDescuento);
    }
}
