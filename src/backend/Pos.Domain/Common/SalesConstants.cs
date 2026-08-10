namespace Pos.Domain.Common;

public static class SalePaymentTypes
{
    public const string FullPayment = "FullPayment";
    public const string AdvanceDeposit = "AdvanceDeposit";
    public const string MixedPayment = "MixedPayment";

    public static IReadOnlySet<string> All { get; } = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        FullPayment,
        AdvanceDeposit,
        MixedPayment
    };
}

public static class SaleStatuses
{
    public const string Completed = "Completada";
    public const string DepositPaid = "ApartadoPagado";
    public const string Cancelled = "Cancelada";
    public const string PartiallyReturned = "DevolucionParcial";
    public const string Returned = "Devuelta";
}

public static class InventoryMovementTypes
{
    public const string Sale = "Venta";
    public const string Return = "Devolucion";
}
