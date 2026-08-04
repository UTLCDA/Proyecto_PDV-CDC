using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class Customer : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string TaxId { get; set; } = string.Empty; // RFC / VAT
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;

    public string CustomerType { get; set; } = "Regular"; // Regular, Wholesale
    public decimal SpecialDiscountPercentage { get; set; } = 0m;
    public string Notes { get; set; } = string.Empty;

    public string DisplayName => string.IsNullOrWhiteSpace(CompanyName)
        ? $"{FirstName} {LastName}".Trim()
        : $"{CompanyName} ({FirstName} {LastName})".Trim();
}
