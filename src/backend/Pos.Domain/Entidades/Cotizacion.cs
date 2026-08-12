using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class Cotizacion : EntidadBase
{
    public string NumeroCotizacion { get; set; } = string.Empty; // e.g. COT-2026-00001
    public Guid? ClienteId { get; set; }
    public Guid? UsuarioId { get; set; }

    public decimal SubTotal { get; set; }
    public decimal MontoDescuento { get; set; }
    public decimal MontoIva { get; set; }
    public decimal MontoTotal { get; set; }
    public DateTime FechaVigenciaUtc { get; set; } = DateTime.UtcNow.AddDays(15);
    public string Estado { get; set; } = QuoteStatuses.Active;
    public string Notas { get; set; } = string.Empty;

    public Cliente? Cliente { get; set; }
    public Usuario? Usuario { get; set; }
    public ICollection<PartidaCotizacion> Partidas { get; set; } = new List<PartidaCotizacion>();

    public void CalcularTotales(decimal tasaIva = 0.16m)
    {
        SubTotal = Partidas.Sum(p => p.PrecioTotal);
        MontoIva = Math.Round(SubTotal * tasaIva, 2);
        MontoTotal = Math.Max(0, SubTotal - MontoDescuento + MontoIva);
    }
}
