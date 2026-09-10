using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pos.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIdProductoIdentityToProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Products') AND name = 'Color')
                BEGIN
                    ALTER TABLE [Products] ADD [Color] nvarchar(100) NOT NULL DEFAULT '';
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Products') AND name = 'IdProducto')
                BEGIN
                    ALTER TABLE [Products] ADD [IdProducto] int IDENTITY(1,1) NOT NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Products') AND name = 'IX_Products_IdProducto')
                BEGIN
                    CREATE UNIQUE INDEX [IX_Products_IdProducto] ON [Products] ([IdProducto]);
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Products') AND name = 'IX_Products_IdProducto')
                BEGIN
                    DROP INDEX [IX_Products_IdProducto] ON [Products];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Products') AND name = 'IdProducto')
                BEGIN
                    ALTER TABLE [Products] DROP COLUMN [IdProducto];
                END
            ");
        }
    }
}
