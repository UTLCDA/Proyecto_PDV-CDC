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
  PeticionActualizarCliente
} from '../types/tiposCatalogo';
import { appendPaging, PagingRequest } from '../utils/pagedExport';

export const servicioCatalogo = {
  // Categories
  getCategories: async (): Promise<Categoria[]> => {
    const response = await api.get<Categoria[]>('/categories');
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
  getProducts: async (search?: string, categoryId?: string): Promise<Producto[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);

    const response = await api.get<Producto[]>(`/products?${params.toString()}`);
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

  // Customers
  getCustomers: async (search?: string, type?: string, includeInactive = false, paging?: PagingRequest): Promise<Cliente[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (type) params.append('type', type);
    if (includeInactive) params.append('includeInactive', 'true');
    appendPaging(params, paging);

    const response = await api.get<Cliente[]>(`/customers?${params.toString()}`);
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
