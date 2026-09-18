namespace Pos.Application.Inventory.DTOs;

public record CreatePurchaseReceiptDto(
    Guid ProductoId,
    decimal Cantidad,
    decimal PrecioCosto,
    string? Notas
);

public record UpdatePurchaseReceiptDto(
    decimal Cantidad,
    decimal PrecioCosto,
    string? Notas
);

public record PurchaseReceiptDto(
    Guid Id,
    string Folio,
    Guid ProductoId,
    int IdProducto,
    string NombreProducto,
    string Sku,
    string CodigoBarras,
    decimal PrecioCosto,
    decimal PrecioVenta,
    decimal InventarioAnterior,
    decimal Cantidad,
    decimal InventarioResultante,
    string? Notas,
    Guid? UsuarioId,
    string? UsuarioNombre,
    DateTime FechaCreacionUtc,
    DateTime? FechaModificacionUtc
);
