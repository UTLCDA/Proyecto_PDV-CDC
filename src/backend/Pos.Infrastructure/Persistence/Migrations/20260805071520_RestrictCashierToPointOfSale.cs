using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pos.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RestrictCashierToPointOfSale : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE rolePermission
                FROM [RolePermissions] AS rolePermission
                INNER JOIN [Roles] AS role ON rolePermission.[RolId] = role.[Id]
                INNER JOIN [Permissions] AS permission ON rolePermission.[PermisoId] = permission.[Id]
                WHERE role.[Nombre] = N'Cajero'
                  AND NOT (
                      (permission.[Modulo] = N'ventas' AND permission.[Accion] = N'procesar')
                      OR (permission.[Modulo] = N'catalogo' AND permission.[Accion] = N'productos_ver')
                      OR (permission.[Modulo] = N'clientes' AND permission.[Accion] = N'ver')
                  );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                INSERT INTO [RolePermissions] ([RolId], [PermisoId])
                SELECT role.[Id], permission.[Id]
                FROM [Roles] AS role
                CROSS JOIN [Permissions] AS permission
                WHERE role.[Nombre] = N'Cajero'
                  AND (
                      permission.[Modulo] IN (N'ventas', N'caja', N'clientes', N'catalogo')
                      OR (permission.[Modulo] = N'comercial' AND permission.[Accion] = N'abonos')
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM [RolePermissions] AS existing
                      WHERE existing.[RolId] = role.[Id]
                        AND existing.[PermisoId] = permission.[Id]
                  );
                """);
        }
    }
}
