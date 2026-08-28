using Pos.Application.Common.Interfaces;
using Pos.Application.Common.Security;
using Pos.Domain.Common;
using Pos.Domain.Entidades;

namespace Pos.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedAsync(PosDbContext context, IPasswordHasherService passwordHasher)
    {
        if (context.Users.Any())
        {
            return; // DB has been seeded
        }

        // 1. Roles y Permisos en Español
        var rolAdmin = new Rol { Nombre = "Administrador", Descripcion = "Acceso total al sistema WPC Bajío" };
        var rolCajero = new Rol { Nombre = "Cajero", Descripcion = "Operación del Punto de Venta y Cobro en Caja" };

        context.Roles.AddRange(rolAdmin, rolCajero);

        var permisosArray = new[]
        {
            ("ventas", "procesar", "Procesar ventas"),
            ("ventas", "cancelar", "Cancelar ventas"),
            ("ventas", "descuento", "Aplicar descuentos"),
            ("ventas", "historial", "Ver historial de ventas"),
            ("caja", "aperturar", "Apertura de turno de caja"),
            ("caja", "cerrar", "Cierre de turno de caja"),
            ("caja", "corte_z", "Ejecutar corte Z de caja"),
            ("caja", "sangria", "Registrar retiro o sangría"),
            ("caja", "entrada", "Registrar entrada manual de efectivo"),
            ("catalogo", "productos_ver", "Ver catálogo de productos"),
            ("catalogo", "productos_crear", "Crear productos en catálogo"),
            ("catalogo", "productos_editar", "Editar productos en catálogo"),
            ("catalogo", "categorias_ver", "Ver categorías de productos"),
            ("catalogo", "categorias_crear", "Crear categorías de productos"),
            ("inventario", "ver", "Ver niveles de existencias"),
            ("inventario", "ajustar", "Ajustar inventarios"),
            ("inventario", "movimientos", "Registrar movimientos de stock"),
            ("clientes", "ver", "Ver directorio de clientes"),
            ("clientes", "crear", "Dar de alta nuevos clientes"),
            ("clientes", "editar", "Editar información de clientes"),
            ("clientes", "limite_diario", "Establecer límite diario de venta por cliente"),
            ("comercial", "cotizaciones", "Administrar cotizaciones"),
            ("comercial", "abonos", "Registrar abonos a ventas"),
            ("comercial", "devoluciones", "Procesar devoluciones"),
            ("comercial", "contratos", "Administrar plantillas de contratos"),
            ("reportes", "ver_ventas", "Ver reportes ejecutivos de venta"),
            ("reportes", "ver_inventario", "Ver reportes de inventario"),
            ("usuarios", "administrar", "Administrar usuarios y permisos")
        };

        var entidadesPermiso = new List<Permiso>();
        foreach (var (mod, acc, desc) in permisosArray)
        {
            var p = new Permiso { Modulo = mod, Accion = acc, Descripcion = desc };
            entidadesPermiso.Add(p);
            context.Permissions.Add(p);
            context.RolePermissions.Add(new RolPermiso { Rol = rolAdmin, Permiso = p });
        }

        var permisosCajero = entidadesPermiso.Where(p =>
            p.ClavePermiso is PermissionCodes.Sales.Process
                or PermissionCodes.Catalog.ProductsView
                or PermissionCodes.Customers.View
                or PermissionCodes.Customers.Create).ToList();

        foreach (var permiso in permisosCajero)
        {
            context.RolePermissions.Add(new RolPermiso { Rol = rolCajero, Permiso = permiso });
        }

        // 3. Usuario Administrador Inicial
        var empleadoAdmin = new Empleado
        {
            Nombre = "Administrador",
            Apellido = "General",
            Email = "admin@lambrin.com",
            Puesto = "Gerente General WPC Bajío"
        };

        var usuarioAdmin = new Usuario
        {
            NombreUsuario = "admin",
            Email = "admin@lambrin.com",
            PasswordHash = passwordHasher.HashPassword("Admin123!"),
            Empleado = empleadoAdmin
        };

        context.Users.Add(usuarioAdmin);
        context.UserRoles.Add(new UsuarioRol { Usuario = usuarioAdmin, Rol = rolAdmin });

        // 4. Categorías de Productos WPC Bajío
        var catWpcInterior = new Categoria { Nombre = "Lambrín WPC Interior", Slug = "lambrin-wpc-interior", Descripcion = "Panel decorativo acanalado para muros de interior" };
        var catWpcExterior = new Categoria { Nombre = "Lambrín Co-Extrusión Exterior", Slug = "lambrin-coextrusion-exterior", Descripcion = "Lambrín de alta resistencia con protección UV para fachadas" };

        context.Categories.AddRange(catWpcInterior, catWpcExterior);

        // 5. Productos iniciales WPC Bajío
        var prodInteriorTeka = new Producto
        {
            Sku = "WPC-INT-TEK-01",
            Barcode = "7501234560012",
            Nombre = "Lambrín Interior WPC Tono Teka 16cm x 2.90m",
            Descripcion = "Panel de madera plástica WPC de alta densidad con acabado texturizado tono Teka",
            Categoria = catWpcInterior,
            PrecioUnitario = 350.00m,
            PrecioMayoreo = 290.00m,
            CantidadMinimaMayoreo = 10m,
            UnidadMedida = "Pza",
            CoberturaPorUnidadM2 = 0.464m,
            ImagenUrl = "/logo_wpc_bajio.jpeg",
            PiezasPorCaja = 10,
            CoberturaM2Caja = 4.640m,
            LargoCm = 290m,
            AltoCm = 2.4m,
            AnchoCm = 16m,
            CantidadInventarioInicial = 150m,
            AnchoMm = 160,
            LargoMm = 2900,
            EspesorMm = 24,
            Material = "WPC Madera Plástica",
            SoloCotizacion = false,
            VisibleMasVendido = true
        };

        var prodExteriorRoble = new Producto
        {
            Sku = "WPC-EXT-ROB-02",
            Barcode = "7501234560029",
            Nombre = "Lambrín Exterior Co-Extrusión Roble Oscuro 21cm x 2.90m",
            Descripcion = "Lambrín exterior para intemperie con capa protectora Co-Extrusión tono Roble Oscuro",
            Categoria = catWpcExterior,
            PrecioUnitario = 580.00m,
            PrecioMayoreo = 490.00m,
            CantidadMinimaMayoreo = 15m,
            UnidadMedida = "Pza",
            CoberturaPorUnidadM2 = 0.609m,
            ImagenUrl = "/logo_wpc_bajio.jpeg",
            PiezasPorCaja = 8,
            CoberturaM2Caja = 4.872m,
            LargoCm = 290m,
            AltoCm = 2.8m,
            AnchoCm = 21m,
            CantidadInventarioInicial = 80m,
            AnchoMm = 210,
            LargoMm = 2900,
            EspesorMm = 28,
            Material = "WPC Co-Extrusión UV",
            SoloCotizacion = false,
            VisibleMasVendido = true
        };

        context.Products.AddRange(prodInteriorTeka, prodExteriorRoble);

        // 6. Inventario Inicial
        var stock1 = new Existencia
        {
            Producto = prodInteriorTeka,
            CantidadDisponible = 150m,
            UmbralMinimoAlerta = 20m,
            CantidadReorden = 100m,
            Ubicacion = "Nave A - Pasillo 3"
        };

        var stock2 = new Existencia
        {
            Producto = prodExteriorRoble,
            CantidadDisponible = 80m,
            UmbralMinimoAlerta = 15m,
            CantidadReorden = 50m,
            Ubicacion = "Nave B - Pasillo 1"
        };

        context.Stocks.AddRange(stock1, stock2);

        // 7. Cliente de Mostrador General
        var clientePublico = new Cliente
        {
            Nombre = "Público en General",
            Apellido = "Venta Mostrador",
            Email = "publico@wpcbajio.com",
            Telefono = "4770000000",
            TipoCliente = "Particular"
        };

        context.Customers.Add(clientePublico);

        await context.SaveChangesAsync();
    }
}
