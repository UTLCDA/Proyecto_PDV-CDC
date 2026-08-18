using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pos.Application.Common.Interfaces;
using Pos.Application.Inventory.DTOs;
using Pos.Application.Inventory.Services;
using Pos.Domain.Entidades;
using Pos.Infrastructure.Persistence;

namespace Pos.Infrastructure.Services;

public class InventoryApplicationService : IInventoryApplicationService
{
    private readonly PosDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    public InventoryApplicationService(PosDbContext dbContext, IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    public async Task<List<StockDto>> GetStockLevelsAsync(string? search, bool? isLowStockOnly, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Stocks
            .Include(s => s.Producto)
                .ThenInclude(p => p.Categoria)
            .Where(s => s.Producto.EstaActivo);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.Producto.Nombre.ToLower().Contains(term) ||
                                     s.Producto.Sku.ToLower().Contains(term) ||
                                     s.Producto.Barcode.Contains(term));
        }

        if (isLowStockOnly == true)
        {
            query = query.Where(s => s.CantidadDisponible <= s.UmbralMinimoAlerta);
        }

        var stocks = await query.ToListAsync(cancellationToken);
        return stocks.Select(MapStockToDto).ToList();
    }

    public async Task<StockDto?> GetStockByProductIdAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        var stock = await _dbContext.Stocks
            .Include(s => s.Producto)
                .ThenInclude(p => p.Categoria)
            .FirstOrDefaultAsync(s => s.ProductoId == productId, cancellationToken);

        return stock == null ? null : MapStockToDto(stock);
    }

    public async Task<List<InventoryMovementDto>> GetMovementsAsync(Guid? productId, string? movementType, string? search, DateTime? startDateUtc, DateTime? endDateUtc, CancellationToken cancellationToken = default, int page = 1, int pageSize = 500)
    {
        if (startDateUtc.HasValue && endDateUtc.HasValue && startDateUtc.Value > endDateUtc.Value)
        {
            throw new ArgumentException("La fecha inicial no puede ser posterior a la fecha final.");
        }

        var query = _dbContext.InventoryMovements
            .Include(m => m.Producto)
            .Include(m => m.Usuario)
            .AsQueryable();

        if (productId.HasValue)
        {
            query = query.Where(m => m.ProductoId == productId.Value);
        }

        if (!string.IsNullOrWhiteSpace(movementType))
        {
            var type = movementType.Trim().ToLower();
            var synonyms = type switch
            {
                "sale" or "sales" or "venta" or "ventas" => new[] { "sale", "sales", "venta", "ventas" },
                "entry" or "entries" or "entrada" or "entradas" => new[] { "entry", "entries", "entrada", "entradas" },
                "exit" or "exits" or "salida" or "salidas" => new[] { "exit", "exits", "salida", "salidas" },
                "adjustment" or "adjustments" or "ajuste" or "ajustes" => new[] { "adjustment", "adjustments", "ajuste", "ajustes" },
                "return" or "returns" or "devolucion" or "devolución" or "devoluciones" => new[] { "return", "returns", "devolucion", "devolución", "devoluciones" },
                _ => new[] { type }
            };
            query = query.Where(m => synonyms.Contains(m.TipoMovimiento.ToLower()));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            var hasOperationalId = int.TryParse(term, out var idVenta) && idVenta > 0;
            query = query.Where(m => (hasOperationalId && m.IdVenta == idVenta) ||
                                     m.Producto.Nombre.ToLower().Contains(term) ||
                                     m.Producto.Sku.ToLower().Contains(term) ||
                                     m.NumeroReferencia.ToLower().Contains(term) ||
                                     m.Motivo.ToLower().Contains(term));
        }

        if (startDateUtc.HasValue)
        {
            query = query.Where(m => m.FechaCreacionUtc >= startDateUtc.Value);
        }

        if (endDateUtc.HasValue)
        {
            var effectiveEndDate = endDateUtc.Value.TimeOfDay == TimeSpan.Zero
                ? endDateUtc.Value.Date.AddDays(1).AddTicks(-1)
                : endDateUtc.Value;
            query = query.Where(m => m.FechaCreacionUtc <= effectiveEndDate);
        }

        var (skip, take) = QueryPaging.Normalize(page, pageSize, 500);
        var movements = await query
            .OrderByDescending(m => m.FechaCreacionUtc)
            .ThenByDescending(m => m.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);

        return movements.Select(MapMovementToDto).ToList();
    }

    public async Task<InventoryMovementDto> RegisterMovementAsync(RegisterMovementDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
        var location = InventoryDefaults.DefaultWarehouseLocation;

        if (location.Length > InventoryDefaults.MaxWarehouseLocationLength)
        {
            throw new ArgumentException($"La ubicación del almacén no puede exceder {InventoryDefaults.MaxWarehouseLocationLength} caracteres.");
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new ArgumentException("El motivo u observación es obligatorio.");
        }

        if (string.IsNullOrWhiteSpace(request.MovementType))
        {
            throw new ArgumentException("El tipo de movimiento es obligatorio.");
        }

        var reason = request.Reason.Trim();
        var referenceNumber = request.ReferenceNumber?.Trim() ?? string.Empty;
        var evidenceImageUrl = request.EvidenceImageUrl?.Trim() ?? string.Empty;

        if (!string.IsNullOrEmpty(evidenceImageUrl) &&
            !evidenceImageUrl.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("La evidencia física debe ser una imagen válida.");
        }

        if (evidenceImageUrl.Length > InventoryDefaults.MaxEvidenceImageDataUrlLength)
        {
            throw new ArgumentException("La imagen de evidencia excede el tamaño máximo permitido de 2 MB.");
        }

        var stock = await _dbContext.Stocks
            .Include(s => s.Producto)
            .FirstOrDefaultAsync(s => s.ProductoId == request.ProductId, cancellationToken);

        if (stock == null)
        {
            var product = await _dbContext.Products.FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken);
            if (product == null)
            {
                throw new KeyNotFoundException($"Producto con ID '{request.ProductId}' no encontrado.");
            }

            stock = new Existencia
            {
                ProductoId = request.ProductId,
                CantidadDisponible = 0m,
                UmbralMinimoAlerta = 10m,
                CantidadReorden = 50m,
                Ubicacion = location
            };
            _dbContext.Stocks.Add(stock);
        }

        decimal previousQuantity = stock.CantidadDisponible;
        var previousLocation = stock.Ubicacion;
        var movementType = request.MovementType.Trim();

        switch (movementType.ToLowerInvariant())
        {
            case "entry":
            case "entradas":
            case "entrada":
                stock.AgregarStock(request.Quantity);
                break;
            case "exit":
            case "salidas":
            case "salida":
                stock.DeducirStock(request.Quantity);
                break;
            case "adjustment":
            case "ajuste":
                stock.EstablecerStock(request.Quantity);
                break;
            default:
                throw new ArgumentException($"Tipo de movimiento de inventario '{request.MovementType}' no válido.");
        }

        stock.Ubicacion = location;
        decimal newQuantity = stock.CantidadDisponible;

        var movement = new MovimientoInventario
        {
            ProductoId = request.ProductId,
            TipoMovimiento = movementType,
            Cantidad = request.Quantity,
            CantidadAnterior = previousQuantity,
            CantidadNueva = newQuantity,
            Motivo = reason,
            NumeroReferencia = referenceNumber,
            EvidenceImageUrl = evidenceImageUrl,
            UsuarioId = currentUserId,
            FechaCreacionUtc = DateTime.UtcNow
        };

        _dbContext.InventoryMovements.Add(movement);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var eventType = movementType.Equals("Entrada", StringComparison.OrdinalIgnoreCase) ? "INVENTORY_INCREASED" :
                        movementType.Equals("Salida", StringComparison.OrdinalIgnoreCase) ? "INVENTORY_DECREASED" : "INVENTORY_ADJUSTED";

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            $"STOCK_MOVEMENT_{movementType.ToUpperInvariant()}",
            "Existencia",
            stock.Id.ToString(),
            JsonSerializer.Serialize(new { CantidadDisponible = previousQuantity, Ubicacion = previousLocation }),
            JsonSerializer.Serialize(new
            {
                CantidadDisponible = newQuantity,
                Ubicacion = stock.Ubicacion,
                TieneEvidenciaFisica = !string.IsNullOrEmpty(evidenceImageUrl)
            }),
            ipAddress,
            $"Motivo: {reason}, Ref: {referenceNumber}",
            module: "Inventario",
            eventType: eventType,
            resultStatus: "SUCCESS",
            cancellationToken: cancellationToken);

        return MapMovementToDto(movement);
    }

    private static StockDto MapStockToDto(Existencia stock)
    {
        return new StockDto(
            stock.Id,
            stock.ProductoId,
            stock.Producto.Sku,
            stock.Producto.Nombre,
            string.IsNullOrWhiteSpace(stock.Producto.ImagenUrl) ? null : stock.Producto.ImagenUrl,
            stock.Producto.Categoria?.Nombre ?? "General",
            stock.CantidadDisponible,
            stock.UmbralMinimoAlerta,
            stock.CantidadReorden,
            stock.Producto.UnidadMedida,
            stock.Ubicacion,
            stock.EsStockBajo,
            stock.EsAgotado
        );
    }

    private static InventoryMovementDto MapMovementToDto(MovimientoInventario m)
    {
        return new InventoryMovementDto(
            m.Id,
            m.IdVenta,
            m.ProductoId,
            m.Producto?.Sku ?? string.Empty,
            m.Producto?.Nombre ?? string.Empty,
            m.TipoMovimiento,
            m.Cantidad,
            m.CantidadAnterior,
            m.CantidadNueva,
            m.Motivo,
            m.NumeroReferencia,
            string.IsNullOrWhiteSpace(m.EvidenceImageUrl) ? null : m.EvidenceImageUrl,
            m.Usuario?.NombreUsuario,
            m.FechaCreacionUtc
        );
    }
}
