using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class PlantillaDocumento : EntidadBase
{
    public string Titulo { get; set; } = string.Empty;
    public string Categoria { get; set; } = "ContratoVenta"; // ContratoVenta, ContratoApartado, ReciboAbono
    public string ContenidoHtmlPlantilla { get; set; } = string.Empty;
}
