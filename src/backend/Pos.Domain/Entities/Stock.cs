using System.ComponentModel.DataAnnotations;
using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class Stock : BaseEntity
{
    public Guid ProductId { get; set; }
    public decimal QuantityOnHand { get; set; } = 0m;
    public decimal MinimumAlertThreshold { get; set; } = 10m;
    public decimal ReorderQuantity { get; set; } = 50m;
    public string Location { get; set; } = "Almacén Principal";

    [Timestamp]
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public Product Product { get; set; } = null!;

    public bool IsLowStock => QuantityOnHand <= MinimumAlertThreshold && QuantityOnHand > 0;
    public bool IsOutOfStock => QuantityOnHand <= 0;

    public void AddStock(decimal quantity)
    {
        if (quantity <= 0) throw new ArgumentException("La cantidad a ingresar debe ser mayor a cero.", nameof(quantity));
        QuantityOnHand += quantity;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void DeductStock(decimal quantity)
    {
        if (quantity <= 0) throw new ArgumentException("La cantidad a deducir debe ser mayor a cero.", nameof(quantity));
        if (QuantityOnHand < quantity)
        {
            throw new InvalidOperationException($"Existencias insuficientes. Disponibles: {QuantityOnHand}, Solicitadas: {quantity}.");
        }
        QuantityOnHand -= quantity;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void SetStock(decimal newQuantity)
    {
        if (newQuantity < 0) throw new ArgumentException("Las existencias no pueden ser negativas.", nameof(newQuantity));
        QuantityOnHand = newQuantity;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
