using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class CashShift : BaseEntity
{
    public string ShiftNumber { get; set; } = string.Empty; // e.g. CAJA-2026-0001
    public Guid UserId { get; set; }
    public decimal OpeningAmount { get; set; }
    public decimal TotalSalesCash { get; set; }
    public decimal TotalSalesCard { get; set; }
    public decimal TotalSalesTransfer { get; set; }
    public decimal TotalWithdrawals { get; set; }
    public decimal ExpectedClosingAmount { get; set; }
    public decimal ActualClosingAmount { get; set; }
    public decimal DifferenceAmount { get; set; }

    public string Status { get; set; } = "Open"; // Open, Closed
    public DateTime OpenedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAtUtc { get; set; }
    public string Notes { get; set; } = string.Empty;

    public User User { get; set; } = null!;
    public ICollection<CashTransaction> Transactions { get; set; } = new List<CashTransaction>();

    public void CalculateExpected()
    {
        ExpectedClosingAmount = OpeningAmount + TotalSalesCash - TotalWithdrawals;
    }

    public void CloseShift(decimal actualClosingAmount)
    {
        CalculateExpected();
        ActualClosingAmount = actualClosingAmount;
        DifferenceAmount = ActualClosingAmount - ExpectedClosingAmount;
        Status = "Closed";
        ClosedAtUtc = DateTime.UtcNow;
    }
}
