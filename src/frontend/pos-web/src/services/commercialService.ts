import { apiClient } from './apiClient';
import { Quote, PaymentInstallment, DocumentTemplate } from '../types/commercial';
import { Sale } from '../types/sales';

export const commercialService = {
  getQuotes: (search?: string) => {
    let url = '/quotes';
    if (search) url += `?search=${encodeURIComponent(search)}`;
    return apiClient.request<Quote[]>(url);
  },
  convertQuoteToSale: (quoteId: string) =>
    apiClient.request<Sale>(`/quotes/${quoteId}/convert`, {
      method: 'POST'
    }),
  registerInstallment: (saleId: string, amountPaid: number, paymentMethod: string, notes: string) =>
    apiClient.request<PaymentInstallment>('/payments/installment', {
      method: 'POST',
      body: JSON.stringify({ saleId, amountPaid, paymentMethod, notes })
    }),
  getDocumentTemplates: () => apiClient.request<DocumentTemplate[]>('/documents/templates')
};
