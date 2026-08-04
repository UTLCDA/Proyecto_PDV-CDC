import { apiClient } from './apiClient';
import { Venta, PeticionCrearVenta } from '../types/tiposVentas';

export const servicioVentas = {
  getSales: (search?: string, customerId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (customerId) params.append('customerId', customerId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<Venta[]>(`/sales${query}`);
  },
  getSaleById: (id: string) => apiClient.request<Venta>(`/sales/${id}`),
  processSale: (request: PeticionCrearVenta) =>
    apiClient.request<Venta>('/sales', {
      method: 'POST',
      body: JSON.stringify(request)
    })
};
