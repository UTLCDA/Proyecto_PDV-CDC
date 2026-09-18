using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class ReciboCompra : EntidadBase
{
    public string Folio { get; set; } = string.Empty;
    public Guid ProductoId { get; set; }
    public int IdProducto { get; set; }
    public string NombreProducto { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string CodigoBarras { get; set; } = string.Empty;
    public decimal PrecioCosto { get; set; }
    public decimal PrecioVenta { get; set; }
    public decimal InventarioAnterior { get; set; }
    public decimal Cantidad { get; set; }
    public decimal InventarioResultante { get; set; }
    public string? Notas { get; set; }
    public Guid? UsuarioId { get; set; }

    public Producto Producto { get; set; } = null!;
    public Usuario? Usuario { get; set; }
}
