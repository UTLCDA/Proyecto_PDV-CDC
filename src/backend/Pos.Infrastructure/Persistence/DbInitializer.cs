using Microsoft.EntityFrameworkCore;
using Pos.Application.Common.Interfaces;
using Pos.Domain.Entidades;

namespace Pos.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedAsync(PosDbContext context, IPasswordHasherService passwordHasher)
    {
        if (await context.Users.AnyAsync())
        {
            return;
        }

        // 1. Permisos en Español
        var permisos = new List<Permiso>
        {
            new() { Modulo = "Productos", Accion = "Consultar", Descripcion = "Consultar catálogo de productos WPC Bajío" },
            new() { Modulo = "Productos", Accion = "Crear", Descripcion = "Dar de alta nuevos productos Lambrín" },
            new() { Modulo = "Productos", Accion = "Editar", Descripcion = "Editar especificaciones y precios de productos" },
            new() { Modulo = "Productos", Accion = "Eliminar", Descripcion = "Desactivar o eliminar productos del catálogo" },

            new() { Modulo = "Clientes", Accion = "Consultar", Descripcion = "Consultar directorio de clientes" },
            new() { Modulo = "Clientes", Accion = "Crear", Descripcion = "Registrar nuevos clientes particulares y mayoristas" },
            new() { Modulo = "Clientes", Accion = "Editar", Descripcion = "Editar datos de clientes y porcentajes de descuento" },

            new() { Modulo = "Inventario", Accion = "Consultar", Descripcion = "Consultar niveles de stock y movimientos" },
            new() { Modulo = "Inventario", Accion = "Ajustar", Descripcion = "Registrar entradas, salidas y ajustes de inventario" },

            new() { Modulo = "Ventas", Accion = "Consultar", Descripcion = "Consultar historial de ventas" },
            new() { Modulo = "Ventas", Accion = "Crear", Descripcion = "Procesar ventas de contado, apartado y pago mixto en PDV" },
            new() { Modulo = "Ventas", Accion = "AprobarDescuento", Descripcion = "Autorizar descuentos especiales en mostrador" },

            new() { Modulo = "Cotizaciones", Accion = "Consultar", Descripcion = "Consultar cotizaciones de clientes" },
            new() { Modulo = "Cotizaciones", Accion = "Crear", Descripcion = "Generar nuevas cotizaciones de venta" },
            new() { Modulo = "Cotizaciones", Accion = "Convertir", Descripcion = "Convertir cotización a venta directa en 1-Click" },

            new() { Modulo = "Pagos", Accion = "RegistrarAbono", Descripcion = "Registrar abonos a ventas de apartado" },
            new() { Modulo = "Devoluciones", Accion = "Procesar", Descripcion = "Procesar devoluciones y reingresos a inventario" },

            new() { Modulo = "Caja", Accion = "GestionarTurno", Descripcion = "Apertura, sangrías y Cierre de Caja X/Z con Arqueo" },
            new() { Modulo = "Reportes", Accion = "Consultar", Descripcion = "Consultar métricas ejecutivas de ventas y productos más vendidos" },
            new() { Modulo = "Auditoria", Accion = "Consultar", Descripcion = "Explorar bitácora de auditoría por Correlation ID" },

            new() { Modulo = "Usuarios", Accion = "Consultar", Descripcion = "Consultar usuarios del sistema" },
            new() { Modulo = "Usuarios", Accion = "Gestionar", Descripcion = "Administrar usuarios y asignación de roles" }
        };

        context.Permissions.AddRange(permisos);

        // 2. Roles
        var rolAdmin = new Rol { Nombre = "Administrador", Descripcion = "Administrador general con acceso total a WPC Bajío" };
        var rolCajero = new Rol { Nombre = "Cajero", Descripcion = "Operador de Punto de Venta y Caja" };

        context.Roles.AddRange(rolAdmin, rolCajero);

        // Asignar permisos a Administrador
        foreach (var permiso in permisos)
        {
            context.RolePermissions.Add(new RolPermiso { Rol = rolAdmin, Permiso = permiso });
        }

        // Asignar permisos a Cajero
        var permisosCajero = permisos.Where(p =>
            p.Modulo == "Ventas" || p.Modulo == "Cotizaciones" || p.Modulo == "Clientes" ||
            p.Modulo == "Productos" || p.Modulo == "Caja" || p.Modulo == "Pagos").ToList();

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

        // 5. Productos iniciales
        var prodInteriorTeka = new Producto
        {
            Sku = "LAM-INT-TEK-01",
            Barcode = "7501234560012",
            Nombre = "Lambrín Interior WPC Tono Teka 16cm x 2.90m",
            Descripcion = "Panel de madera plástica WPC de alta densidad con acabado texturizado tono Teka",
            Categoria = catWpcInterior,
            PrecioUnitario = 350.00m,
            PrecioMayoreo = 290.00m,
            CantidadMinimaMayoreo = 10m,
            UnidadMedida = "Pza",
            CoberturaPorUnidadM2 = 0.464m,
            AnchoMm = 160,
            LargoMm = 2900,
            EspesorMm = 24,
            Material = "WPC Madera Plástica",
            SoloCotizacion = false,
            VisibleMasVendido = true
        };

        var prodExteriorRoble = new Producto
        {
            Sku = "LAM-EXT-ROB-02",
            Barcode = "7501234560029",
            Nombre = "Lambrín Exterior Co-Extrusión Roble Oscuro 21cm x 2.90m",
            Descripcion = "Lambrín exterior para intemperie con capa protectora Co-Extrusión tono Roble Oscuro",
            Categoria = catWpcExterior,
            PrecioUnitario = 580.00m,
            PrecioMayoreo = 490.00m,
            CantidadMinimaMayoreo = 15m,
            UnidadMedida = "Pza",
            CoberturaPorUnidadM2 = 0.609m,
            AnchoMm = 210,
            LargoMm = 2900,
            EspesorMm = 26,
            Material = "Co-Extrusión WPC Premium",
            SoloCotizacion = false,
            VisibleMasVendido = true
        };

        context.Products.AddRange(prodInteriorTeka, prodExteriorRoble);

        // 6. Existencias de Inventario
        context.Stocks.Add(new Existencia { Producto = prodInteriorTeka, CantidadDisponible = 150m, UmbralMinimoAlerta = 20m, CantidadReorden = 50m, Ubicacion = "Pasillo A-01" });
        context.Stocks.Add(new Existencia { Producto = prodExteriorRoble, CantidadDisponible = 80m, UmbralMinimoAlerta = 15m, CantidadReorden = 30m, Ubicacion = "Pasillo B-04" });

        // 7. Cliente de demostración
        var clienteDemostracion = new Cliente
        {
            Nombre = "Arquitectura y Diseños",
            Apellido = "Bajío S.A. de C.V.",
            NombreEmpresa = "Arquitectura y Diseños Bajío",
            Rfc = "ADB120304XYZ",
            Email = "contacto@arqbajio.com",
            Telefono = "4771234567",
            Direccion = "Blvd. Campestre 1204",
            Ciudad = "León",
            Estado = "Guanajuato",
            CodigoPostal = "37160",
            TipoCliente = "Mayorista",
            PorcentajeDescuentoEspecial = 5.0m,
            Notas = "Cliente mayorista frecuente de proyectos residenciales"
        };

        context.Customers.Add(clienteDemostracion);

        // 8. Plantillas de Contratos Legales WPC Bajío
        context.DocumentTemplates.Add(new PlantillaDocumento
        {
            Titulo = "Contrato de Venta Directa WPC Bajío",
            Categoria = "ContratoVenta",
            ContenidoHtmlPlantilla = "<h1>Contrato de Venta WPC Bajío</h1><p>Cliente: {{ClienteNombre}}</p><p>Folio: {{VentaFolio}}</p><p>Total: {{MontoTotal}}</p>"
        });

        await context.SaveChangesAsync();
    }
}
