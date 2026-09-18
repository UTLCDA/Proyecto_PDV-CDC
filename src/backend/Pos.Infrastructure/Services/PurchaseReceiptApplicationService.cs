using Microsoft.EntityFrameworkCore;
using Pos.Application.Common.Models;
using Pos.Application.Inventory.DTOs;
using Pos.Application.Inventory.Services;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class PurchaseReceiptApplicationService : IPurchaseReceiptApplicationService
{
    private readonly PosDbContext _dbContext;

    public PurchaseReceiptApplicationService(PosDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PagedResult<PurchaseReceiptDto>> GetReceiptsAsync(
        string? search,
        int pageNumber,
        int pageSize,
        string? sortBy,
        string? sortDirection,
        CancellationToken cancellationToken = default)
    {
        var effectivePageNumber = Math.Max(1, pageNumber);
        var effectivePageSize = Math.Clamp(pageSize, 1, 500);

        var query = _dbContext.PurchaseReceipts.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            var isNumeric = int.TryParse(term, out var numericVal);

            query = query.Where(r =>
                r.Folio.ToLower().Contains(term) ||
                r.NombreProducto.ToLower().Contains(term) ||
                r.Sku.ToLower().Contains(term) ||
                r.CodigoBarras.ToLower().Contains(term) ||
                (isNumeric && r.IdProducto == numericVal));
        }

        var totalItems = await query.CountAsync(cancellationToken);

        var isDesc = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        query = (sortBy?.ToLowerInvariant()) switch
        {
            "folio" => isDesc ? query.OrderByDescending(r => r.Folio) : query.OrderBy(r => r.Folio),
            "idproducto" => isDesc ? query.OrderByDescending(r => r.IdProducto) : query.OrderBy(r => r.IdProducto),
            "nombreproducto" => isDesc ? query.OrderByDescending(r => r.NombreProducto) : query.OrderBy(r => r.NombreProducto),
            "sku" => isDesc ? query.OrderByDescending(r => r.Sku) : query.OrderBy(r => r.Sku),
            "cantidad" => isDesc ? query.OrderByDescending(r => r.Cantidad) : query.OrderBy(r => r.Cantidad),
            "preciocosto" => isDesc ? query.OrderByDescending(r => r.PrecioCosto) : query.OrderBy(r => r.PrecioCosto),
            _ => isDesc ? query.OrderBy(r => r.FechaCreacionUtc) : query.OrderByDescending(r => r.FechaCreacionUtc)
        };

        var skip = (effectivePageNumber - 1) * effectivePageSize;
        var receiptIds = await query.Skip(skip).Take(effectivePageSize).Select(r => r.Id).ToListAsync(cancellationToken);

        var items = await _dbContext.PurchaseReceipts
            .AsNoTracking()
            .Include(r => r.Usuario)
            .Where(r => receiptIds.Contains(r.Id))
            .ToListAsync(cancellationToken);

        var sortedItems = receiptIds
            .Select(id => items.First(r => r.Id == id))
            .Select(MapToDto)
            .ToList();

        return new PagedResult<PurchaseReceiptDto>(sortedItems, totalItems, effectivePageNumber, effectivePageSize);
    }

    public async Task<PurchaseReceiptDto?> GetReceiptByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var receipt = await _dbContext.PurchaseReceipts
            .AsNoTracking()
            .Include(r => r.Usuario)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        return receipt == null ? null : MapToDto(receipt);
    }

    public async Task<PurchaseReceiptDto> CreateReceiptAsync(
        CreatePurchaseReceiptDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (request.Cantidad <= 0)
        {
            throw new ArgumentException("La cantidad ingresada debe ser mayor a 0.");
        }

        var product = await _dbContext.Products
            .FirstOrDefaultAsync(p => p.Id == request.ProductoId, cancellationToken);

        if (product == null)
        {
            throw new KeyNotFoundException("El producto especificado no existe.");
        }

        var stock = await _dbContext.Stocks
            .FirstOrDefaultAsync(s => s.ProductoId == request.ProductoId, cancellationToken);

        if (stock == null)
        {
            stock = new Existencia
            {
                ProductoId = product.Id,
                Ubicacion = "Almacén Principal",
                CantidadDisponible = 0,
                UmbralMinimoAlerta = 10,
                CantidadReorden = 20,
                FechaCreacionUtc = DateTime.UtcNow
            };
            _dbContext.Stocks.Add(stock);
        }

        var currentStock = stock.CantidadDisponible;
        var newStock = currentStock + request.Cantidad;

        var totalReceipts = await _dbContext.PurchaseReceipts.CountAsync(cancellationToken);
        var folio = $"REC-{(totalReceipts + 1):D6}";

        while (await _dbContext.PurchaseReceipts.AnyAsync(r => r.Folio == folio, cancellationToken))
        {
            totalReceipts++;
            folio = $"REC-{(totalReceipts + 1):D6}";
        }

        var receipt = new ReciboCompra
        {
            Folio = folio,
            ProductoId = product.Id,
            IdProducto = product.IdProducto,
            NombreProducto = product.Nombre,
            Sku = product.Sku,
            CodigoBarras = product.Barcode,
            PrecioCosto = request.PrecioCosto >= 0 ? request.PrecioCosto : 0m,
            PrecioVenta = product.PrecioUnitario,
            InventarioAnterior = currentStock,
            Cantidad = request.Cantidad,
            InventarioResultante = newStock,
            Notas = request.Notas?.Trim(),
            UsuarioId = currentUserId,
            FechaCreacionUtc = DateTime.UtcNow
        };

        _dbContext.PurchaseReceipts.Add(receipt);

        stock.CantidadDisponible = newStock;
        stock.FechaActualizacionUtc = DateTime.UtcNow;

        if (request.PrecioCosto > 0)
        {
            product.CostoUnitario = request.PrecioCosto;
            product.FechaActualizacionUtc = DateTime.UtcNow;
        }

        _dbContext.InventoryMovements.Add(new MovimientoInventario
        {
            ProductoId = product.Id,
            TipoMovimiento = "Entrada",
            Cantidad = request.Cantidad,
            CantidadAnterior = currentStock,
            CantidadNueva = newStock,
            Motivo = $"Recibo de compra {folio}",
            NumeroReferencia = folio,
            UsuarioId = currentUserId,
            FechaCreacionUtc = DateTime.UtcNow
        });

        _dbContext.AuditLogs.Add(new LogAuditoria
        {
            IdCorrelacion = correlationId,
            UsuarioId = currentUserId,
            Accion = "RECEIPT_CREATED",
            NombreEntidad = "ReciboCompra",
            EntidadId = receipt.Id.ToString(),
            DireccionIp = ipAddress,
            Motivo = $"Recibo {folio} registrado: {product.Sku} ({product.Nombre}), Cantidad: {request.Cantidad}, Stock: {newStock}."
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(receipt);
    }

    public async Task<PurchaseReceiptDto> UpdateReceiptAsync(
        Guid id,
        UpdatePurchaseReceiptDto request,
        Guid? currentUserId,
        string correlationId,
        string ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (request.Cantidad <= 0)
        {
            throw new ArgumentException("La cantidad ingresada debe ser mayor a 0.");
        }

        var receipt = await _dbContext.PurchaseReceipts
            .Include(r => r.Usuario)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (receipt == null)
        {
            throw new KeyNotFoundException("El recibo de compra no fue encontrado.");
        }

        var product = await _dbContext.Products
            .FirstOrDefaultAsync(p => p.Id == receipt.ProductoId, cancellationToken);

        var stock = await _dbContext.Stocks
            .FirstOrDefaultAsync(s => s.ProductoId == receipt.ProductoId, cancellationToken);

        if (stock == null)
        {
            throw new InvalidOperationException("No se encontró el registro de existencias del producto.");
        }

        var diff = request.Cantidad - receipt.Cantidad;
        var newStock = stock.CantidadDisponible + diff;

        if (newStock < 0)
        {
            throw new InvalidOperationException($"No se puede actualizar el recibo: reducir la cantidad en {Math.Abs(diff)} dejaría el inventario en negativo ({newStock}).");
        }

        stock.CantidadDisponible = newStock;
        stock.FechaActualizacionUtc = DateTime.UtcNow;

        if (product != null && request.PrecioCosto > 0)
        {
            product.CostoUnitario = request.PrecioCosto;
            product.FechaActualizacionUtc = DateTime.UtcNow;
        }

        var prevQuantity = receipt.Cantidad;
        receipt.Cantidad = request.Cantidad;
        receipt.PrecioCosto = request.PrecioCosto >= 0 ? request.PrecioCosto : 0m;
        receipt.InventarioResultante = receipt.InventarioAnterior + request.Cantidad;
        receipt.Notas = request.Notas?.Trim();
        receipt.FechaActualizacionUtc = DateTime.UtcNow;

        if (diff != 0)
        {
            _dbContext.InventoryMovements.Add(new MovimientoInventario
            {
                ProductoId = receipt.ProductoId,
                TipoMovimiento = "Ajuste",
                Cantidad = Math.Abs(diff),
                CantidadAnterior = stock.CantidadDisponible - diff,
                CantidadNueva = newStock,
                Motivo = $"Ajuste por edición de recibo {receipt.Folio} ({(diff > 0 ? "+" : "")}{diff} pzas)",
                NumeroReferencia = receipt.Folio,
                UsuarioId = currentUserId,
                FechaCreacionUtc = DateTime.UtcNow
            });
        }

        _dbContext.AuditLogs.Add(new LogAuditoria
        {
            IdCorrelacion = correlationId,
            UsuarioId = currentUserId,
            Accion = "RECEIPT_UPDATED",
            NombreEntidad = "ReciboCompra",
            EntidadId = receipt.Id.ToString(),
            DireccionIp = ipAddress,
            Motivo = $"Recibo {receipt.Folio} editado: Cantidad {prevQuantity} -> {request.Cantidad}, Costo: {receipt.PrecioCosto}."
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(receipt);
    }

    private static PurchaseReceiptDto MapToDto(ReciboCompra r) =>
        new(
            r.Id,
            r.Folio,
            r.ProductoId,
            r.IdProducto,
            r.NombreProducto,
            r.Sku,
            r.CodigoBarras,
            r.PrecioCosto,
            r.PrecioVenta,
            r.InventarioAnterior,
            r.Cantidad,
            r.InventarioResultante,
            r.Notas,
            r.UsuarioId,
            r.Usuario?.NombreUsuario,
            r.FechaCreacionUtc,
            r.FechaActualizacionUtc
        );
}
