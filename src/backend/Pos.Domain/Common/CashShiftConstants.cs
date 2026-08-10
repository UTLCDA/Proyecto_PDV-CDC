namespace Pos.Domain.Common;

public static class CashShiftStatuses
{
    public const string Open = "Abierto";
    public const string Closed = "Cerrado";
}

public static class CashTransactionTypes
{
    public const string Opening = "Apertura";
    public const string ManualWithdrawal = "RetiroManual";
    public const string ManualDeposit = "EntradaManual";
    public const string XReport = "CorteX";
    public const string Closing = "Cierre";
    public const string Installment = "Abono";
    public const string Refund = "Devolucion";
}
