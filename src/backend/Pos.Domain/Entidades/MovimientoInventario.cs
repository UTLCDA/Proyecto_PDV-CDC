using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class MovimientoInventario : EntidadBase
{
    public Guid ProductoId { get; set; }
    public int? IdVenta { get; set; }
    public string TipoMovimiento { get; set; } = string.Empty; // Entrada, Salida, Ajuste, Venta, Devolucion
    public decimal Cantidad { get; set; }
    public decimal CantidadAnterior { get; set; }
    public decimal CantidadNueva { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public string NumeroReferencia { get; set; } = string.Empty;
    public string EvidenceImageUrl { get; set; } = string.Empty;
    public Guid? UsuarioId { get; set; }

    public Producto Producto { get; set; } = null!;
    public Usuario? Usuario { get; set; }
}
