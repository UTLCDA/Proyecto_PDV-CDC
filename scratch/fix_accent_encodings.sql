USE [PosLambrinDb];
GO

-- 1. Actualizar Roles
UPDATE [Roles] SET [Nombre] = N'Administrador', [Descripcion] = N'Acceso total al sistema WPC Bajío' WHERE [Nombre] LIKE 'Admin%';
UPDATE [Roles] SET [Nombre] = N'Cajero', [Descripcion] = N'Operación del Punto de Venta y Cobro en Caja' WHERE [Nombre] LIKE 'Caj%';

-- 2. Actualizar Empleados
UPDATE [Employees] SET [Puesto] = N'Gerente General WPC Bajío' WHERE [Email] = 'admin@lambrin.com';

-- 3. Actualizar Permisos
UPDATE [Permissions] SET [Descripcion] = N'Procesar ventas' WHERE [Modulo] = 'ventas' AND [Accion] = 'procesar';
UPDATE [Permissions] SET [Descripcion] = N'Cancelar ventas' WHERE [Modulo] = 'ventas' AND [Accion] = 'cancelar';
UPDATE [Permissions] SET [Descripcion] = N'Aplicar descuentos' WHERE [Modulo] = 'ventas' AND [Accion] = 'descuento';
UPDATE [Permissions] SET [Descripcion] = N'Ver historial de ventas' WHERE [Modulo] = 'ventas' AND [Accion] = 'historial';
UPDATE [Permissions] SET [Descripcion] = N'Apertura de turno de caja' WHERE [Modulo] = 'caja' AND [Accion] = 'aperturar';
UPDATE [Permissions] SET [Descripcion] = N'Cierre de turno de caja' WHERE [Modulo] = 'caja' AND [Accion] = 'cerrar';
UPDATE [Permissions] SET [Descripcion] = N'Ejecutar corte Z de caja' WHERE [Modulo] = 'caja' AND [Accion] = 'corte_z';
UPDATE [Permissions] SET [Descripcion] = N'Registrar retiro o sangría' WHERE [Modulo] = 'caja' AND [Accion] = 'sangria';
UPDATE [Permissions] SET [Descripcion] = N'Registrar entrada manual de efectivo' WHERE [Modulo] = 'caja' AND [Accion] = 'entrada';
UPDATE [Permissions] SET [Descripcion] = N'Ver catálogo de productos' WHERE [Modulo] = 'catalogo' AND [Accion] = 'productos_ver';
UPDATE [Permissions] SET [Descripcion] = N'Crear productos en catálogo' WHERE [Modulo] = 'catalogo' AND [Accion] = 'productos_crear';
UPDATE [Permissions] SET [Descripcion] = N'Editar productos en catálogo' WHERE [Modulo] = 'catalogo' AND [Accion] = 'productos_editar';
UPDATE [Permissions] SET [Descripcion] = N'Ver categorías de productos' WHERE [Modulo] = 'catalogo' AND [Accion] = 'categorias_ver';
UPDATE [Permissions] SET [Descripcion] = N'Crear categorías de productos' WHERE [Modulo] = 'catalogo' AND [Accion] = 'categorias_crear';
UPDATE [Permissions] SET [Descripcion] = N'Ver niveles de existencias' WHERE [Modulo] = 'inventario' AND [Accion] = 'ver';
UPDATE [Permissions] SET [Descripcion] = N'Ajustar inventarios' WHERE [Modulo] = 'inventario' AND [Accion] = 'ajustar';
UPDATE [Permissions] SET [Descripcion] = N'Registrar movimientos de stock' WHERE [Modulo] = 'inventario' AND [Accion] = 'movimientos';
UPDATE [Permissions] SET [Descripcion] = N'Ver directorio de clientes' WHERE [Modulo] = 'clientes' AND [Accion] = 'ver';
UPDATE [Permissions] SET [Descripcion] = N'Dar de alta nuevos clientes' WHERE [Modulo] = 'clientes' AND [Accion] = 'crear';
UPDATE [Permissions] SET [Descripcion] = N'Editar información de clientes' WHERE [Modulo] = 'clientes' AND [Accion] = 'editar';
UPDATE [Permissions] SET [Descripcion] = N'Establecer límite diario de venta por cliente' WHERE [Modulo] = 'clientes' AND [Accion] = 'limite_diario';
UPDATE [Permissions] SET [Descripcion] = N'Administrar cotizaciones' WHERE [Modulo] = 'comercial' AND [Accion] = 'cotizaciones';
UPDATE [Permissions] SET [Descripcion] = N'Registrar abonos a ventas' WHERE [Modulo] = 'comercial' AND [Accion] = 'abonos';
UPDATE [Permissions] SET [Descripcion] = N'Procesar devoluciones' WHERE [Modulo] = 'comercial' AND [Accion] = 'devoluciones';
UPDATE [Permissions] SET [Descripcion] = N'Administrar plantillas de contratos' WHERE [Modulo] = 'comercial' AND [Accion] = 'contratos';
UPDATE [Permissions] SET [Descripcion] = N'Ver reportes ejecutivos de venta' WHERE [Modulo] = 'reportes' AND [Accion] = 'ver_ventas';
UPDATE [Permissions] SET [Descripcion] = N'Ver reportes de inventario' WHERE [Modulo] = 'reportes' AND [Accion] = 'ver_inventario';
UPDATE [Permissions] SET [Descripcion] = N'Administrar usuarios y permisos' WHERE [Modulo] = 'usuarios' AND [Accion] = 'administrar';

-- 4. Actualizar Categorías
UPDATE [Categories] SET [Nombre] = N'Lambrín WPC Interior', [Descripcion] = N'Panel decorativo acanalado para muros de interior' WHERE [Slug] = 'lambrin-wpc-interior';
UPDATE [Categories] SET [Nombre] = N'Lambrín Co-Extrusión Exterior', [Descripcion] = N'Lambrín de alta resistencia con protección UV para fachadas' WHERE [Slug] = 'lambrin-coextrusion-exterior';

-- 5. Actualizar Productos
UPDATE [Products] SET [Nombre] = N'Lambrín Interior WPC Tono Teka 16cm x 2.90m', [Descripcion] = N'Panel de madera plástica WPC de alta densidad con acabado texturizado tono Teka' WHERE [Sku] = 'WPC-INT-TEK-01';
UPDATE [Products] SET [Nombre] = N'Lambrín Exterior Co-Extrusión Tono Nogal 14cm x 2.90m', [Descripcion] = N'Lambrín para fachadas e interiores húmedos con capataz protector de alto impacto y protección UV' WHERE [Sku] = 'WPC-EXT-NOG-02';

-- 6. Actualizar Clientes
UPDATE [Customers] SET [Nombre] = N'Público en General', [Apellido] = N'Venta Mostrador', [Direccion] = N'Mostrador WPC Bajío' WHERE [Email] = 'publico@wpcbajio.com';
GO
