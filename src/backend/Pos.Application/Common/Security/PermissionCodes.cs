namespace Pos.Application.Common.Security;

public static class PermissionCodes
{
    public const string ClaimType = "permission";

    public static class Sales
    {
        public const string Process = "ventas:procesar";
        public const string Cancel = "ventas:cancelar";
        public const string Discount = "ventas:descuento";
        public const string History = "ventas:historial";
    }

    public static class Cash
    {
        public const string Open = "caja:aperturar";
        public const string Close = "caja:cerrar";
        public const string ZReport = "caja:corte_z";
        public const string Withdrawal = "caja:sangria";
        public const string Deposit = "caja:entrada";
    }

    public static class Catalog
    {
        public const string ProductsView = "catalogo:productos_ver";
        public const string ProductsCreate = "catalogo:productos_crear";
        public const string ProductsEdit = "catalogo:productos_editar";
        public const string CategoriesView = "catalogo:categorias_ver";
        public const string CategoriesCreate = "catalogo:categorias_crear";
    }

    public static class Inventory
    {
        public const string View = "inventario:ver";
        public const string Adjust = "inventario:ajustar";
        public const string Movements = "inventario:movimientos";
    }

    public static class Customers
    {
        public const string View = "clientes:ver";
        public const string Create = "clientes:crear";
        public const string Edit = "clientes:editar";
        public const string DailyLimit = "clientes:limite_diario";
    }

    public static class Commercial
    {
        public const string Quotes = "comercial:cotizaciones";
        public const string Installments = "comercial:abonos";
        public const string Returns = "comercial:devoluciones";
        public const string Contracts = "comercial:contratos";
    }

    public static class Reports
    {
        public const string SalesView = "reportes:ver_ventas";
        public const string InventoryView = "reportes:ver_inventario";
    }

    public static class Users
    {
        public const string Administer = "usuarios:administrar";
    }

    public static IReadOnlyCollection<string> All { get; } =
    [
        Sales.Process,
        Sales.Cancel,
        Sales.Discount,
        Sales.History,
        Cash.Open,
        Cash.Close,
        Cash.ZReport,
        Cash.Withdrawal,
        Cash.Deposit,
        Catalog.ProductsView,
        Catalog.ProductsCreate,
        Catalog.ProductsEdit,
        Catalog.CategoriesView,
        Catalog.CategoriesCreate,
        Inventory.View,
        Inventory.Adjust,
        Inventory.Movements,
        Customers.View,
        Customers.Create,
        Customers.Edit,
        Customers.DailyLimit,
        Commercial.Quotes,
        Commercial.Installments,
        Commercial.Returns,
        Commercial.Contracts,
        Reports.SalesView,
        Reports.InventoryView,
        Users.Administer
    ];
}
