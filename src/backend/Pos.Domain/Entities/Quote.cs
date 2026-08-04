using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class Quote : BaseEntity
{
    public string QuoteNumber { get; set; } = string.Empty; // e.g. COT-2026-0001
    public Guid? CustomerId { get; set; }
    public Guid? UserId { get; set; }

    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime ExpirationDateUtc { get; set; } = DateTime.UtcNow.AddDays(15);
    public string Status { get; set; } = "Active"; // Active, Converted, Expired, Cancelled
    public string Notes { get; set; } = string.Empty;

    public Customer? Customer { get; set; }
    public User? User { get; set; }
    public ICollection<QuoteItem> Items { get; set; } = new List<QuoteItem>();

    public void CalculateTotals(decimal taxRate = 0.16m)
    {
        SubTotal = Items.Sum(i => i.TotalPrice);
        TaxAmount = Math.Round((SubTotal - DiscountAmount) * taxRate, 2);
        TotalAmount = Math.Max(0, SubTotal - DiscountAmount + TaxAmount);
    }
}
