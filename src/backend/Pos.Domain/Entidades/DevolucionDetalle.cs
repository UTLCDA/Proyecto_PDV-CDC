using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class DevolucionDetalle : EntidadBase
{
    public Guid DevolucionCabeceraId { get; set; }
    public Guid ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitarioDevolucion { get; set; }
    public decimal PrecioTotalDevolucion { get; set; }

    public DevolucionCabecera DevolucionCabecera { get; set; } = null!;
    public Producto Producto { get; set; } = null!;
}
