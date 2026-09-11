import React, { useState } from 'react';
import { getStoredApiUrl, mediaApi, setStoredApiUrl } from '../api/mediaApi';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('admin@lambrin.com');
  const [password, setPassword] = useState('Admin123!');
  const [apiUrl, setApiUrl] = useState(getStoredApiUrl());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      setStoredApiUrl(apiUrl);
      const res = await mediaApi.login(emailOrUsername, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas o servidor no alcanzable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="studio-logo-badge" style={{ width: '48px', height: '48px', fontSize: '1.6rem' }}>
            🖼️
          </div>
          <h2>WPC Media Studio</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Portal Fachada DEV / Administrador para Gestión de Imágenes WebP
          </p>
          <span className="dev-badge">Acceso Exclusivo de Sistemas</span>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Destino API</label>
            <select
              className="form-input"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
            >
              <option value="">Local (Vite Proxy :5000)</option>
              <option value="http://localhost:5000">Directo Local (http://localhost:5000)</option>
              <option value="https://api.wpcbajio.com">VPS Producción (api.wpcbajio.com)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Usuario o Correo DEV</label>
            <input
              type="text"
              className="form-input"
              value={emailOrUsername}
              onChange={e => setEmailOrUsername(e.target.value)}
              placeholder="admin@lambrin.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Conectando al API...' : '⚡ Conectar al Estudio'}
          </button>
        </form>
      </div>
    </div>
  );
};
