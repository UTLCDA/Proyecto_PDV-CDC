import { PagedResult, ProductImageUploadResult, StudioProduct, MigrateBase64Result } from '../types/studioTypes';

const TOKEN_KEY = 'wpc_studio_token';
const USER_KEY = 'wpc_studio_user';
const API_URL_KEY = 'wpc_studio_api_url';

export const API_PRESETS = [
  { id: 'pr', label: '🔴 PR Producción (api.wpcbajio.com)', url: 'https://api.wpcbajio.com' },
  { id: 'local', label: '🟢 DEV Local (localhost:5000)', url: 'http://localhost:5000' },
  { id: 'proxy', label: '⚡ Proxy Local (Vite -> :5000)', url: '' }
] as const;

export const getStoredApiUrl = (): string => {
  const stored = localStorage.getItem(API_URL_KEY);
  if (stored !== null) return stored;
  // Default to PR (Production VPS) as requested by user
  return 'https://api.wpcbajio.com';
};

export const isProductionApi = (): boolean => {
  const url = getStoredApiUrl();
  return url.includes('wpcbajio.com');
};

export const setStoredApiUrl = (url: string) => {
  localStorage.setItem(API_URL_KEY, url.trim().replace(/\/+$/, ''));
};

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getStoredUser = () => {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const setStoredAuth = (token: string, user: any) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const getBaseUrl = (): string => {
  return getStoredApiUrl();
};

const getHeaders = (isFormData = false): HeadersInit => {
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const mediaApi = {
  async login(emailOrUsername: string, password: string) {
    const base = getBaseUrl();
    const url = `${base}/api/v1/auth/login`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername, password })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al iniciar sesión en el estudio.');
    }

    const data = await res.json();
    const token = data.accessToken || data.token;
    const user = data.user || { username: emailOrUsername, roles: ['Administrador'] };
    setStoredAuth(token, user);
    return { token, user };
  },

  async getProducts(search = '', page = 1, pageSize = 50): Promise<PagedResult<StudioProduct>> {
    const base = getBaseUrl();
    const params = new URLSearchParams({
      page: String(page),
      pageNumber: String(page),
      pageSize: String(pageSize),
      includeInactive: 'true'
    });
    if (search.trim()) {
      params.append('search', search.trim());
    }

    const res = await fetch(`${base}/api/v1/products?${params.toString()}`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!res.ok) {
      if (res.status === 401) {
        clearStoredAuth();
        window.dispatchEvent(new CustomEvent('wpc-studio-unauthorized'));
      }
      throw new Error(`Error al consultar catálogo de productos (${res.status})`);
    }

    return await res.json();
  },

  async uploadProductImage(productId: string, file: File): Promise<ProductImageUploadResult> {
    const base = getBaseUrl();
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${base}/api/v1/products/${productId}/image`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Error al subir imagen (${res.status})`);
    }

    return await res.json();
  },

  async deleteProductImage(productId: string): Promise<void> {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/v1/products/${productId}/image`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Error al eliminar imagen (${res.status})`);
    }
  },

  async migrateBase64Images(): Promise<MigrateBase64Result> {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/v1/products/migrate-base64-images`, {
      method: 'POST',
      headers: getHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Error al ejecutar migración (${res.status})`);
    }

    return await res.json();
  },

  resolveImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith('data:image')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = getBaseUrl();
    return `${base}${url}`;
  },

  async testImageHealth(url: string | null | undefined): Promise<{ ok: boolean; status: number; sizeBytes?: number }> {
    if (!url) return { ok: false, status: 404 };
    const fullUrl = this.resolveImageUrl(url);
    if (!fullUrl) return { ok: false, status: 404 };
    try {
      const res = await fetch(fullUrl, { method: 'HEAD' });
      const length = res.headers.get('content-length');
      return {
        ok: res.ok,
        status: res.status,
        sizeBytes: length ? parseInt(length, 10) : undefined
      };
    } catch {
      return { ok: false, status: 0 };
    }
  }
};
