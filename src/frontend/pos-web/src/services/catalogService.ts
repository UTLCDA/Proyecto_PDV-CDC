import { apiClient } from './apiClient';
import { Category, Product, Customer } from '../types/catalog';
import { PagedResult } from '../types/pagination';
import { appendPaging, appendSorting, PagingRequest } from '../utils/pagedExport';

export const catalogService = {
  getCategories: (search?: string, paging?: PagingRequest, sortBy?: string | null, sortDirection?: 'asc' | 'desc' | null) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<PagedResult<Category>>(`/categories${query}`);
  },
  getProducts: (search?: string, categoryId?: string, paging?: PagingRequest, sortBy?: string | null, sortDirection?: 'asc' | 'desc' | null, includeInactive = false) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);
    if (includeInactive) params.append('includeInactive', 'true');
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<PagedResult<Product>>(`/products${query}`);
  },
  deleteProduct: (productId: string) =>
    apiClient.request<void>(`/products/${productId}`, { method: 'DELETE' }),
  getProductByCode: (code: string) => apiClient.request<Product>(`/products/lookup/${code}`),
  updateProductPrice: (productId: string, unitPrice: number, wholesalePrice: number, reason: string) =>
    apiClient.request<Product>(`/products/${productId}/price`, {
      method: 'PUT',
      body: JSON.stringify({ unitPrice, wholesalePrice, reason })
    }),
  getCustomers: (search?: string, includeInactive = false, paging?: PagingRequest, sortBy?: string | null, sortDirection?: 'asc' | 'desc' | null) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (includeInactive) params.append('includeInactive', 'true');
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<PagedResult<Customer>>(`/customers${query}`);
  }
};
