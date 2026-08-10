using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pos.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueOperationalFolios : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "NumeroFolio",
                table: "Sales",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "NumeroTurno",
                table: "CashShifts",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_NumeroFolio",
                table: "Sales",
                column: "NumeroFolio",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CashShifts_NumeroTurno",
                table: "CashShifts",
                column: "NumeroTurno",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sales_NumeroFolio",
                table: "Sales");

            migrationBuilder.DropIndex(
                name: "IX_CashShifts_NumeroTurno",
                table: "CashShifts");

            migrationBuilder.AlterColumn<string>(
                name: "NumeroFolio",
                table: "Sales",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.AlterColumn<string>(
                name: "NumeroTurno",
                table: "CashShifts",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);
        }
    }
}
