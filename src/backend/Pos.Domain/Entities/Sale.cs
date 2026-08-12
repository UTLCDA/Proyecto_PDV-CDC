using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class Sale : BaseEntity
{
    public string FolioNumber { get; set; } = string.Empty; // e.g. VENTA-2026-0001
    public Guid? CustomerId { get; set; }
    public Guid? UserId { get; set; }

    public string PaymentType { get; set; } = "FullPayment"; // FullPayment, AdvanceDeposit
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AdvanceAmount { get; set; }
    public decimal PendingBalance { get; set; }

    public string Status { get; set; } = "Completed"; // Completed, AdvancePaid, PendingBalance, Cancelled
    public string Notes { get; set; } = string.Empty;

    public Customer? Customer { get; set; }
    public User? User { get; set; }
    public ICollection<SaleItem> Items { get; set; } = new List<SaleItem>();

    public void CalculateTotals(decimal taxRate = 0.16m)
    {
        SubTotal = Items.Sum(i => i.TotalPrice);
        TaxAmount = Math.Round(SubTotal * taxRate, 2);
        TotalAmount = Math.Max(0, SubTotal - DiscountAmount + TaxAmount);

        if (PaymentType == "AdvanceDeposit")
        {
            PendingBalance = Math.Max(0, TotalAmount - AdvanceAmount);
            Status = PendingBalance > 0 ? "AdvancePaid" : "Completed";
        }
        else
        {
            AdvanceAmount = TotalAmount;
            PendingBalance = 0m;
            Status = "Completed";
        }
    }
}
