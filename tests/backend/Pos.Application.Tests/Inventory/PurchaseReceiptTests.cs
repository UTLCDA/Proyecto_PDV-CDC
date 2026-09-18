using Microsoft.EntityFrameworkCore;
using Pos.Application.Inventory.DTOs;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;
using Xunit;

namespace Pos.Application.Tests.Inventory;

public class PurchaseReceiptTests
{
    private PosDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<PosDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new PosDbContext(options);
    }

    [Fact]
    public async Task CreateReceiptAsync_ShouldIncreaseStock_AndCreateMovement()
    {
        using var context = CreateInMemoryContext();
        var product = new Producto
        {
            Id = Guid.NewGuid(),
            IdProducto = 1,
            Nombre = "Lambrín WPC Roble",
            Sku = "LAM-01",
            Barcode = "750123456789",
            PrecioUnitario = 290m,
            CostoUnitario = 150m,
            EstaActivo = true
        };
        var stock = new Existencia
        {
            ProductoId = product.Id,
            CantidadDisponible = 14m,
            Ubicacion = "Almacén Principal"
        };
        context.Products.Add(product);
        context.Stocks.Add(stock);
        await context.SaveChangesAsync();

        var service = new PurchaseReceiptApplicationService(context);

        var request = new CreatePurchaseReceiptDto(
            product.Id,
            Cantidad: 14m,
            PrecioCosto: 160m,
            Notas: "Compra de reposición proveedor"
        );

        var receipt = await service.CreateReceiptAsync(request, null, "corr-1", "127.0.0.1");

        Assert.NotNull(receipt);
        Assert.StartsWith("REC-", receipt.Folio);
        Assert.Equal(14m, receipt.InventarioAnterior);
        Assert.Equal(14m, receipt.Cantidad);
        Assert.Equal(28m, receipt.InventarioResultante);
        Assert.Equal(160m, receipt.PrecioCosto);

        // Verify stock updated in DB
        var updatedStock = await context.Stocks.FirstAsync(s => s.ProductoId == product.Id);
        Assert.Equal(28m, updatedStock.CantidadDisponible);

        // Verify product cost updated
        var updatedProd = await context.Products.FirstAsync(p => p.Id == product.Id);
        Assert.Equal(160m, updatedProd.CostoUnitario);

        // Verify movement
        var movement = await context.InventoryMovements.FirstAsync(m => m.ProductoId == product.Id);
        Assert.Equal("Entrada", movement.TipoMovimiento);
        Assert.Equal(14m, movement.Cantidad);
        Assert.Equal(28m, movement.CantidadNueva);
    }

    [Fact]
    public async Task UpdateReceiptAsync_ShouldAdjustStockDifference_Accurately()
    {
        using var context = CreateInMemoryContext();
        var product = new Producto
        {
            Id = Guid.NewGuid(),
            IdProducto = 2,
            Nombre = "Lambrín WPC Nogal",
            Sku = "LAM-02",
            Barcode = "750123456790",
            PrecioUnitario = 290m,
            EstaActivo = true
        };
        var stock = new Existencia
        {
            ProductoId = product.Id,
            CantidadDisponible = 10m,
            Ubicacion = "Almacén Principal"
        };
        context.Products.Add(product);
        context.Stocks.Add(stock);
        await context.SaveChangesAsync();

        var service = new PurchaseReceiptApplicationService(context);

        // First create with 14 -> stock = 10 + 14 = 24
        var createRequest = new CreatePurchaseReceiptDto(product.Id, 14m, 140m, null);
        var created = await service.CreateReceiptAsync(createRequest, null, "corr-2", "127.0.0.1");

        // Now edit to 20 -> stock should be 10 + 20 = 30
        var updateRequest = new UpdatePurchaseReceiptDto(20m, 145m, "Corrección de factura");
        var updated = await service.UpdateReceiptAsync(created.Id, updateRequest, null, "corr-3", "127.0.0.1");

        Assert.Equal(20m, updated.Cantidad);
        Assert.Equal(30m, updated.InventarioResultante);

        var dbStock = await context.Stocks.FirstAsync(s => s.ProductoId == product.Id);
        Assert.Equal(30m, dbStock.CantidadDisponible);
    }
}
