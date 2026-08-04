using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class ImagenProducto : EntidadBase
{
    public Guid ProductoId { get; set; }
    public string UrlImagen { get; set; } = string.Empty;
    public bool EsPrincipal { get; set; }

    public Producto Producto { get; set; } = null!;
}
