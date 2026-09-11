import api from './apiClient';
import {
  Producto,
  Categoria,
  Cliente,
  PeticionCrearCategoria,
  PeticionActualizarCategoria,
  PeticionCrearProducto,
  PeticionActualizarProducto,
  PeticionCrearCliente,
  PeticionActualizarCliente,
  ProductImageResult,
  MigrateBase64ImagesResult
} from '../types/tiposCatalogo';
import { appendPaging, appendSorting, PagingRequest } from '../utils/pagedExport';
import { PagedResult } from '../types/pagination';

export const servicioCatalogo = {
  // Categories
  getCategories: async (
    search?: string,
    paging?: PagingRequest,
    sortBy?: string | null,
    sortDirection?: 'asc' | 'desc' | null
  ): Promise<PagedResult<Categoria>> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<PagedResult<Categoria>>(`/categories${query}`);
    return response.data;
  },

  createCategory: async (data: PeticionCrearCategoria): Promise<Categoria> => {
    const response = await api.post<Categoria>('/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: PeticionActualizarCategoria): Promise<Categoria> => {
    const response = await api.put<Categoria>(`/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.request(`/categories/${id}`, { method: 'DELETE' });
  },

  // Products
  getProducts: async (
    search?: string,
    categoryId?: string,
    paging?: PagingRequest,
    sortBy?: string | null,
    sortDirection?: 'asc' | 'desc' | null,
    includeInactive = false
  ): Promise<PagedResult<Producto>> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);
    if (includeInactive) params.append('includeInactive', 'true');
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<PagedResult<Producto>>(`/products${query}`);
    return response.data;
  },

  getProductByCode: async (code: string): Promise<Producto> => {
    const response = await api.get<Producto>(`/products/code/${code}`);
    return response.data;
  },

  createProduct: async (data: PeticionCrearProducto): Promise<Producto> => {
    const response = await api.post<Producto>('/products', data);
    return response.data;
  },

  updateProduct: async (id: string, data: PeticionActualizarProducto): Promise<Producto> => {
    const response = await api.put<Producto>(`/products/${id}`, data);
    return response.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await api.request(`/products/${id}`, { method: 'DELETE' });
  },

  uploadProductImage: async (productId: string, file: File | Blob, fileName = 'image.jpg'): Promise<ProductImageResult> => {
    const formData = new FormData();
    formData.append('image', file, fileName);
    const response = await api.post<ProductImageResult>(`/products/${productId}/image`, formData);
    return response.data;
  },

  deleteProductImage: async (productId: string): Promise<void> => {
    await api.delete(`/products/${productId}/image`);
  },

  migrateBase64Images: async (): Promise<MigrateBase64ImagesResult> => {
    const response = await api.post<MigrateBase64ImagesResult>('/products/migrate-base64-images');
    return response.data;
  },

  // Customers
  getCustomers: async (
    search?: string,
    type?: string,
    includeInactive = false,
    paging?: PagingRequest,
    sortBy?: string | null,
    sortDirection?: 'asc' | 'desc' | null
  ): Promise<PagedResult<Cliente>> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (type) params.append('type', type);
    if (includeInactive) params.append('includeInactive', 'true');
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<PagedResult<Cliente>>(`/customers${query}`);
    return response.data;
  },

  createCustomer: async (data: PeticionCrearCliente): Promise<Cliente> => {
    const response = await api.post<Cliente>('/customers', data);
    return response.data;
  },

  updateCustomer: async (id: string, data: PeticionActualizarCliente): Promise<Cliente> => {
    const response = await api.put<Cliente>(`/customers/${id}`, data);
    return response.data;
  }
};
