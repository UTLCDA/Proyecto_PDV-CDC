using System.ComponentModel.DataAnnotations;
using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class Existencia : EntidadBase
{
    public Guid ProductoId { get; set; }
    public decimal CantidadDisponible { get; set; }
    public decimal UmbralMinimoAlerta { get; set; }
    public decimal CantidadReorden { get; set; }
    public string Ubicacion { get; set; } = string.Empty;

    [Timestamp]
    public byte[] VersionFila { get; set; } = Array.Empty<byte>();

    public Producto Producto { get; set; } = null!;

    public bool EsStockBajo => CantidadDisponible <= UmbralMinimoAlerta;
    public bool EsAgotado => CantidadDisponible <= 0;

    public void AgregarStock(decimal cantidad)
    {
        if (cantidad <= 0) throw new ArgumentException("La cantidad a ingresar debe ser mayor a cero.");
        CantidadDisponible += cantidad;
        FechaActualizacionUtc = DateTime.UtcNow;
    }

    public void DeducirStock(decimal cantidad)
    {
        if (cantidad <= 0) throw new ArgumentException("La cantidad a deducir debe ser mayor a cero.");
        if (CantidadDisponible < cantidad) throw new InvalidOperationException($"Existencias insuficientes. Disponibles: {CantidadDisponible}, solicitadas: {cantidad}");
        CantidadDisponible -= cantidad;
        FechaActualizacionUtc = DateTime.UtcNow;
    }

    public void EstablecerStock(decimal cantidad)
    {
        if (cantidad < 0) throw new ArgumentException("La cantidad de existencias no puede ser negativa.");
        CantidadDisponible = cantidad;
        FechaActualizacionUtc = DateTime.UtcNow;
    }
}
