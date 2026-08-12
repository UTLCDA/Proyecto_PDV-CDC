using Pos.Domain.Common;
using Xunit;

namespace Pos.Domain.Tests.Common;

public class ReceiptReferencesTests
{
    [Fact]
    public void Create_ShouldUseOperationalIdVenta()
    {
        Assert.Equal("RECIBO-47", ReceiptReferences.Create(47));
    }

    [Theory]
    [InlineData("47")]
    [InlineData("RECIBO-47")]
    [InlineData("recibo-47")]
    public void TryParseIdVenta_ShouldAcceptOperationalSearchFormats(string value)
    {
        Assert.True(ReceiptReferences.TryParseIdVenta(value, out var idVenta));
        Assert.Equal(47, idVenta);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_ShouldRejectInvalidOperationalFolio(int idVenta)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => ReceiptReferences.Create(idVenta));
    }
}
