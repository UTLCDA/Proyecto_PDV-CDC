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

        Assert.Equal(idVenta, Assert.Single(movementsByIdVenta).IdVenta);
    }
}
