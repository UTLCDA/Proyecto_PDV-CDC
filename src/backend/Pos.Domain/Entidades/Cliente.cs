using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class Cliente : EntidadBase
{
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string? NombreEmpresa { get; set; }
    public string? Rfc { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string Direccion { get; set; } = string.Empty;
    public string Ciudad { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string CodigoPostal { get; set; } = string.Empty;

    public string TipoCliente { get; set; } = CustomerTypes.Retail;
    public decimal PorcentajeDescuentoEspecial { get; set; }
    public string Notas { get; set; } = string.Empty;

    public string NombreMostrar => string.IsNullOrWhiteSpace(NombreEmpresa)
        ? $"{Nombre} {Apellido}"
        : $"{NombreEmpresa} ({Nombre} {Apellido})";
}
