using System.Collections;

namespace Pos.Application.Common.Models;

/// <summary>
/// Modelo genérico para respuestas paginadas estándar en la API.
/// No implementa IEnumerable para asegurar que System.Text.Json lo serialice como objeto con metadatos.
/// </summary>
public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 25;
    public int TotalItems { get; init; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalItems / PageSize) : 0;
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;

    public PagedResult()
    {
    }

    public PagedResult(IReadOnlyList<T> items, int totalItems, int pageNumber, int pageSize)
    {
        Items = items ?? Array.Empty<T>();
        TotalItems = Math.Max(0, totalItems);
        PageNumber = Math.Max(1, pageNumber);
        PageSize = Math.Max(1, pageSize);
    }

    public static PagedResult<T> Empty(int pageNumber = 1, int pageSize = 25) =>
        new(Array.Empty<T>(), 0, pageNumber, pageSize);

    // Propiedades de conveniencia sin implementar IEnumerable
    public int Count => Items.Count;
    public T this[int index] => Items[index];
}
