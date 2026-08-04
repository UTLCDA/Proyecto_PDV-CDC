using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class Producto : EntidadBase
{
    public string Sku { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public Guid CategoriaId { get; set; }

    public decimal PrecioUnitario { get; set; }
    public decimal PrecioMayoreo { get; set; }
    public decimal CantidadMinimaMayoreo { get; set; }
    public string UnidadMedida { get; set; } = "Pza"; // Pza, Caja, m²
    public decimal CoberturaPorUnidadM2 { get; set; }

    public int AnchoMm { get; set; }
    public int LargoMm { get; set; }
    public int EspesorMm { get; set; }
    public string Material { get; set; } = string.Empty;

    public bool SoloCotizacion { get; set; } = false;
    public bool VisibleMasVendido { get; set; } = false;

    public Categoria Categoria { get; set; } = null!;
    public ICollection<ImagenProducto> Imagenes { get; set; } = new List<ImagenProducto>();
}
