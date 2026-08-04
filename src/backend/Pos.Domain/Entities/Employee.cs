using Pos.Domain.Common;

namespace Pos.Domain.Entities;

public class Employee : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public DateTime HireDate { get; set; } = DateTime.UtcNow;

    public string FullName => $"{FirstName} {LastName}".Trim();
}
