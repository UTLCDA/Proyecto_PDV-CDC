import { apiClient } from './apiClient';
import { Stock, InventoryMovement, RegisterMovementRequest } from '../types/inventory';
import { appendPaging, appendSorting, PagingRequest } from '../utils/pagedExport';
import { PagedResult } from '../types/pagination';

export const inventoryService = {
  getStockLevels: (
    search?: string,
    isLowStockOnly?: boolean,
    paging?: PagingRequest,
    sortBy?: string | null,
    sortDirection?: 'asc' | 'desc' | null
  ) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isLowStockOnly) params.append('isLowStockOnly', 'true');
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<PagedResult<Stock>>(`/inventory${query}`);
  },
  getMovements: (
    filters: { productId?: string; movementType?: string; search?: string; startDateUtc?: string; endDateUtc?: string } = {},
    paging?: PagingRequest,
    sortBy?: string | null,
    sortDirection?: 'asc' | 'desc' | null
  ) => {
    const params = new URLSearchParams();
    if (filters.productId) params.append('productId', filters.productId);
    if (filters.movementType) params.append('movementType', filters.movementType);
    if (filters.search) params.append('search', filters.search);
    if (filters.startDateUtc) params.append('startDateUtc', filters.startDateUtc);
    if (filters.endDateUtc) params.append('endDateUtc', filters.endDateUtc);
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<PagedResult<InventoryMovement>>(`/inventory/movements${query}`);
  },
  registerMovement: (data: RegisterMovementRequest) =>
    apiClient.request<InventoryMovement>('/inventory/movements', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};
