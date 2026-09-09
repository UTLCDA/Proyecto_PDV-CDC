using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pos.Application.Common.Interfaces;
using Pos.Application.Common.Models;
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

    public async Task<PagedResult<StockDto>> GetStockLevelsAsync(
        string? search,
        bool? isLowStockOnly,
        int pageNumber = 1,
        int pageSize = 25,
        string? sortBy = null,
        string? sortDirection = null,
        CancellationToken cancellationToken = default)
    {
        var baseQuery = _dbContext.Stocks
            .AsNoTracking()
            .Where(s => s.Producto.EstaActivo);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            baseQuery = baseQuery.Where(s => s.Producto.Nombre.ToLower().Contains(term) ||
                                             s.Producto.Sku.ToLower().Contains(term) ||
                                             s.Producto.Barcode.Contains(term));
        }

        if (isLowStockOnly == true)
        {
            baseQuery = baseQuery.Where(s => s.CantidadDisponible <= s.UmbralMinimoAlerta);
        }

        var totalItems = await baseQuery.CountAsync(cancellationToken);
        if (totalItems == 0)
        {
            return new PagedResult<StockDto>([], 0, pageNumber, pageSize);
        }

        var isDesc = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var sortedQuery = (sortBy?.Trim().ToLowerInvariant()) switch
        {
            "sku" => isDesc ? baseQuery.OrderByDescending(s => s.Producto.Sku) : baseQuery.OrderBy(s => s.Producto.Sku),
            "category" or "categoría" or "categoria" => isDesc ? baseQuery.OrderByDescending(s => s.Producto.Categoria.Nombre) : baseQuery.OrderBy(s => s.Producto.Categoria.Nombre),
            "stock" or "cantidad" or "cantidaddisponible" or "available" => isDesc ? baseQuery.OrderByDescending(s => s.CantidadDisponible) : baseQuery.OrderBy(s => s.CantidadDisponible),
            "reorder" or "reorden" or "cantidadreorden" => isDesc ? baseQuery.OrderByDescending(s => s.CantidadReorden) : baseQuery.OrderBy(s => s.CantidadReorden),
            "threshold" or "umbral" or "min" or "umbralminimoalerta" => isDesc ? baseQuery.OrderByDescending(s => s.UmbralMinimoAlerta) : baseQuery.OrderBy(s => s.UmbralMinimoAlerta),
            "updated" or "fechaactualizacion" or "fechaactualizacionutc" => isDesc ? baseQuery.OrderByDescending(s => s.FechaActualizacionUtc) : baseQuery.OrderBy(s => s.FechaActualizacionUtc),
            _ => isDesc ? baseQuery.OrderByDescending(s => s.Producto.Nombre) : baseQuery.OrderBy(s => s.Producto.Nombre)
        };

        var (skip, take) = QueryPaging.Normalize(pageNumber, pageSize, 100);
        var pagedStockIds = await sortedQuery
            .Skip(skip)
            .Take(take)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        if (pagedStockIds.Count == 0)
        {
            return new PagedResult<StockDto>([], totalItems, pageNumber, take);
        }

        var stocks = await _dbContext.Stocks
            .AsNoTracking()
            .Where(s => pagedStockIds.Contains(s.Id))
            .Include(s => s.Producto)
                .ThenInclude(p => p.Categoria)
            .AsSplitQuery()
            .ToListAsync(cancellationToken);

        var stocksById = stocks.ToDictionary(s => s.Id);
        var orderedStocks = pagedStockIds
            .Where(id => stocksById.ContainsKey(id))
            .Select(id => stocksById[id])
            .ToList();

        var items = orderedStocks.Select(MapStockToDto).ToList();
        return new PagedResult<StockDto>(items, totalItems, pageNumber, take);
    }

    public async Task<StockDto?> GetStockByProductIdAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        var stock = await _dbContext.Stocks
            .Include(s => s.Producto)
                .ThenInclude(p => p.Categoria)
            .FirstOrDefaultAsync(s => s.ProductoId == productId, cancellationToken);

        return stock == null ? null : MapStockToDto(stock);
    }

    public async Task<PagedResult<InventoryMovementDto>> GetMovementsAsync(
        Guid? productId,
        string? movementType,
        string? search,
        DateTime? startDateUtc,
        DateTime? endDateUtc,
        int pageNumber = 1,
        int pageSize = 25,
        string? sortBy = null,
        string? sortDirection = null,
        CancellationToken cancellationToken = default)
    {
        if (startDateUtc.HasValue && endDateUtc.HasValue && startDateUtc.Value > endDateUtc.Value)
        {
            throw new ArgumentException("La fecha inicial no puede ser posterior a la fecha final.");
        }

        var baseQuery = _dbContext.InventoryMovements.AsNoTracking();

        if (productId.HasValue)
        {
            baseQuery = baseQuery.Where(m => m.ProductoId == productId.Value);
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
            baseQuery = baseQuery.Where(m => synonyms.Contains(m.TipoMovimiento.ToLower()));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            var hasOperationalId = int.TryParse(term, out var idVenta) && idVenta > 0;
            baseQuery = baseQuery.Where(m => (hasOperationalId && m.IdVenta == idVenta) ||
                                             m.Producto.Nombre.ToLower().Contains(term) ||
                                             m.Producto.Sku.ToLower().Contains(term) ||
                                             m.NumeroReferencia.ToLower().Contains(term) ||
                                             m.Motivo.ToLower().Contains(term));
        }

        if (startDateUtc.HasValue)
        {
            baseQuery = baseQuery.Where(m => m.FechaCreacionUtc >= startDateUtc.Value);
        }

        if (endDateUtc.HasValue)
        {
            var effectiveEndDate = endDateUtc.Value.TimeOfDay == TimeSpan.Zero
                ? endDateUtc.Value.Date.AddDays(1).AddTicks(-1)
                : endDateUtc.Value;
            baseQuery = baseQuery.Where(m => m.FechaCreacionUtc <= effectiveEndDate);
        }

        var totalItems = await baseQuery.CountAsync(cancellationToken);
        if (totalItems == 0)
        {
            return new PagedResult<InventoryMovementDto>([], 0, pageNumber, pageSize);
        }

        var isDesc = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var sortedQuery = (sortBy?.Trim().ToLowerInvariant()) switch
        {
            "product" or "producto" or "nombre" => isDesc ? baseQuery.OrderByDescending(m => m.Producto.Nombre) : baseQuery.OrderBy(m => m.Producto.Nombre),
            "type" or "tipo" or "tipomovimiento" => isDesc ? baseQuery.OrderByDescending(m => m.TipoMovimiento) : baseQuery.OrderBy(m => m.TipoMovimiento),
            "quantity" or "cantidad" => isDesc ? baseQuery.OrderByDescending(m => m.Cantidad) : baseQuery.OrderBy(m => m.Cantidad),
            "reference" or "referencia" or "numeroreferencia" => isDesc ? baseQuery.OrderByDescending(m => m.NumeroReferencia) : baseQuery.OrderBy(m => m.NumeroReferencia),
            "reason" or "motivo" => isDesc ? baseQuery.OrderByDescending(m => m.Motivo) : baseQuery.OrderBy(m => m.Motivo),
            "user" or "usuario" => isDesc ? baseQuery.OrderByDescending(m => m.Usuario != null ? m.Usuario.NombreUsuario : "") : baseQuery.OrderBy(m => m.Usuario != null ? m.Usuario.NombreUsuario : ""),
            _ => isDesc ? baseQuery.OrderByDescending(m => m.FechaCreacionUtc).ThenByDescending(m => m.Id) : baseQuery.OrderBy(m => m.FechaCreacionUtc).ThenBy(m => m.Id)
        };

        var (skip, take) = QueryPaging.Normalize(pageNumber, pageSize, 100);
        var pagedMovementIds = await sortedQuery
            .Skip(skip)
            .Take(take)
            .Select(m => m.Id)
            .ToListAsync(cancellationToken);

        if (pagedMovementIds.Count == 0)
        {
            return new PagedResult<InventoryMovementDto>([], totalItems, pageNumber, take);
        }

        var movements = await _dbContext.InventoryMovements
            .AsNoTracking()
            .Where(m => pagedMovementIds.Contains(m.Id))
            .Include(m => m.Producto)
            .Include(m => m.Usuario)
            .AsSplitQuery()
            .ToListAsync(cancellationToken);

        var movementsById = movements.ToDictionary(m => m.Id);
        var orderedMovements = pagedMovementIds
            .Where(id => movementsById.ContainsKey(id))
            .Select(id => movementsById[id])
            .ToList();

        var saleIds = orderedMovements.Where(m => m.IdVenta.HasValue).Select(m => m.IdVenta!.Value).Distinct().ToList();
        var invoiceSaleIds = saleIds.Count > 0
            ? (await _dbContext.Sales.Where(s => saleIds.Contains(s.IdVenta) && s.MontoIva > 0).Select(s => s.IdVenta).ToListAsync(cancellationToken)).ToHashSet()
            : new HashSet<int>();

        var dtos = orderedMovements.Select(m => MapMovementToDto(m, invoiceSaleIds)).ToList();
        return new PagedResult<InventoryMovementDto>(dtos, totalItems, pageNumber, take);
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

    private static InventoryMovementDto MapMovementToDto(MovimientoInventario m, HashSet<int>? invoiceSaleIds = null)
    {
        var unitPrice = m.Producto?.PrecioUnitario ?? 0m;
        var unitCost = m.Producto?.CostoUnitario ?? 0m;
        var totalAmount = m.Cantidad * unitPrice;
        var isInvoiceSale = m.IdVenta.HasValue && (invoiceSaleIds?.Contains(m.IdVenta.Value) ?? false);
        var taxAmount = isInvoiceSale ? Math.Round(totalAmount * 0.16m, 2) : 0m;
        var netCost = m.Cantidad * unitCost;
        var profit = totalAmount - netCost;

        var displayReason = m.IdVenta.HasValue && (m.Motivo.StartsWith("Venta folio:", StringComparison.OrdinalIgnoreCase) || m.Motivo.StartsWith("VENTA-", StringComparison.OrdinalIgnoreCase))
            ? $"Venta #{m.IdVenta.Value}"
            : m.Motivo;

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
            unitCost,
            unitPrice,
            totalAmount,
            taxAmount,
            netCost,
            profit,
            displayReason,
            m.NumeroReferencia,
            string.IsNullOrWhiteSpace(m.EvidenceImageUrl) ? null : m.EvidenceImageUrl,
            m.Usuario?.NombreUsuario,
            m.FechaCreacionUtc
        );
    }
}
