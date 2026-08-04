using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class QuoteItem : BaseEntity
{
    public Guid QuoteId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalPrice { get; set; }

    public Quote Quote { get; set; } = null!;
    public Product Product { get; set; } = null!;

    public void CalculateItemTotal()
    {
        TotalPrice = Math.Max(0, (Quantity * UnitPrice) - DiscountAmount);
    }
}
