namespace Pos.Domain.Entidades;

public class ConfiguracionSistema
{
    public int Id { get; set; }
    public string Clave { get; set; } = string.Empty;
    public string Valor { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public DateTime FechaModificacionUtc { get; set; } = DateTime.UtcNow;
}
