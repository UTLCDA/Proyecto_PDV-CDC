namespace Pos.Domain.Common;

public static class CustomerTypes
{
    public const string Retail = "Particular";
    public const string Wholesale = "Mayorista";
    public const string Professional = "Arquitecto/Constructor";

    public static IReadOnlyCollection<string> All { get; } = [Retail, Wholesale, Professional];
}

public static class QuoteStatuses
{
    public const string Active = "Activa";
    public const string Processing = "Procesando";
    public const string Converted = "Convertida";
    public const string Expired = "Expirada";
    public const string Cancelled = "Cancelada";
}

public static class PaymentMethods
{
    public const string Cash = "Cash";
    public const string Card = "Card";
    public const string Transfer = "Transfer";

    public static IReadOnlyCollection<string> All { get; } = [Cash, Card, Transfer];
}

public static class ReturnStatuses
{
    public const string Completed = "Completada";
}

public static class RefundMethods
{
    public const string Cash = PaymentMethods.Cash;
    public const string Card = PaymentMethods.Card;
    public const string Transfer = PaymentMethods.Transfer;
    public const string StoreCredit = "StoreCredit";

    public static IReadOnlyCollection<string> All { get; } = [Cash, Card, Transfer, StoreCredit];
}

public static class DocumentTemplateCategories
{
    public const string SaleContract = "ContratoVenta";
    public const string DepositContract = "ContratoApartado";
    public const string InstallmentReceipt = "ReciboAbono";

    public static IReadOnlyCollection<string> All { get; } = [SaleContract, DepositContract, InstallmentReceipt];
}
