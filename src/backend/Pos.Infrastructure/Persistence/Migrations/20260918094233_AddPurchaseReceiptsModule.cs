using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pos.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseReceiptsModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[SaleItems]') AND name = 'PrecioBase')
                BEGIN
                    ALTER TABLE [SaleItems] ADD [PrecioBase] decimal(18,2) NULL;
                END
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'PrecioOnlineManual')
                BEGIN
                    ALTER TABLE [Products] ADD [PrecioOnlineManual] decimal(18,2) NULL;
                END
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[Customers]') AND name = 'PasswordHash')
                BEGIN
                    ALTER TABLE [Customers] ADD [PasswordHash] nvarchar(max) NULL;
                END
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[Categories]') AND name = 'ImagenUrl')
                BEGIN
                    ALTER TABLE [Categories] ADD [ImagenUrl] nvarchar(500) NOT NULL DEFAULT '';
                END
            ");

            migrationBuilder.CreateTable(
                name: "PurchaseReceipts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Folio = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ProductoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IdProducto = table.Column<int>(type: "int", nullable: false),
                    NombreProducto = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Sku = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CodigoBarras = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PrecioCosto = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PrecioVenta = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    InventarioAnterior = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Cantidad = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    InventarioResultante = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Notas = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FechaCreacionUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaActualizacionUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EstaActivo = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseReceipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReceipts_Products_ProductoId",
                        column: x => x.ProductoId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseReceipts_Users_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SystemSettings')
                BEGIN
                    CREATE TABLE [SystemSettings] (
                        [Id] int NOT NULL IDENTITY,
                        [Clave] nvarchar(100) NOT NULL,
                        [Valor] nvarchar(max) NOT NULL,
                        [Descripcion] nvarchar(max) NULL,
                        [FechaModificacionUtc] datetime2 NOT NULL,
                        CONSTRAINT [PK_SystemSettings] PRIMARY KEY ([Id])
                    );
                    CREATE UNIQUE INDEX [IX_SystemSettings_Clave] ON [SystemSettings] ([Clave]);
                END
            ");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReceipts_Folio",
                table: "PurchaseReceipts",
                column: "Folio",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReceipts_ProductoId",
                table: "PurchaseReceipts",
                column: "ProductoId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReceipts_UsuarioId",
                table: "PurchaseReceipts",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PurchaseReceipts");

            migrationBuilder.DropTable(
                name: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "PrecioBase",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "PrecioOnlineManual",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "PasswordHash",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "ImagenUrl",
                table: "Categories");
        }
    }
}
