export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  roles: string[];
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  user: User;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}
