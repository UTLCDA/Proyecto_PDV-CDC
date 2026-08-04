using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class Categoria : EntidadBase
{
    public string Nombre { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;

    public Guid? CategoriaPadreId { get; set; }
    public Categoria? CategoriaPadre { get; set; }
    public ICollection<Categoria> SubCategorias { get; set; } = new List<Categoria>();
    public ICollection<Producto> Productos { get; set; } = new List<Producto>();
}
