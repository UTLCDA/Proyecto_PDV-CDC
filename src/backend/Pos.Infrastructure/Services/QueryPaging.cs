namespace Pos.Infrastructure.Services;

internal static class QueryPaging
{
    private const int MaximumPageSize = 1_000;
    private const int MaximumPageNumber = 200_000;

    public static (int Skip, int Take) Normalize(int page, int pageSize, int defaultPageSize)
    {
        var normalizedPage = Math.Clamp(page, 1, MaximumPageNumber);
        var normalizedPageSize = pageSize <= 0
            ? Math.Clamp(defaultPageSize, 1, MaximumPageSize)
            : Math.Clamp(pageSize, 1, MaximumPageSize);
        return (checked((normalizedPage - 1) * normalizedPageSize), normalizedPageSize);
    }
}
