using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class ReturnHeader : BaseEntity
{
    public string ReturnNumber { get; set; } = string.Empty; // e.g. DEV-2026-0001
    public Guid SaleId { get; set; }
    public Guid? UserId { get; set; }
    public decimal TotalRefundAmount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "Completed"; // Completed, PendingInspection

    public Sale Sale { get; set; } = null!;
    public User? User { get; set; }
    public ICollection<ReturnItem> Items { get; set; } = new List<ReturnItem>();
}
