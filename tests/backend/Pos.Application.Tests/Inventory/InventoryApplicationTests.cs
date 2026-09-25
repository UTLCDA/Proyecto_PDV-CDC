using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Inventory.DTOs;
using Pos.Infrastructure.Identity;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;
using Xunit;

namespace Pos.Application.Tests.Inventory;

public class InventoryApplicationTests
{
    private PosDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<PosDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new PosDbContext(options);
    }

    [Fact]
    public async Task RegisterMovementAsync_ShouldIncreaseStock_OnEntryMovement()
    {
        // Arrange
        var context = GetInMemoryDbContext();
        var passwordHasher = new PasswordHasherService();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, passwordHasher);

        var inventoryService = new InventoryApplicationService(context, auditService);
        var product = await context.Products.FirstAsync();
        var stockBefore = await context.Stocks.FirstAsync(s => s.ProductoId == product.Id);
        var initialQty = stockBefore.CantidadDisponible;
        const string evidenceImageUrl = "data:image/png;base64,dGVzdA==";

        var request = new RegisterMovementDto(
            ProductId: product.Id,
            MovementType: "Entrada",
            Quantity: 25m,
            Reason: "Recepción de contenedor de importación",
            ReferenceNumber: "FAC-2026-99",
            Location: InventoryDefaults.DefaultWarehouseLocation,
            EvidenceImageUrl: evidenceImageUrl
        );

        // Act
        var movement = await inventoryService.RegisterMovementAsync(request, null, "corr-inv-1", "127.0.0.1");

        // Assert
        Assert.NotNull(movement);
        Assert.Equal("Entrada", movement.MovementType);
        Assert.Equal(25m, movement.Quantity);
        Assert.Equal(evidenceImageUrl, movement.EvidenceImageUrl);

        var stockAfter = await context.Stocks.FirstAsync(s => s.ProductoId == product.Id);
        Assert.Equal(initialQty + 25m, stockAfter.CantidadDisponible);
        Assert.Equal(InventoryDefaults.DefaultWarehouseLocation, stockAfter.Ubicacion);

        var stockDto = await inventoryService.GetStockByProductIdAsync(product.Id);
        Assert.NotNull(stockDto);
        Assert.Equal(product.ImagenUrl, stockDto.ProductImageUrl);

        const int idVenta = 9054;
        var persistedMovement = await context.InventoryMovements.SingleAsync(item => item.Id == movement.Id);
        persistedMovement.IdVenta = idVenta;
        await context.SaveChangesAsync();
        var movementsByIdVenta = await inventoryService.GetMovementsAsync(null, null, idVenta.ToString(), null, null);

        Assert.Equal(idVenta, Assert.Single(movementsByIdVenta.Items).IdVenta);
    }

    [Fact]
    public async Task RegisterMovementAsync_ShouldRecordPreviousAndNewQuantity_OnAdjustmentMovement()
    {
        // Arrange
        var context = GetInMemoryDbContext();
        var passwordHasher = new PasswordHasherService();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, passwordHasher);

        var inventoryService = new InventoryApplicationService(context, auditService);
        var product = await context.Products.FirstAsync();
        var stockBefore = await context.Stocks.FirstAsync(s => s.ProductoId == product.Id);
        var initialQty = stockBefore.CantidadDisponible;

        const decimal targetQty = 85m;
        var request = new RegisterMovementDto(
            ProductId: product.Id,
            MovementType: "Ajuste",
            Quantity: targetQty,
            Reason: "Ajuste por conteo físico en almacén",
            ReferenceNumber: "AJUSTE-001",
            Location: InventoryDefaults.DefaultWarehouseLocation
        );

        // Act
        var movement = await inventoryService.RegisterMovementAsync(request, null, "corr-inv-2", "127.0.0.1");

        // Assert
        Assert.NotNull(movement);
        Assert.Equal("Ajuste", movement.MovementType);
        Assert.Equal(targetQty, movement.Quantity);
        Assert.Equal(initialQty, movement.PreviousQuantity);
        Assert.Equal(targetQty, movement.NewQuantity);

        var stockAfter = await context.Stocks.FirstAsync(s => s.ProductoId == product.Id);
        Assert.Equal(targetQty, stockAfter.CantidadDisponible);

        // Verify sorting by previousquantity
        var sortedMovements = await inventoryService.GetMovementsAsync(product.Id, null, null, null, null, 1, 10, "previousquantity", "desc");
        Assert.NotEmpty(sortedMovements.Items);
        Assert.Equal(initialQty, sortedMovements.Items.First().PreviousQuantity);
    }

    [Fact]
    public async Task GetMovementsAsync_ShouldOrderByMostRecentDateDescending_ByDefault()
    {
        // Arrange
        var context = GetInMemoryDbContext();
        var passwordHasher = new PasswordHasherService();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, passwordHasher);

        var inventoryService = new InventoryApplicationService(context, auditService);
        var product = await context.Products.FirstAsync();

        var m1 = await inventoryService.RegisterMovementAsync(new RegisterMovementDto(
            product.Id, "Entrada", 5m, "Entrada vieja", "REF-1"
        ), null, "c-1", "127.0.0.1");

        // Simulate slight delay in date
        var entityM1 = await context.InventoryMovements.FindAsync(m1.Id);
        entityM1!.FechaCreacionUtc = DateTime.UtcNow.AddMinutes(-30);
        await context.SaveChangesAsync();

        var m2 = await inventoryService.RegisterMovementAsync(new RegisterMovementDto(
            product.Id, "Ajuste", 40m, "Ajuste reciente", "REF-2"
        ), null, "c-2", "127.0.0.1");

        // Act - Call without explicit sort parameters
        var defaultResult = await inventoryService.GetMovementsAsync(product.Id, null, null, null, null, 1, 10, null, null);

        // Assert - The newest movement (Ajuste reciente) must be the first item
        Assert.True(defaultResult.Items.Count >= 2);
        Assert.Equal("Ajuste reciente", defaultResult.Items.First().Reason);
        Assert.Equal(m2.Id, defaultResult.Items.First().Id);

        // Act - Call with explicit createdAtUtc and desc
        var explicitDescResult = await inventoryService.GetMovementsAsync(product.Id, null, null, null, null, 1, 10, "createdAtUtc", "desc");
        Assert.Equal(m2.Id, explicitDescResult.Items.First().Id);

        // Act - Call with explicit createdAtUtc and asc (oldest first)
        var explicitAscResult = await inventoryService.GetMovementsAsync(product.Id, null, null, null, null, 1, 10, "createdAtUtc", "asc");
        Assert.Equal(m1.Id, explicitAscResult.Items.First().Id);
    }
}
