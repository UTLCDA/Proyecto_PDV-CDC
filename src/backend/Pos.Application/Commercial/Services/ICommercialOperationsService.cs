using Pos.Application.Commercial.DTOs;
using Pos.Application.Sales.DTOs;

namespace Pos.Application.Commercial.Services;

public interface ICommercialOperationsService
{
    // Quotes & 1-Click Conversion
    Task<List<QuoteDto>> GetQuotesAsync(string? search, string? status, CancellationToken cancellationToken = default);
    Task<QuoteDto?> GetQuoteByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<QuoteDto> CreateQuoteAsync(CreateQuoteDto request, Guid? currentUserId, string correlationId, string ipAddress, bool canApplyDiscount, CancellationToken cancellationToken = default);
    Task<SaleDto> ConvertQuoteToSaleAsync(Guid quoteId, ConvertQuoteToSaleDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);

    // Installment Payments (Abonos)
    Task<PaymentInstallmentDto> RegisterInstallmentPaymentAsync(CreateInstallmentDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<List<PaymentInstallmentDto>> GetInstallmentsByIdVentaAsync(int idVenta, CancellationToken cancellationToken = default);
    Task<List<PaymentInstallmentDto>> GetInstallmentsBySaleIdAsync(Guid saleId, CancellationToken cancellationToken = default);
    Task<List<PaymentInstallmentDto>> GetInstallmentHistoryAsync(string? search, string? paymentMethod, DateTime? startDate, DateTime? endDate, string? customerId = null, CancellationToken cancellationToken = default);
    Task<List<PaymentTransactionDto>> GetPaymentTransactionsAsync(string? search, string? paymentMethod, DateTime? startDate, DateTime? endDate, string? customerId = null, CancellationToken cancellationToken = default);

    // Returns
    Task<ReturnHeaderDto> ProcessReturnAsync(CreateReturnDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<List<ReturnHeaderDto>> GetReturnsAsync(int? idVenta, Guid? saleId, CancellationToken cancellationToken = default);

    // Documents
    Task<List<DocumentTemplateDto>> GetDocumentTemplatesAsync(CancellationToken cancellationToken = default);
    Task<DocumentTemplateDto> CreateDocumentTemplateAsync(SaveDocumentTemplateDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<DocumentTemplateDto> UpdateDocumentTemplateAsync(Guid id, SaveDocumentTemplateDto request, Guid? currentUserId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
}
