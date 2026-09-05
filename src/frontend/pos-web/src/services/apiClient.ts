import { AuthResponse } from '../types/auth';

const getApiBaseUrl = (): string => {
  const customApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (customApiUrl) {
    return customApiUrl;
  }

  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;

    // 1. Dominio de producción o preview en Cloudflare Pages
    if (hostname === 'pos.wpcbajio.com' || hostname.endsWith('.pages.dev') || hostname.includes('wpcbajio')) {
      return 'https://api.wpcbajio.com/api/v1';
    }

    // 2. Si estamos bajo HTTPS o en un túnel de Cloudflare
    if (protocol === 'https:' || hostname.includes('trycloudflare.com') || hostname.includes('cloudflare')) {
      return '/api/v1';
    }

    // 3. Si estamos en desarrollo con Vite (cualquier puerto local)
    if (port && port !== '80' && port !== '5000') {
      return '/api/v1';
    }

    // 4. Fallback directo en IIS local sin proxy inverso
    return 'http://localhost:5000/api/v1';
  }
  return '/api/v1';
};

class ApiClient {
  private token: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('lambrin_access_token', token);
    } else {
      localStorage.removeItem('lambrin_access_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('lambrin_access_token');
    }
    return this.token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = getApiBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: options.signal || controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 && allowRefresh && !endpoint.startsWith('/auth/')) {
          const refreshed = await this.tryRefreshSession();
          if (refreshed) {
            return this.request<T>(endpoint, options, false);
          }
        }
        if (response.status === 403) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('lambrin-access-denied', {
              detail: { endpoint, status: 403 }
            }));
          }
        }
        const errorData = await response.json().catch(() => ({ message: 'Error de red o servidor' }));
        throw new Error(errorData.message || `HTTP Error ${response.status}`);
      }

      if (response.status === 204) {
        return null as T;
      }

      return response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al conectar con el servidor (15s). Verifica la conexión.');
      }
      throw err;
    }
  }

  async login(emailOrUsername: string, password: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername, password })
    });
    this.setToken(res.accessToken);
    return res;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    }, false);
    this.setToken(res.accessToken);
    return res;
  }

  async logout(refreshToken: string | null): Promise<void> {
    if (refreshToken) {
      try {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        }, false);
      } catch {
        // El cierre local siempre debe completarse aunque la API no esté disponible.
      }
    }
  }

  async get<T>(endpoint: string): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, { method: 'GET' });
    return { data };
  }

  async post<T>(endpoint: string, body: any): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    return { data };
  }

  async put<T>(endpoint: string, body: any): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    return { data };
  }

  private async tryRefreshSession(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshSession().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async refreshSession(): Promise<boolean> {
    const storedRefreshToken = localStorage.getItem('lambrin_refresh_token');
    if (!storedRefreshToken) {
      this.clearSession();
      return false;
    }

    try {
      const response = await this.refreshToken(storedRefreshToken);
      localStorage.setItem('lambrin_refresh_token', response.refreshToken);
      localStorage.setItem('lambrin_user', JSON.stringify(response.user));
      window.dispatchEvent(new CustomEvent('lambrin-auth-refreshed', { detail: response.user }));
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  private clearSession() {
    this.setToken(null);
    localStorage.removeItem('lambrin_refresh_token');
    localStorage.removeItem('lambrin_user');
    window.dispatchEvent(new Event('lambrin-auth-expired'));
  }
}

export const apiClient = new ApiClient();
export default apiClient;
