USE [PosLambrinDb];
GO

-- 1. Insertar Rol Cajero si no existe
DECLARE @RolCajeroId UNIQUEIDENTIFIER = 'E7B81234-5678-4900-A111-000000000005';

IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [Nombre] = N'Cajero')
BEGIN
    INSERT INTO [Roles] ([Id], [Nombre], [Descripcion], [FechaCreacionUtc], [EstaActivo])
    VALUES (@RolCajeroId, N'Cajero', N'Operación del Punto de Venta y Cobro en Caja', GETUTCDATE(), 1);
END
ELSE
BEGIN
    SELECT @RolCajeroId = [Id] FROM [Roles] WHERE [Nombre] = N'Cajero';
END;

-- 2. Permisos para Rol Cajero
INSERT INTO [RolePermissions] ([RolId], [PermisoId])
SELECT @RolCajeroId, p.[Id]
FROM [Permissions] p
WHERE NOT EXISTS (
    SELECT 1 FROM [RolePermissions] rp WHERE rp.[RolId] = @RolCajeroId AND rp.[PermisoId] = p.[Id]
) AND (
    (p.[Modulo] = 'ventas' AND p.[Accion] IN ('procesar', 'cancelar', 'descuento', 'historial')) OR
    (p.[Modulo] = 'caja' AND p.[Accion] IN ('aperturar', 'cerrar', 'corte_z', 'sangria', 'entrada')) OR
    (p.[Modulo] = 'catalogo' AND p.[Accion] IN ('productos_ver', 'categorias_ver')) OR
    (p.[Modulo] = 'inventario' AND p.[Accion] IN ('ver')) OR
    (p.[Modulo] = 'clientes' AND p.[Accion] IN ('ver', 'crear', 'editar')) OR
    (p.[Modulo] = 'comercial' AND p.[Accion] IN ('cotizaciones', 'abonos'))
);
GO
