using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class TransaccionCaja : EntidadBase
{
    public Guid TurnoCajaId { get; set; }
    public string TipoTransaccion { get; set; } = CashTransactionTypes.Opening;
    public decimal Monto { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public Guid? UsuarioId { get; set; }

    public TurnoCaja TurnoCaja { get; set; } = null!;
    public Usuario? Usuario { get; set; }
}
