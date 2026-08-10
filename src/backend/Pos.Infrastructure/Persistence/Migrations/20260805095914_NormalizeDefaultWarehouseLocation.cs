using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pos.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeDefaultWarehouseLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "IF OBJECT_ID(N'Stocks', N'U') IS NOT NULL " +
                "UPDATE [Stocks] SET [Ubicacion] = N'Bodega Adolfo Lopez Mateos' " +
                "WHERE [Ubicacion] = N'Almacén Principal';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data normalization is intentionally not reverted because the previous
            // value cannot be distinguished safely from valid warehouse locations.
        }
    }
}
