using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pos.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CompleteCommercialOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "NumeroDevolucion",
                table: "ReturnHeaders",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "FormaReembolso",
                table: "ReturnHeaders",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "StoreCredit");

            migrationBuilder.AddColumn<decimal>(
                name: "MontoAplicadoSaldoPendiente",
                table: "ReturnHeaders",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MontoReembolsado",
                table: "ReturnHeaders",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<string>(
                name: "NumeroCotizacion",
                table: "Quotes",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "NumeroRecibo",
                table: "PaymentInstallments",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Rfc",
                table: "Customers",
                type: "nvarchar(13)",
                maxLength: 13,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Customers",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnHeaders_NumeroDevolucion",
                table: "ReturnHeaders",
                column: "NumeroDevolucion",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_NumeroCotizacion",
                table: "Quotes",
                column: "NumeroCotizacion",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentInstallments_NumeroRecibo",
                table: "PaymentInstallments",
                column: "NumeroRecibo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Email",
                table: "Customers",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Rfc",
                table: "Customers",
                column: "Rfc",
                unique: true,
                filter: "[Rfc] IS NOT NULL AND [Rfc] <> N''");

            migrationBuilder.Sql(
                """
                UPDATE [ReturnHeaders]
                SET [FormaReembolso] = N'StoreCredit',
                    [MontoReembolsado] = [MontoTotalDevuelto]
                WHERE [FormaReembolso] = N'';

                DECLARE @NowUtc datetime2 = SYSUTCDATETIME();

                IF NOT EXISTS (SELECT 1 FROM [Permissions] WHERE [Modulo] = N'comercial' AND [Accion] = N'cotizaciones')
                BEGIN
                    INSERT INTO [Permissions] ([Id], [Modulo], [Accion], [Descripcion], [FechaCreacionUtc], [FechaActualizacionUtc], [EstaActivo])
                    VALUES (NEWID(), N'comercial', N'cotizaciones', N'Administrar cotizaciones', @NowUtc, NULL, 1);
                END;

                IF NOT EXISTS (SELECT 1 FROM [Permissions] WHERE [Modulo] = N'comercial' AND [Accion] = N'contratos')
                BEGIN
                    INSERT INTO [Permissions] ([Id], [Modulo], [Accion], [Descripcion], [FechaCreacionUtc], [FechaActualizacionUtc], [EstaActivo])
                    VALUES (NEWID(), N'comercial', N'contratos', N'Administrar plantillas de contratos', @NowUtc, NULL, 1);
                END;

                INSERT INTO [RolePermissions] ([RolId], [PermisoId])
                SELECT role.[Id], permission.[Id]
                FROM [Roles] role
                CROSS JOIN [Permissions] permission
                WHERE role.[Nombre] = N'Administrador'
                  AND permission.[Modulo] = N'comercial'
                  AND permission.[Accion] IN (N'cotizaciones', N'contratos')
                  AND NOT EXISTS (
                      SELECT 1 FROM [RolePermissions] existing
                      WHERE existing.[RolId] = role.[Id] AND existing.[PermisoId] = permission.[Id]
                  );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE rolePermission
                FROM [RolePermissions] rolePermission
                INNER JOIN [Permissions] permission ON permission.[Id] = rolePermission.[PermisoId]
                WHERE permission.[Modulo] = N'comercial'
                  AND permission.[Accion] IN (N'cotizaciones', N'contratos');

                DELETE FROM [Permissions]
                WHERE [Modulo] = N'comercial'
                  AND [Accion] IN (N'cotizaciones', N'contratos');
                """);

            migrationBuilder.DropIndex(
                name: "IX_ReturnHeaders_NumeroDevolucion",
                table: "ReturnHeaders");

            migrationBuilder.DropIndex(
                name: "IX_Quotes_NumeroCotizacion",
                table: "Quotes");

            migrationBuilder.DropIndex(
                name: "IX_PaymentInstallments_NumeroRecibo",
                table: "PaymentInstallments");

            migrationBuilder.DropIndex(
                name: "IX_Customers_Email",
                table: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_Customers_Rfc",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "FormaReembolso",
                table: "ReturnHeaders");

            migrationBuilder.DropColumn(
                name: "MontoAplicadoSaldoPendiente",
                table: "ReturnHeaders");

            migrationBuilder.DropColumn(
                name: "MontoReembolsado",
                table: "ReturnHeaders");

            migrationBuilder.AlterColumn<string>(
                name: "NumeroDevolucion",
                table: "ReturnHeaders",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.AlterColumn<string>(
                name: "NumeroCotizacion",
                table: "Quotes",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.AlterColumn<string>(
                name: "NumeroRecibo",
                table: "PaymentInstallments",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.AlterColumn<string>(
                name: "Rfc",
                table: "Customers",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(13)",
                oldMaxLength: 13,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Customers",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(256)",
                oldMaxLength: 256);
        }
    }
}
