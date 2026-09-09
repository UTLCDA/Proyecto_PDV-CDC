namespace Pos.Application.Common.Models;

/// <summary>
/// Parámetros estándar para solicitudes de listados paginados.
/// </summary>
public class PagedRequest
{
    public const int DefaultPageSize = 25;
    public const int MaxPageSize = 100;

    private int _pageNumber = 1;
    private int _pageSize = DefaultPageSize;

    public int PageNumber
    {
        get => _pageNumber;
        set => _pageNumber = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value <= 0 ? DefaultPageSize : Math.Min(value, MaxPageSize);
    }

    public string? SortBy { get; set; }
    public string? SortDirection { get; set; }

    public bool IsAscending => !string.Equals(SortDirection, "desc", StringComparison.OrdinalIgnoreCase);
}
