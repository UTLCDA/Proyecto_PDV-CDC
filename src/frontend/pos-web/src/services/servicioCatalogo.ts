import api from './apiClient';
import {
  Producto,
  Categoria,
  Cliente,
  PeticionCrearProducto,
  PeticionActualizarProducto,
  PeticionCrearCliente,
  PeticionActualizarCliente
} from '../types/tiposCatalogo';

export const servicioCatalogo = {
  // Categories
  getCategories: async (): Promise<Categoria[]> => {
    const response = await api.get<Categoria[]>('/categories');
    return response.data;
  },

  createCategory: async (data: { name: string; description: string; parentCategoryId?: string }): Promise<Categoria> => {
    const response = await api.post<Categoria>('/categories', data);
    return response.data;
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
  getCustomers: async (search?: string, type?: string, includeInactive = false): Promise<Cliente[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (type) params.append('type', type);
    if (includeInactive) params.append('includeInactive', 'true');

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
