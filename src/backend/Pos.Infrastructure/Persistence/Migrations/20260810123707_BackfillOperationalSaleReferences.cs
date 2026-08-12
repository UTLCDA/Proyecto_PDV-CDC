using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pos.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BackfillOperationalSaleReferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE inventoryMovement
                SET inventoryMovement.IdVenta = sale.IdVenta
                FROM InventoryMovements AS inventoryMovement
                INNER JOIN Sales AS sale
                    ON sale.NumeroFolio = inventoryMovement.NumeroReferencia
                WHERE inventoryMovement.IdVenta IS NULL
                  AND inventoryMovement.TipoMovimiento = N'Venta';

                UPDATE inventoryMovement
                SET inventoryMovement.IdVenta = returnHeader.IdVenta
                FROM InventoryMovements AS inventoryMovement
                INNER JOIN ReturnHeaders AS returnHeader
                    ON returnHeader.NumeroDevolucion = inventoryMovement.NumeroReferencia
                WHERE inventoryMovement.IdVenta IS NULL
                  AND returnHeader.IdVenta IS NOT NULL
                  AND inventoryMovement.TipoMovimiento = N'Devolucion';

                UPDATE cashTransaction
                SET cashTransaction.IdVenta = installment.IdVenta
                FROM CashTransactions AS cashTransaction
                INNER JOIN PaymentInstallments AS installment
                    ON cashTransaction.Motivo LIKE N'%' + installment.NumeroRecibo + N'%'
                WHERE cashTransaction.IdVenta IS NULL
                  AND installment.IdVenta IS NOT NULL
                  AND cashTransaction.TipoTransaccion = N'Abono';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty. IdVenta is authoritative sale data, and clearing a
            // verified operational reference during rollback would be destructive.
        }
    }
}
