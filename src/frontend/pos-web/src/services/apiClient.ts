import { AuthResponse } from '../types/auth';

const API_BASE = '/api/v1';

class ApiClient {
  private token: string | null = null;

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

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
      }
      const errorData = await response.json().catch(() => ({ message: 'Error de red o servidor' }));
      throw new Error(errorData.message || `HTTP Error ${response.status}`);
    }

    return response.json();
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
    });
    this.setToken(res.accessToken);
    return res;
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
}

export const apiClient = new ApiClient();
export default apiClient;
