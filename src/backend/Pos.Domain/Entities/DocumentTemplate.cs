using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class DocumentTemplate : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "SaleContract"; // SaleContract, LayawayContract, Receipt
    public string TemplateContentHtml { get; set; } = string.Empty;
}
