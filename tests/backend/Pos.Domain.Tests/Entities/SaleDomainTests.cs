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
        Assert.Equal(88m, sale.MontoIva);
        Assert.Equal(638m, sale.MontoTotal);
        Assert.Equal(0m, sale.SaldoPendiente);
        Assert.Equal("Completada", sale.Estado);
    }
}
