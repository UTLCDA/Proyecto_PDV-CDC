using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class PaymentInstallment : BaseEntity
{
    public Guid SaleId { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty; // RECIBO-{IdVenta}
    public decimal AmountPaid { get; set; }
    public decimal PreviousPendingBalance { get; set; }
    public decimal NewPendingBalance { get; set; }
    public string PaymentMethod { get; set; } = "Cash"; // Cash, Card, Transfer
    public Guid? UserId { get; set; }
    public string Notes { get; set; } = string.Empty;

    public Sale Sale { get; set; } = null!;
    public User? User { get; set; }
}
