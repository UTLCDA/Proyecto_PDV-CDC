import { apiClient } from './apiClient';
import { Sale, CreateSaleRequest } from '../types/sales';

export const salesService = {
  getSales: (search?: string) => {
    let url = '/sales';
    if (search) url += `?search=${encodeURIComponent(search)}`;
    return apiClient.request<Sale[]>(url);
  },
  getSaleById: (id: string) => apiClient.request<Sale>(`/sales/${id}`),
  processSale: (data: CreateSaleRequest) =>
    apiClient.request<Sale>('/sales', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};
