using Microsoft.EntityFrameworkCore;
using Pos.Domain.Entidades;

namespace Pos.Infrastructure.Persistence;

public class PosDbContext : DbContext
{
    public PosDbContext(DbContextOptions<PosDbContext> options) : base(options) { }

    public DbSet<Producto> Products { get; set; } = null!;
    public DbSet<Categoria> Categories { get; set; } = null!;
    public DbSet<ImagenProducto> ProductImages { get; set; } = null!;
    public DbSet<Cliente> Customers { get; set; } = null!;
    public DbSet<Usuario> Users { get; set; } = null!;
    public DbSet<Empleado> Employees { get; set; } = null!;
    public DbSet<Rol> Roles { get; set; } = null!;
    public DbSet<Permiso> Permissions { get; set; } = null!;
    public DbSet<UsuarioRol> UserRoles { get; set; } = null!;
    public DbSet<RolPermiso> RolePermissions { get; set; } = null!;
    public DbSet<TokenRefresco> RefreshTokens { get; set; } = null!;
    public DbSet<LogAuditoria> AuditLogs { get; set; } = null!;
    public DbSet<Existencia> Stocks { get; set; } = null!;
    public DbSet<MovimientoInventario> InventoryMovements { get; set; } = null!;
    public DbSet<Venta> Sales { get; set; } = null!;
    public DbSet<PartidaVenta> SaleItems { get; set; } = null!;
    public DbSet<Cotizacion> Quotes { get; set; } = null!;
    public DbSet<PartidaCotizacion> QuoteItems { get; set; } = null!;
    public DbSet<AbonoPago> PaymentInstallments { get; set; } = null!;
    public DbSet<DevolucionCabecera> ReturnHeaders { get; set; } = null!;
    public DbSet<DevolucionDetalle> ReturnItems { get; set; } = null!;
    public DbSet<PlantillaDocumento> DocumentTemplates { get; set; } = null!;
    public DbSet<TurnoCaja> CashShifts { get; set; } = null!;
    public DbSet<TransaccionCaja> CashTransactions { get; set; } = null!;
    public DbSet<SaludSistema> HealthStatuses { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Many-to-Many UserRoles
        modelBuilder.Entity<UsuarioRol>()
            .HasKey(ur => new { ur.UsuarioId, ur.RolId });

        modelBuilder.Entity<UsuarioRol>()
            .HasOne(ur => ur.Usuario)
            .WithMany(u => u.UsuarioRoles)
            .HasForeignKey(ur => ur.UsuarioId);

        modelBuilder.Entity<UsuarioRol>()
            .HasOne(ur => ur.Rol)
            .WithMany(r => r.UsuarioRoles)
            .HasForeignKey(ur => ur.RolId);

        // Many-to-Many RolePermissions
        modelBuilder.Entity<RolPermiso>()
            .HasKey(rp => new { rp.RolId, rp.PermisoId });

        modelBuilder.Entity<RolPermiso>()
            .HasOne(rp => rp.Rol)
            .WithMany(r => r.RolPermisos)
            .HasForeignKey(rp => rp.RolId);

        modelBuilder.Entity<RolPermiso>()
            .HasOne(rp => rp.Permiso)
            .WithMany(p => p.RolPermisos)
            .HasForeignKey(rp => rp.PermisoId);

        modelBuilder.Entity<Venta>()
            .Property(sale => sale.NumeroFolio)
            .HasMaxLength(64);
        modelBuilder.Entity<Venta>()
            .HasIndex(sale => sale.NumeroFolio)
            .IsUnique();

        modelBuilder.Entity<TurnoCaja>()
            .Property(shift => shift.NumeroTurno)
            .HasMaxLength(64);
        modelBuilder.Entity<TurnoCaja>()
            .HasIndex(shift => shift.NumeroTurno)
            .IsUnique();

        modelBuilder.Entity<Cotizacion>()
            .Property(quote => quote.NumeroCotizacion)
            .HasMaxLength(64);
        modelBuilder.Entity<Cotizacion>()
            .HasIndex(quote => quote.NumeroCotizacion)
            .IsUnique();

        modelBuilder.Entity<AbonoPago>()
            .Property(payment => payment.NumeroRecibo)
            .HasMaxLength(64);
        modelBuilder.Entity<AbonoPago>()
            .HasIndex(payment => payment.NumeroRecibo)
            .IsUnique();

        modelBuilder.Entity<DevolucionCabecera>()
            .Property(returnHeader => returnHeader.NumeroDevolucion)
            .HasMaxLength(64);
        modelBuilder.Entity<DevolucionCabecera>()
            .Property(returnHeader => returnHeader.FormaReembolso)
            .HasMaxLength(32);
        modelBuilder.Entity<DevolucionCabecera>()
            .HasIndex(returnHeader => returnHeader.NumeroDevolucion)
            .IsUnique();

        modelBuilder.Entity<Cliente>()
            .Property(customer => customer.Email)
            .HasMaxLength(256);
        modelBuilder.Entity<Cliente>()
            .Property(customer => customer.Rfc)
            .HasMaxLength(13);
        modelBuilder.Entity<Cliente>()
            .HasIndex(customer => customer.Email)
            .IsUnique();
        modelBuilder.Entity<Cliente>()
            .HasIndex(customer => customer.Rfc)
            .IsUnique()
            .HasFilter("[Rfc] IS NOT NULL AND [Rfc] <> N''");

        modelBuilder.Entity<Producto>()
            .Property(product => product.Sku)
            .HasMaxLength(64);
        modelBuilder.Entity<Producto>()
            .Property(product => product.Barcode)
            .HasMaxLength(64);
        modelBuilder.Entity<Producto>()
            .Property(product => product.Nombre)
            .HasMaxLength(200);
        modelBuilder.Entity<Producto>()
            .Property(product => product.UnidadMedida)
            .HasMaxLength(16);
        modelBuilder.Entity<Producto>()
            .Property(product => product.Material)
            .HasMaxLength(100);
        modelBuilder.Entity<Producto>()
            .HasIndex(product => product.Sku)
            .IsUnique();
        modelBuilder.Entity<Producto>()
            .HasIndex(product => product.Barcode)
            .IsUnique();

        modelBuilder.Entity<Categoria>()
            .Property(category => category.Nombre)
            .HasMaxLength(120);
        modelBuilder.Entity<Categoria>()
            .Property(category => category.Slug)
            .HasMaxLength(140);
        modelBuilder.Entity<Categoria>()
            .HasIndex(category => category.Slug)
            .IsUnique();

        modelBuilder.Entity<Existencia>()
            .Property(stock => stock.Ubicacion)
            .HasMaxLength(200);
        modelBuilder.Entity<Existencia>()
            .HasIndex(stock => stock.ProductoId)
            .IsUnique();

        modelBuilder.Entity<LogAuditoria>()
            .Property(log => log.IdCorrelacion)
            .HasMaxLength(100);
        modelBuilder.Entity<LogAuditoria>()
            .Property(log => log.Accion)
            .HasMaxLength(100);
        modelBuilder.Entity<LogAuditoria>()
            .HasIndex(log => log.IdCorrelacion);
        modelBuilder.Entity<LogAuditoria>()
            .HasIndex(log => log.Accion);
        modelBuilder.Entity<LogAuditoria>()
            .HasIndex(log => log.FechaCreacionUtc);

        modelBuilder.Entity<Venta>()
            .Property(v => v.IdVenta)
            .ValueGeneratedOnAdd();
        modelBuilder.Entity<Venta>()
            .HasIndex(v => v.IdVenta)
            .IsUnique();

        modelBuilder.Entity<PartidaVenta>()
            .HasIndex(pv => pv.IdVenta);
        modelBuilder.Entity<AbonoPago>()
            .HasIndex(ap => ap.IdVenta);
        modelBuilder.Entity<DevolucionCabecera>()
            .HasIndex(dc => dc.IdVenta);
        modelBuilder.Entity<MovimientoInventario>()
            .HasIndex(mi => mi.IdVenta);
        modelBuilder.Entity<TransaccionCaja>()
            .HasIndex(tc => tc.IdVenta);

        // Precision mapping for money fields (decimal(18,2))
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var properties = entityType.GetProperties()
                .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?));

            foreach (var property in properties)
            {
                property.SetPrecision(18);
                property.SetScale(2);
            }
        }
    }
}
