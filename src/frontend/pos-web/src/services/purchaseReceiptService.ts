import { apiClient } from './apiClient';
import { PurchaseReceipt, CreatePurchaseReceiptRequest, UpdatePurchaseReceiptRequest } from '../types/purchaseReceipt';
import { appendPaging, appendSorting, PagingRequest } from '../utils/pagedExport';
import { PagedResult } from '../types/pagination';

export const purchaseReceiptService = {
  getReceipts: (
    search?: string,
    paging?: PagingRequest,
    sortBy?: string | null,
    sortDirection?: 'asc' | 'desc' | null
  ) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<PagedResult<PurchaseReceipt>>(`/purchase-receipts${query}`);
  },

  getReceiptById: (id: string) =>
    apiClient.request<PurchaseReceipt>(`/purchase-receipts/${id}`),

  createReceipt: (data: CreatePurchaseReceiptRequest) =>
    apiClient.request<PurchaseReceipt>('/purchase-receipts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateReceipt: (id: string, data: UpdatePurchaseReceiptRequest) =>
    apiClient.request<PurchaseReceipt>(`/purchase-receipts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
};
