using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pos.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIdVentaOperationalFolio : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "IdVenta",
                table: "Sales",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<int>(
                name: "IdVenta",
                table: "SaleItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IdVenta",
                table: "ReturnHeaders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IdVenta",
                table: "PaymentInstallments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IdVenta",
                table: "InventoryMovements",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IdVenta",
                table: "CashTransactions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_IdVenta",
                table: "Sales",
                column: "IdVenta",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SaleItems_IdVenta",
                table: "SaleItems",
                column: "IdVenta");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnHeaders_IdVenta",
                table: "ReturnHeaders",
                column: "IdVenta");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentInstallments_IdVenta",
                table: "PaymentInstallments",
                column: "IdVenta");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryMovements_IdVenta",
                table: "InventoryMovements",
                column: "IdVenta");

            migrationBuilder.CreateIndex(
                name: "IX_CashTransactions_IdVenta",
                table: "CashTransactions",
                column: "IdVenta");

            // Populate historical records using existing GUID VentaId relationships
            migrationBuilder.Sql(@"
                UPDATE si SET si.IdVenta = s.IdVenta FROM [SaleItems] si INNER JOIN [Sales] s ON si.VentaId = s.Id WHERE si.IdVenta IS NULL;
                UPDATE pi SET pi.IdVenta = s.IdVenta FROM [PaymentInstallments] pi INNER JOIN [Sales] s ON pi.VentaId = s.Id WHERE pi.IdVenta IS NULL;
                UPDATE rh SET rh.IdVenta = s.IdVenta FROM [ReturnHeaders] rh INNER JOIN [Sales] s ON rh.VentaId = s.Id WHERE rh.IdVenta IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sales_IdVenta",
                table: "Sales");

            migrationBuilder.DropIndex(
                name: "IX_SaleItems_IdVenta",
                table: "SaleItems");

            migrationBuilder.DropIndex(
                name: "IX_ReturnHeaders_IdVenta",
                table: "ReturnHeaders");

            migrationBuilder.DropIndex(
                name: "IX_PaymentInstallments_IdVenta",
                table: "PaymentInstallments");

            migrationBuilder.DropIndex(
                name: "IX_InventoryMovements_IdVenta",
                table: "InventoryMovements");

            migrationBuilder.DropIndex(
                name: "IX_CashTransactions_IdVenta",
                table: "CashTransactions");

            migrationBuilder.DropColumn(
                name: "IdVenta",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "IdVenta",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "IdVenta",
                table: "ReturnHeaders");

            migrationBuilder.DropColumn(
                name: "IdVenta",
                table: "PaymentInstallments");

            migrationBuilder.DropColumn(
                name: "IdVenta",
                table: "InventoryMovements");

            migrationBuilder.DropColumn(
                name: "IdVenta",
                table: "CashTransactions");
        }
    }
}
