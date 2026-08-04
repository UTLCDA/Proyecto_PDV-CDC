import React from 'react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: string;
  action?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, module, action }) => {
  const { isAuthenticated, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <div className="alert-error" style={{ margin: '2rem' }}>Debe iniciar sesión para acceder.</div>;
  }

  if (module && action && !hasPermission(module, action)) {
    return <div className="alert-error" style={{ margin: '2rem' }}>Acceso denegado. No posee permisos para esta operación.</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
