using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class InventoryMovement : BaseEntity
{
    public Guid ProductId { get; set; }
    public string MovementType { get; set; } = "Entry"; // Entry, Exit, Adjustment, Sale, Return
    public decimal Quantity { get; set; }
    public decimal PreviousQuantity { get; set; }
    public decimal NewQuantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string ReferenceNumber { get; set; } = string.Empty;
    public Guid? UserId { get; set; }

    public Product Product { get; set; } = null!;
    public User? User { get; set; }
}
