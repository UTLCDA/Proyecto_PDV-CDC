using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class Product : BaseEntity
{
    public string Sku { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }

    public decimal UnitPrice { get; set; }
    public decimal WholesalePrice { get; set; }
    public decimal WholesaleMinQuantity { get; set; } = 10;
    public string UnitOfMeasure { get; set; } = "Pza"; // Pza, Caja, m2

    // Technical specifications for Lambrín
    public decimal CoveragePerUnitSqM { get; set; } = 0.5m;
    public int WidthMm { get; set; } = 160;
    public int LengthMm { get; set; } = 2900;
    public int ThicknessMm { get; set; } = 24;
    public string Material { get; set; } = "WPC";

    public bool IsQuoteOnly { get; set; } = false;
    public bool IsTopSellerVisible { get; set; } = true;

    public Category Category { get; set; } = null!;
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();

    public decimal CalculateEffectiveUnitPrice(decimal quantity, bool isWholesaleCustomer = false)
    {
        if (isWholesaleCustomer || (WholesaleMinQuantity > 0 && quantity >= WholesaleMinQuantity))
        {
            return WholesalePrice > 0 ? WholesalePrice : UnitPrice;
        }
        return UnitPrice;
    }
}
