using Pos.Domain.Entidades;
using Xunit;

namespace Pos.Domain.Tests.Entities;

public class SaleDomainTests
{
    [Fact]
    public void CalculateTotals_FullPayment_ShouldComputeTaxesAndSetCompletedStatus()
    {
        // Arrange
        var sale = new Venta
        {
            TipoPago = "FullPayment",
            MontoDescuento = 50m
        };

        sale.Partidas.Add(new PartidaVenta { Cantidad = 2m, PrecioUnitario = 300m, PrecioTotal = 600m });

        // Act
        sale.CalcularTotales(0.16m);

        // Assert
        Assert.Equal(600m, sale.SubTotal);
        Assert.Equal(96m, sale.MontoIva);
        Assert.Equal(646m, sale.MontoTotal);
        Assert.Equal(0m, sale.SaldoPendiente);
        Assert.Equal("Completada", sale.Estado);
    }

    [Fact]
    public void CalculateTotals_WithDiscount_ShouldKeepTaxOnBaseSubTotal()
    {
        // Arrange (Venta #48 test case: $899 subtotal, $100 discount)
        var sale = new Venta
        {
            TipoPago = "FullPayment",
            MontoDescuento = 100m
        };

        sale.Partidas.Add(new PartidaVenta { Cantidad = 1m, PrecioUnitario = 899m, PrecioTotal = 899m });

        // Act
        sale.CalcularTotales(0.16m);

        // Assert
        Assert.Equal(899m, sale.SubTotal);
        Assert.Equal(143.84m, sale.MontoIva);
        Assert.Equal(942.84m, sale.MontoTotal);
        Assert.Equal(0m, sale.SaldoPendiente);
        Assert.Equal("Completada", sale.Estado);
    }
}
