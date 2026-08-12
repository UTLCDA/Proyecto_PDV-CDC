using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pos.Application.Commercial.DTOs;
using Pos.Application.Sales.DTOs;
using Pos.Domain.Common;
using Pos.Infrastructure.Identity;
using Pos.Infrastructure.Persistence;
using Pos.Infrastructure.Services;
using Xunit;

namespace Pos.Application.Tests.Commercial;

public class CommercialOperationsTests
{
    private PosDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<PosDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new PosDbContext(options);
    }

    private static async Task SeedOpenShiftAsync(PosDbContext context, Guid userId)
    {
        context.CashShifts.Add(new Pos.Domain.Entidades.TurnoCaja
        {
            NumeroTurno = $"TURNO-{Guid.NewGuid():N}",
            UsuarioId = userId,
            MontoApertura = 1000m,
            MontoCierreEsperado = 1000m,
            Estado = CashShiftStatuses.Open,
            FechaAperturaUtc = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task CreateQuoteAsync_ShouldCreateQuote_WithGeneratedNumber()
    {
        // Arrange
        var context = GetInMemoryDbContext();
        var passwordHasher = new PasswordHasherService();
        var auditService = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        await DbInitializer.SeedAsync(context, passwordHasher);

        var saleService = new SaleApplicationService(context, auditService);
        var commercialService = new CommercialOperationsService(context, saleService, auditService);
        var product = await context.Products.FirstAsync();
        var customer = await context.Customers.FirstAsync();

        var request = new CreateQuoteDto(
            CustomerId: customer.Id,
            DiscountAmount: 0m,
            ValidityDays: 15,
            Notes: "Cotizacion de prueba",
            Items: new List<CreateQuoteItemDto>
            {
                new(product.Id, 10m, 0.01m, 0m)
            }
        );

        // Act
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        var result = await commercialService.CreateQuoteAsync(request, userId, "corr-quote-1", "127.0.0.1", false);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.QuoteNumber);
        Assert.Equal(QuoteStatuses.Active, result.Status);
        Assert.Single(result.Items);
        Assert.Equal(product.PrecioMayoreo, result.Items.Single().UnitPrice);
    }

    [Fact]
    public async Task ConvertQuoteToSaleAsync_ShouldConvertOnlyOnce_AndPreserveAuthorizedQuotePrice()
    {
        await using var context = GetInMemoryDbContext();
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var audit = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        var saleService = new SaleApplicationService(context, audit);
        var service = new CommercialOperationsService(context, saleService, audit);
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        var customer = await context.Customers.FirstAsync();
        var product = await context.Products.FirstAsync();
        await SeedOpenShiftAsync(context, userId);

        var quote = await service.CreateQuoteAsync(
            new CreateQuoteDto(customer.Id, 0m, 15, "Conversión", [new CreateQuoteItemDto(product.Id, 1m, 0.01m, 0m)]),
            userId,
            "quote",
            "127.0.0.1",
            false);

        product.PrecioUnitario += 100m;
        await context.SaveChangesAsync();
        var sale = await service.ConvertQuoteToSaleAsync(
            quote.Id,
            new ConvertQuoteToSaleDto(SalePaymentTypes.FullPayment, 0m, quote.TotalAmount, 0m, 0m),
            userId,
            "convert",
            "127.0.0.1");

        Assert.Equal(quote.Items.Single().UnitPrice, sale.Items.Single().UnitPrice);
        Assert.Equal(QuoteStatuses.Converted, (await context.Quotes.SingleAsync(item => item.Id == quote.Id)).Estado);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ConvertQuoteToSaleAsync(
            quote.Id,
            new ConvertQuoteToSaleDto(SalePaymentTypes.FullPayment, 0m, quote.TotalAmount, 0m, 0m),
            userId,
            "convert-again",
            "127.0.0.1"));
        Assert.Single(context.Sales);
    }

    [Fact]
    public async Task RegisterInstallmentPaymentAsync_ShouldRejectOverpayment_AndUpdateBalance()
    {
        await using var context = GetInMemoryDbContext();
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var audit = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        var saleService = new SaleApplicationService(context, audit);
        var service = new CommercialOperationsService(context, saleService, audit);
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        var customerId = await context.Customers.Select(customer => customer.Id).FirstAsync();
        var product = await context.Products.FirstAsync();
        await SeedOpenShiftAsync(context, userId);

        var total = product.PrecioUnitario * 1.16m;
        var sale = await saleService.ProcessSaleAsync(
            new CreateSaleDto(customerId, SalePaymentTypes.AdvanceDeposit, 0m, 100m, 100m, 0m, 0m, "Apartado", [new CreateSaleItemDto(product.Id, 1m, 0.01m, 0m)]),
            userId,
            "sale",
            "127.0.0.1");
        const int idVenta = 501;
        var persistedSale = await context.Sales.SingleAsync(item => item.Id == sale.Id);
        persistedSale.IdVenta = idVenta;
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.RegisterInstallmentPaymentAsync(
            new CreateInstallmentDto(null, sale.PendingBalance + 0.01m, PaymentMethods.Cash, string.Empty, idVenta),
            userId,
            "overpayment",
            "127.0.0.1"));
        var installment = await service.RegisterInstallmentPaymentAsync(
            new CreateInstallmentDto(null, 50m, PaymentMethods.Cash, "Segundo abono", idVenta),
            userId,
            "installment",
            "127.0.0.1");

        var installmentsByIdVenta = await service.GetInstallmentsByIdVentaAsync(idVenta);
        var receiptReference = ReceiptReferences.Create(idVenta);
        var historyByIdVenta = await service.GetInstallmentHistoryAsync(idVenta.ToString(), null, null, null);
        var historyByReceipt = await service.GetInstallmentHistoryAsync(receiptReference, null, null, null);
        var transactionsByIdVenta = await service.GetPaymentTransactionsAsync(idVenta.ToString(), null, null, null);
        var transactionsByReceipt = await service.GetPaymentTransactionsAsync(receiptReference, null, null, null);
        var saleDetail = await saleService.GetSaleByFolioAsync(idVenta);
        Assert.Equal(sale.PendingBalance - 50m, installment.NewPendingBalance);
        Assert.Equal(idVenta, installment.IdVenta);
        Assert.Equal(receiptReference, installment.ReceiptNumber);
        Assert.Equal(PaymentMethods.Cash, installment.PaymentMethod);
        Assert.Equal(2, installmentsByIdVenta.Count);
        Assert.All(installmentsByIdVenta, item => Assert.Equal(idVenta, item.IdVenta));
        Assert.All(installmentsByIdVenta, item => Assert.Equal(receiptReference, item.ReceiptNumber));
        Assert.Equal(historyByIdVenta.Select(item => item.Id), historyByReceipt.Select(item => item.Id));
        Assert.All(historyByReceipt, item => Assert.Equal(receiptReference, item.ReceiptNumber));
        Assert.Equal(transactionsByIdVenta.Select(item => item.Id), transactionsByReceipt.Select(item => item.Id));
        Assert.All(transactionsByReceipt, item => Assert.Equal(receiptReference, item.ReferenceNumber));
        Assert.NotNull(saleDetail);
        Assert.All(saleDetail.Payments, payment => Assert.Equal(receiptReference, payment.ReferenceNumber));

        var persistedInstallment = await context.PaymentInstallments.SingleAsync();
        Assert.Equal(idVenta, persistedInstallment.IdVenta);
        Assert.Equal(receiptReference, persistedInstallment.NumeroRecibo);
        var cashMovement = await context.CashTransactions.SingleAsync(item => item.TipoTransaccion == "Abono");
        Assert.Equal(idVenta, cashMovement.IdVenta);
        Assert.Contains(receiptReference, cashMovement.Motivo);
    }

    [Fact]
    public async Task ProcessReturnAsync_ShouldUseSalePrice_RestoreStock_AndPreventExcess()
    {
        await using var context = GetInMemoryDbContext();
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var audit = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        var saleService = new SaleApplicationService(context, audit);
        var service = new CommercialOperationsService(context, saleService, audit);
        var userId = await context.Users.Select(user => user.Id).FirstAsync();
        var product = await context.Products.FirstAsync();
        await SeedOpenShiftAsync(context, userId);

        var originalStock = (await context.Stocks.SingleAsync(stock => stock.ProductoId == product.Id)).CantidadDisponible;
        var subtotal = product.PrecioUnitario * 2m;
        var sale = await saleService.ProcessSaleAsync(
            new CreateSaleDto(null, SalePaymentTypes.FullPayment, 0m, 0m, subtotal * 1.16m, 0m, 0m, "Venta", [new CreateSaleItemDto(product.Id, 2m, 0.01m, 0m)]),
            userId,
            "sale-return",
            "127.0.0.1");
        const int idVenta = 502;
        var persistedSale = await context.Sales.SingleAsync(item => item.Id == sale.Id);
        persistedSale.IdVenta = idVenta;
        await context.SaveChangesAsync();

        var processedReturn = await service.ProcessReturnAsync(
            new CreateReturnDto(null, RefundMethods.StoreCredit, "Cambio de acabado", [new CreateReturnItemDto(product.Id, 1m)], idVenta),
            userId,
            "return",
            "127.0.0.1");

        Assert.Equal(product.PrecioUnitario * 1.16m, processedReturn.TotalRefundAmount);
        Assert.Equal(idVenta, processedReturn.IdVenta);
        Assert.Equal(originalStock - 1m, (await context.Stocks.SingleAsync(stock => stock.ProductoId == product.Id)).CantidadDisponible);
        Assert.Equal(SaleStatuses.PartiallyReturned, (await context.Sales.SingleAsync(item => item.Id == sale.Id)).Estado);
        Assert.Equal(idVenta, (await context.InventoryMovements.OrderByDescending(item => item.FechaCreacionUtc).FirstAsync()).IdVenta);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ProcessReturnAsync(
            new CreateReturnDto(null, RefundMethods.StoreCredit, "Intento excedente", [new CreateReturnItemDto(product.Id, 2m)], idVenta),
            userId,
            "return-excess",
            "127.0.0.1"));
        Assert.Single(context.ReturnHeaders);
    }

    [Fact]
    public async Task SaveDocumentTemplateAsync_ShouldCreateAndUpdateAuditedPlainTextTemplate()
    {
        await using var context = GetInMemoryDbContext();
        await DbInitializer.SeedAsync(context, new PasswordHasherService());
        var audit = new AuditLogService(context, NullLogger<AuditLogService>.Instance);
        var service = new CommercialOperationsService(context, new SaleApplicationService(context, audit), audit);
        var userId = await context.Users.Select(user => user.Id).FirstAsync();

        var created = await service.CreateDocumentTemplateAsync(
            new SaveDocumentTemplateDto("Contrato de venta", DocumentTemplateCategories.SaleContract, "Folio: {{FOLIO}}"),
            userId,
            "template-create",
            "127.0.0.1");
        var updated = await service.UpdateDocumentTemplateAsync(
            created.Id,
            new SaveDocumentTemplateDto("Contrato de venta WPC", DocumentTemplateCategories.SaleContract, "Cliente: {{CLIENTE}}"),
            userId,
            "template-update",
            "127.0.0.1");

        Assert.Equal("Contrato de venta WPC", updated.Title);
        Assert.Equal("Cliente: {{CLIENTE}}", updated.TemplateContentHtml);
        Assert.Contains(context.AuditLogs, log => log.Accion == "DOCUMENT_TEMPLATE_UPDATED");
    }
}
