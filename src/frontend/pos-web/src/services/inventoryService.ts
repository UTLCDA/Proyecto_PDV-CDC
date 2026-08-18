import { apiClient } from './apiClient';
import { Stock, InventoryMovement, RegisterMovementRequest } from '../types/inventory';
import { appendPaging, PagingRequest } from '../utils/pagedExport';

export const inventoryService = {
  getStockLevels: (search?: string, isLowStockOnly?: boolean) => {
    let url = '/inventory';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isLowStockOnly) params.append('isLowStockOnly', 'true');
    if (params.toString()) url += `?${params.toString()}`;
    return apiClient.request<Stock[]>(url);
  },
  getMovements: (filters: { productId?: string; movementType?: string; search?: string; startDateUtc?: string; endDateUtc?: string } = {}, paging?: PagingRequest) => {
    const params = new URLSearchParams();
    if (filters.productId) params.append('productId', filters.productId);
    if (filters.movementType) params.append('movementType', filters.movementType);
    if (filters.search) params.append('search', filters.search);
    if (filters.startDateUtc) params.append('startDateUtc', filters.startDateUtc);
    if (filters.endDateUtc) params.append('endDateUtc', filters.endDateUtc);
    appendPaging(params, paging);
    const query = params.toString();
    const url = `/inventory/movements${query ? `?${query}` : ''}`;
    return apiClient.request<InventoryMovement[]>(url);
  },
  registerMovement: (data: RegisterMovementRequest) =>
    apiClient.request<InventoryMovement>('/inventory/movements', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};
