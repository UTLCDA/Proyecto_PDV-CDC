using Pos.Application.Common.Models;
using Xunit;

namespace Pos.Application.Tests.Common;

public class PagedResultTests
{
    [Fact]
    public void PagedResult_ShouldCalculatePagesAndNavigationCorrectly()
    {
        var items = new List<string> { "item1", "item2", "item3" };
        var paged = new PagedResult<string>(items, totalItems: 53, pageNumber: 2, pageSize: 25);

        Assert.Equal(3, paged.Count);
        Assert.Equal(2, paged.PageNumber);
        Assert.Equal(25, paged.PageSize);
        Assert.Equal(53, paged.TotalItems);
        Assert.Equal(3, paged.TotalPages);
        Assert.True(paged.HasPreviousPage);
        Assert.True(paged.HasNextPage);
        Assert.Equal("item1", paged[0]);
    }

    [Fact]
    public void PagedResult_FirstPage_ShouldHaveNoPreviousPage()
    {
        var items = new List<string> { "a", "b" };
        var paged = new PagedResult<string>(items, totalItems: 2, pageNumber: 1, pageSize: 25);

        Assert.False(paged.HasPreviousPage);
        Assert.False(paged.HasNextPage);
        Assert.Equal(1, paged.TotalPages);
    }

    [Fact]
    public void PagedResult_JsonSerialization_ShouldIncludeProperties()
    {
        var items = new List<string> { "a", "b" };
        var paged = new PagedResult<string>(items, totalItems: 2, pageNumber: 1, pageSize: 25);
        var json = System.Text.Json.JsonSerializer.Serialize(paged);
        Assert.Contains("totalItems", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void PagedRequest_ShouldEnforceBounds()
    {
        var request = new PagedRequest
        {
            PageNumber = -5,
            PageSize = 999999
        };

        Assert.Equal(1, request.PageNumber);
        Assert.Equal(100, request.PageSize);

        request.PageSize = -10;
        Assert.Equal(25, request.PageSize);
    }
}
