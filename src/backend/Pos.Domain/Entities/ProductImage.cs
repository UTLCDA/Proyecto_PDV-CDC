using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class ProductImage : BaseEntity
{
    public Guid ProductId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; } = false;
    public int DisplayOrder { get; set; } = 0;

    public Product Product { get; set; } = null!;
}
