using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class ReturnItem : BaseEntity
{
    public Guid ReturnHeaderId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal RefundUnitPrice { get; set; }
    public decimal TotalRefundPrice { get; set; }

    public ReturnHeader ReturnHeader { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
