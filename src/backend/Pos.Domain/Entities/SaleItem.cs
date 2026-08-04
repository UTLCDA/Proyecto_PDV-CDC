using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class SaleItem : BaseEntity
{
    public Guid SaleId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalPrice { get; set; }

    public Sale Sale { get; set; } = null!;
    public Product Product { get; set; } = null!;

    public void CalculateItemTotal()
    {
        TotalPrice = Math.Max(0, (Quantity * UnitPrice) - DiscountAmount);
    }
}
