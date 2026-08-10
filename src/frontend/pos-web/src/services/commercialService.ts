import { apiClient } from './apiClient';
import {
  ConvertQuoteRequest,
  CreateQuoteRequest,
  CreateReturnRequest,
  DocumentTemplate,
  PaymentInstallment,
  PaymentTransaction,
  Quote,
  QuoteOptions,
  SaleReturn,
  SaveDocumentTemplateRequest
} from '../types/commercial';
import { Venta } from '../types/tiposVentas';

export const commercialService = {
  getQuotes: (search?: string, status?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return apiClient.request<Quote[]>(`/quotes${params.size ? `?${params}` : ''}`);
  },
  getQuoteOptions: () => apiClient.request<QuoteOptions>('/quotes/options'),
  createQuote: (request: CreateQuoteRequest) => apiClient.request<Quote>('/quotes', {
    method: 'POST',
    body: JSON.stringify(request)
  }),
  convertQuoteToSale: (quoteId: string, request: ConvertQuoteRequest) =>
    apiClient.request<Venta>(`/quotes/${quoteId}/convert`, {
      method: 'POST',
      body: JSON.stringify(request)
    }),
  getPendingSales: () => apiClient.request<Venta[]>('/payments/pending-sales'),
  registerInstallment: (saleId: string, amountPaid: number, paymentMethod: string, notes: string) =>
    apiClient.request<PaymentInstallment>('/payments/installment', {
      method: 'POST',
      body: JSON.stringify({ saleId, amountPaid, paymentMethod, notes })
    }),
  getInstallments: (saleId: string) => apiClient.request<PaymentInstallment[]>(`/payments/sale/${saleId}`),
  getInstallmentHistory: (filters: { search?: string; customerId?: string; paymentMethod?: string; startDate?: string; endDate?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
        if (key === 'startDate') params.append('startDateUtc', value);
        if (key === 'endDate') params.append('endDateUtc', value);
      }
    });
    return apiClient.request<PaymentInstallment[]>(`/payments/installments${params.size ? `?${params}` : ''}`);
  },
  getPaymentTransactions: (filters: { search?: string; customerId?: string; paymentMethod?: string; startDate?: string; endDate?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
        if (key === 'startDate') params.append('startDateUtc', value);
        if (key === 'endDate') params.append('endDateUtc', value);
      }
    });
    return apiClient.request<PaymentTransaction[]>(`/payments/transactions${params.size ? `?${params}` : ''}`);
  },
  getEligibleReturnSales: () => apiClient.request<Venta[]>('/returns/eligible-sales'),
  getReturns: (saleId?: string) => apiClient.request<SaleReturn[]>(`/returns${saleId ? `?saleId=${encodeURIComponent(saleId)}` : ''}`),
  processReturn: (request: CreateReturnRequest) => apiClient.request<SaleReturn>('/returns', {
    method: 'POST',
    body: JSON.stringify(request)
  }),
  getDocumentTemplates: () => apiClient.request<DocumentTemplate[]>('/documents/templates'),
  createDocumentTemplate: (request: SaveDocumentTemplateRequest) => apiClient.request<DocumentTemplate>('/documents/templates', {
    method: 'POST',
    body: JSON.stringify(request)
  }),
  updateDocumentTemplate: (id: string, request: SaveDocumentTemplateRequest) => apiClient.request<DocumentTemplate>(`/documents/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request)
  })
};
