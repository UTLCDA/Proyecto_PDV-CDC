namespace Pos.Domain.Entidades;

public class SaludSistema
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Estado { get; set; } = "Operativo";
    public string NombreServicio { get; set; } = "WPC Bajío POS API";
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
}
