import { apiClient } from './apiClient';
import { Sale, CreateSaleRequest } from '../types/sales';
import { PagedResult } from '../types/pagination';
import { appendPaging, appendSorting, PagingRequest } from '../utils/pagedExport';

export const salesService = {
  getSales: (search?: string, paging?: PagingRequest, sortBy?: string | null, sortDirection?: 'asc' | 'desc' | null) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<PagedResult<Sale>>(`/sales${query}`);
  },
  getSaleByIdVenta: (idVenta: number) => apiClient.request<Sale>(`/sales/${idVenta}`),
  getSaleByGuid: (id: string) => apiClient.request<Sale>(`/sales/by-guid/${id}`),
  processSale: (data: CreateSaleRequest) =>
    apiClient.request<Sale>('/sales', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};
