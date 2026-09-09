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
import { appendPaging, appendSorting, PagingRequest } from '../utils/pagedExport';
import { PagedResult } from '../types/pagination';

export const commercialService = {
  getQuotes: (
    search?: string,
    status?: string,
    paging?: PagingRequest,
    sortBy?: string | null,
    sortDirection?: 'asc' | 'desc' | null
  ) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    return apiClient.request<PagedResult<Quote>>(`/quotes${params.size ? `?${params}` : ''}`);
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
  registerInstallment: (idVenta: number, amountPaid: number, paymentMethod: string, notes: string) =>
    apiClient.request<PaymentInstallment>('/payments/installment', {
      method: 'POST',
      body: JSON.stringify({ idVenta, amountPaid, paymentMethod, notes })
    }),
  getInstallments: (idVenta: number) => apiClient.request<PaymentInstallment[]>(`/payments/sale/${idVenta}`),
  getInstallmentHistory: (
    filters: { search?: string; customerId?: string; paymentMethod?: string; startDate?: string; endDate?: string } = {},
    paging?: PagingRequest,
    sortBy?: string | null,
    sortDirection?: 'asc' | 'desc' | null
  ) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
        if (key === 'startDate') params.append('startDateUtc', value);
        if (key === 'endDate') params.append('endDateUtc', value);
      }
    });
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    return apiClient.request<PagedResult<PaymentInstallment>>(`/payments/installments${params.size ? `?${params}` : ''}`);
  },
  getPaymentTransactions: (
    filters: { search?: string; customerId?: string; paymentMethod?: string; startDate?: string; endDate?: string } = {},
    paging?: PagingRequest,
    sortBy?: string | null,
    sortDirection?: 'asc' | 'desc' | null
  ) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
        if (key === 'startDate') params.append('startDateUtc', value);
        if (key === 'endDate') params.append('endDateUtc', value);
      }
    });
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    return apiClient.request<PagedResult<PaymentTransaction>>(`/payments/transactions${params.size ? `?${params}` : ''}`);
  },
  getEligibleReturnSales: () => apiClient.request<Venta[]>('/returns/eligible-sales'),
  getReturns: (
    idVenta?: number,
    paging?: PagingRequest,
    sortBy?: string | null,
    sortDirection?: 'asc' | 'desc' | null
  ) => {
    const params = new URLSearchParams();
    if (idVenta) params.set('idVenta', String(idVenta));
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    return apiClient.request<PagedResult<SaleReturn>>(`/returns${params.size ? `?${params}` : ''}`);
  },
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
