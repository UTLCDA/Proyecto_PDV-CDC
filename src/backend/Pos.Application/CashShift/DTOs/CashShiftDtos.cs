namespace Pos.Application.CashShift.DTOs;

public record OpenCashShiftDto(
    decimal OpeningAmount,
    string Notes
);

public record CashWithdrawalDto(
    decimal Amount,
    string Reason
);

public record CashDepositDto(
    decimal Amount,
    string Reason
);

public record CloseCashShiftDto(
    decimal ActualClosingAmount,
    string Notes
);

public record CashTransactionDto(
    Guid Id,
    string TransactionType,
    decimal Amount,
    string Reason,
    string? UserUsername,
    DateTime CreatedAtUtc
);

public record CashGeneralMovementDto(
    string Id,
    string Category,
    string Reference,
    string PaymentMethod,
    decimal Amount,
    string? UserUsername,
    DateTime CreatedAtUtc
);

public record CashShiftDto(
    Guid Id,
    string ShiftNumber,
    Guid UserId,
    string UserUsername,
    decimal OpeningAmount,
    decimal TotalSalesCash,
    decimal TotalSalesCard,
    decimal TotalSalesTransfer,
    decimal TotalCashDeposits,
    decimal TotalWithdrawals,
    decimal ExpectedClosingAmount,
    decimal ActualClosingAmount,
    decimal DifferenceAmount,
    string Status,
    DateTime OpenedAtUtc,
    DateTime? ClosedAtUtc,
    string Notes,
    List<CashTransactionDto> Transactions
);
