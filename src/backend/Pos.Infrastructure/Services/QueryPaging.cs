namespace Pos.Infrastructure.Services;

internal static class QueryPaging
{
    public const int DefaultStandardPageSize = 25;
    public const int DefaultStandardMaxPageSize = 100;
    public const int ExportMaxPageSize = 1_000;
    private const int MaximumPageNumber = 200_000;

    public static (int Skip, int Take) Normalize(
        int page,
        int pageSize,
        int defaultPageSize = DefaultStandardPageSize,
        int maxPageSize = DefaultStandardMaxPageSize)
    {
        var normalizedPage = Math.Clamp(page, 1, MaximumPageNumber);
        var effectiveMax = Math.Max(defaultPageSize, maxPageSize);
        var normalizedPageSize = pageSize <= 0
            ? Math.Clamp(defaultPageSize, 1, effectiveMax)
            : Math.Clamp(pageSize, 1, effectiveMax);
        return (checked((normalizedPage - 1) * normalizedPageSize), normalizedPageSize);
    }
}
