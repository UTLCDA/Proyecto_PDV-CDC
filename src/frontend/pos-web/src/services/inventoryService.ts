import { apiClient } from './apiClient';
import { Stock, InventoryMovement, RegisterMovementRequest } from '../types/inventory';

export const inventoryService = {
  getStockLevels: (search?: string, isLowStockOnly?: boolean) => {
    let url = '/inventory';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isLowStockOnly) params.append('isLowStockOnly', 'true');
    if (params.toString()) url += `?${params.toString()}`;
    return apiClient.request<Stock[]>(url);
  },
  getMovements: (productId?: string) => {
    let url = '/inventory/movements';
    if (productId) url += `?productId=${productId}`;
    return apiClient.request<InventoryMovement[]>(url);
  },
  registerMovement: (data: RegisterMovementRequest) =>
    apiClient.request<InventoryMovement>('/inventory/movements', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};
