import { apiClient } from './apiClient';
import { Venta, PeticionCrearVenta, ResumenVentas } from '../types/tiposVentas';
import { Producto } from '../types/tiposCatalogo';

export interface ElementoCarrito {
  product: Producto;
  quantity: number;
}

export const servicioVentas = {
  getSales: (search?: string, customerId?: string, status?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (customerId) params.append('customerId', customerId);
    if (status) params.append('status', status);
    if (startDate) {
      params.append('startDate', startDate);
      params.append('startDateUtc', startDate);
    }
    if (endDate) {
      params.append('endDate', endDate);
      params.append('endDateUtc', endDate);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<Venta[]>(`/sales${query}`);
  },
  getSalesSummary: (search?: string, customerId?: string, status?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (customerId) params.append('customerId', customerId);
    if (status) params.append('status', status);
    if (startDate) {
      params.append('startDate', startDate);
      params.append('startDateUtc', startDate);
    }
    if (endDate) {
      params.append('endDate', endDate);
      params.append('endDateUtc', endDate);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<ResumenVentas>(`/sales/summary${query}`);
  },
  getSaleById: (id: string) => apiClient.request<Venta>(`/sales/${id}`),
  processSale: (request: PeticionCrearVenta) =>
    apiClient.request<Venta>('/sales', {
      method: 'POST',
      body: JSON.stringify(request)
    }),
  procesarVenta: (request: PeticionCrearVenta) =>
    apiClient.request<Venta>('/sales', {
      method: 'POST',
      body: JSON.stringify(request)
    })
};
