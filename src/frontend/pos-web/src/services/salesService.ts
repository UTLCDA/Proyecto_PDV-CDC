import { apiClient } from './apiClient';
import { Sale, CreateSaleRequest } from '../types/sales';

export const salesService = {
  getSales: (search?: string) => {
    let url = '/sales';
    if (search) url += `?search=${encodeURIComponent(search)}`;
    return apiClient.request<Sale[]>(url);
  },
  getSaleByIdVenta: (idVenta: number) => apiClient.request<Sale>(`/sales/${idVenta}`),
  getSaleByGuid: (id: string) => apiClient.request<Sale>(`/sales/by-guid/${id}`),
  processSale: (data: CreateSaleRequest) =>
    apiClient.request<Sale>('/sales', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};
