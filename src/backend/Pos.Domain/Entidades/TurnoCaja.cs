using Pos.Domain.Common;

namespace Pos.Domain.Entidades;

public class TurnoCaja : EntidadBase
{
    public string NumeroTurno { get; set; } = string.Empty; // e.g. CAJA-2026-00001
    public Guid UsuarioId { get; set; }
    public decimal MontoApertura { get; set; }
    public decimal TotalVentasEfectivo { get; set; }
    public decimal TotalVentasTarjeta { get; set; }
    public decimal TotalVentasTransferencia { get; set; }
    public decimal TotalEntradas { get; set; }
    public decimal TotalRetiros { get; set; }
    public decimal MontoCierreEsperado { get; set; }
    public decimal MontoCierreReal { get; set; }
    public decimal MontoDiferencia { get; set; }

    public string Estado { get; set; } = CashShiftStatuses.Open;
    public DateTime FechaAperturaUtc { get; set; } = DateTime.UtcNow;
    public DateTime? FechaCierreUtc { get; set; }
    public string Notas { get; set; } = string.Empty;

    public Usuario Usuario { get; set; } = null!;
    public ICollection<TransaccionCaja> Transacciones { get; set; } = new List<TransaccionCaja>();

    public void CalcularEsperado()
    {
        MontoCierreEsperado = MontoApertura + TotalEntradas + TotalVentasEfectivo - TotalRetiros;
    }

    public void CerrarTurno(decimal montoCierreReal)
    {
        CalcularEsperado();
        MontoCierreReal = montoCierreReal;
        MontoDiferencia = MontoCierreReal - MontoCierreEsperado;
        Estado = CashShiftStatuses.Closed;
        FechaCierreUtc = DateTime.UtcNow;
    }
}
