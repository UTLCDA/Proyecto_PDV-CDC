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

    public async Task<List<InventoryMovementDto>> GetMovementsAsync(Guid? productId, string? movementType, CancellationToken cancellationToken = default)
    {
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
            query = query.Where(m => m.TipoMovimiento.ToLower() == movementType.ToLower());
        }

        var movements = await query
            .OrderByDescending(m => m.FechaCreacionUtc)
            .Take(100)
            .ToListAsync(cancellationToken);

        return movements.Select(MapMovementToDto).ToList();
    }

    public async Task<InventoryMovementDto> RegisterMovementAsync(RegisterMovementDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default)
    {
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
                CantidadReorden = 50m
            };
            _dbContext.Stocks.Add(stock);
        }

        decimal previousQuantity = stock.CantidadDisponible;
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

        decimal newQuantity = stock.CantidadDisponible;

        var movement = new MovimientoInventario
        {
            ProductoId = request.ProductId,
            TipoMovimiento = movementType,
            Cantidad = request.Quantity,
            CantidadAnterior = previousQuantity,
            CantidadNueva = newQuantity,
            Motivo = request.Reason,
            NumeroReferencia = request.ReferenceNumber,
            UsuarioId = currentUserId,
            FechaCreacionUtc = DateTime.UtcNow
        };

        _dbContext.InventoryMovements.Add(movement);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            correlationId,
            currentUserId,
            $"STOCK_MOVEMENT_{movementType.ToUpperInvariant()}",
            "Existencia",
            stock.Id.ToString(),
            $"{{ \"CantidadDisponible\": {previousQuantity} }}",
            $"{{ \"CantidadDisponible\": {newQuantity} }}",
            ipAddress,
            $"Motivo: {request.Reason}, Ref: {request.ReferenceNumber}",
            cancellationToken);

        return MapMovementToDto(movement);
    }

    private static StockDto MapStockToDto(Existencia stock)
    {
        return new StockDto(
            stock.Id,
            stock.ProductoId,
            stock.Producto.Sku,
            stock.Producto.Nombre,
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
            m.ProductoId,
            m.Producto?.Sku ?? string.Empty,
            m.Producto?.Nombre ?? string.Empty,
            m.TipoMovimiento,
            m.Cantidad,
            m.CantidadAnterior,
            m.CantidadNueva,
            m.Motivo,
            m.NumeroReferencia,
            m.Usuario?.NombreUsuario,
            m.FechaCreacionUtc
        );
    }
}
