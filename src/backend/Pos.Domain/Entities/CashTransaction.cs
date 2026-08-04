using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class CashTransaction : BaseEntity
{
    public Guid CashShiftId { get; set; }
    public string TransactionType { get; set; } = "Opening"; // Opening, SaleInflow, InstallmentInflow, ManualWithdrawal
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public Guid? UserId { get; set; }

    public CashShift CashShift { get; set; } = null!;
    public User? User { get; set; }
}
