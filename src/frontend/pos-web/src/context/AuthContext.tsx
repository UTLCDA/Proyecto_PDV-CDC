import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/auth';
import { apiClient } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('lambrin_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (emailOrUsername: string, password: string) => {
    const res = await apiClient.login(emailOrUsername, password);
    setUser(res.user);
    localStorage.setItem('lambrin_user', JSON.stringify(res.user));
    localStorage.setItem('lambrin_refresh_token', res.refreshToken);
  };

  const logout = () => {
    setUser(null);
    apiClient.setToken(null);
    localStorage.removeItem('lambrin_user');
    localStorage.removeItem('lambrin_refresh_token');
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user) return false;
    const targetCode = `${module}:${action}`.toLowerCase();
    return user.permissions.some(p => p.toLowerCase() === targetCode);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
