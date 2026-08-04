import { apiClient } from './apiClient';
import { Category, Product, Customer } from '../types/catalog';

export const catalogService = {
  getCategories: () => apiClient.request<Category[]>('/categories'),
  getProducts: (search?: string, categoryId?: string) => {
    let url = '/products';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);
    if (params.toString()) url += `?${params.toString()}`;
    return apiClient.request<Product[]>(url);
  },
  getProductByCode: (code: string) => apiClient.request<Product>(`/products/lookup/${code}`),
  updateProductPrice: (productId: string, unitPrice: number, wholesalePrice: number, reason: string) =>
    apiClient.request<Product>(`/products/${productId}/price`, {
      method: 'PUT',
      body: JSON.stringify({ unitPrice, wholesalePrice, reason })
    }),
  getCustomers: (search?: string) => {
    let url = '/customers';
    if (search) url += `?search=${encodeURIComponent(search)}`;
    return apiClient.request<Customer[]>(url);
  }
};
