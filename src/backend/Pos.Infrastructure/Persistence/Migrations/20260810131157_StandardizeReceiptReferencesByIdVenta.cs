using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pos.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class StandardizeReceiptReferencesByIdVenta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PaymentInstallments_NumeroRecibo",
                table: "PaymentInstallments");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentInstallments_NumeroRecibo",
                table: "PaymentInstallments",
                column: "NumeroRecibo");

            migrationBuilder.Sql(
                """
                SET XACT_ABORT ON;

                DECLARE @ReceiptCandidates int;
                DECLARE @UpdatedReceipts int;
                DECLARE @CashMovementCandidates int;
                DECLARE @UpdatedCashMovements int;

                SELECT @ReceiptCandidates = COUNT(*)
                FROM dbo.PaymentInstallments AS installment
                INNER JOIN dbo.Sales AS sale ON sale.Id = installment.VentaId
                WHERE sale.IdVenta IS NOT NULL
                  AND installment.NumeroRecibo <> CONCAT(N'RECIBO-', CONVERT(nvarchar(20), sale.IdVenta));

                UPDATE installment
                SET NumeroRecibo = CONCAT(N'RECIBO-', CONVERT(nvarchar(20), sale.IdVenta))
                FROM dbo.PaymentInstallments AS installment
                INNER JOIN dbo.Sales AS sale ON sale.Id = installment.VentaId
                WHERE sale.IdVenta IS NOT NULL
                  AND installment.NumeroRecibo <> CONCAT(N'RECIBO-', CONVERT(nvarchar(20), sale.IdVenta));

                SET @UpdatedReceipts = @@ROWCOUNT;
                IF @UpdatedReceipts <> @ReceiptCandidates
                    THROW 51020, 'La cantidad de recibos migrados no coincide con la cantidad validada.', 1;

                IF EXISTS (
                    SELECT 1
                    FROM dbo.PaymentInstallments AS installment
                    INNER JOIN dbo.Sales AS sale ON sale.Id = installment.VentaId
                    WHERE sale.IdVenta IS NOT NULL
                      AND installment.NumeroRecibo <> CONCAT(N'RECIBO-', CONVERT(nvarchar(20), sale.IdVenta))
                )
                    THROW 51021, 'Persisten recibos asociados a ventas con una referencia no operativa.', 1;

                SELECT @CashMovementCandidates = COUNT(*)
                FROM dbo.CashTransactions AS cashTransaction
                INNER JOIN dbo.Sales AS sale ON sale.IdVenta = cashTransaction.IdVenta
                WHERE cashTransaction.TipoTransaccion = N'Abono'
                  AND cashTransaction.Motivo <> CONCAT(
                      N'Abono RECIBO-', CONVERT(nvarchar(20), sale.IdVenta),
                      N' de Venta #', CONVERT(nvarchar(20), sale.IdVenta));

                UPDATE cashTransaction
                SET Motivo = CONCAT(
                    N'Abono RECIBO-', CONVERT(nvarchar(20), sale.IdVenta),
                    N' de Venta #', CONVERT(nvarchar(20), sale.IdVenta))
                FROM dbo.CashTransactions AS cashTransaction
                INNER JOIN dbo.Sales AS sale ON sale.IdVenta = cashTransaction.IdVenta
                WHERE cashTransaction.TipoTransaccion = N'Abono'
                  AND cashTransaction.Motivo <> CONCAT(
                      N'Abono RECIBO-', CONVERT(nvarchar(20), sale.IdVenta),
                      N' de Venta #', CONVERT(nvarchar(20), sale.IdVenta));

                SET @UpdatedCashMovements = @@ROWCOUNT;
                IF @UpdatedCashMovements <> @CashMovementCandidates
                    THROW 51022, 'La cantidad de movimientos de caja migrados no coincide con la cantidad validada.', 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF EXISTS (
                    SELECT NumeroRecibo
                    FROM dbo.PaymentInstallments
                    GROUP BY NumeroRecibo
                    HAVING COUNT(*) > 1
                )
                    THROW 51023, 'No se puede restaurar el indice unico: existen varios abonos validos para una misma venta.', 1;
                """);

            migrationBuilder.DropIndex(
                name: "IX_PaymentInstallments_NumeroRecibo",
                table: "PaymentInstallments");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentInstallments_NumeroRecibo",
                table: "PaymentInstallments",
                column: "NumeroRecibo",
                unique: true);
        }
    }
}
