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
