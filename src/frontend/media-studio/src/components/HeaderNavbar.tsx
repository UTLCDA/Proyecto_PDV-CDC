import React from 'react';
import { API_PRESETS, clearStoredAuth, getStoredApiUrl, isProductionApi, setStoredApiUrl } from '../api/mediaApi';

interface HeaderNavbarProps {
  user: { username: string; email: string; roles: string[] } | null;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  user,
  onLogout,
  onRefresh,
  isRefreshing
}) => {
  const currentApiUrl = getStoredApiUrl();
  const isProd = isProductionApi();

  const handleApiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      const custom = window.prompt('Introduce la URL base del API (ej. https://api.wpcbajio.com):', currentApiUrl);
      if (custom !== null) {
        setStoredApiUrl(custom);
        window.location.reload();
      }
    } else {
      setStoredApiUrl(val);
      window.location.reload();
    }
  };

  return (
    <header className="studio-navbar">
      <div className="studio-brand">
        <div className="studio-logo-badge">🖼️</div>
        <div className="studio-title-block">
          <h1>
            Media Studio
            <span className={isProd ? 'dev-badge badge-pr' : 'dev-badge'}>
              {isProd ? '🔴 ENTORNO PR (PRODUCCIÓN)' : '🟢 ENTORNO DEV LOCAL'}
            </span>
          </h1>
          <p>
            Portal Privado DEV &middot; Control de Carga e Inspección de Imágenes WebP
          </p>
        </div>
      </div>

      <div className="studio-nav-controls">
        <div className="env-selector" title="Configura a qué servidor apuntar las consultas y cargas de imágenes">
          <span style={{ fontWeight: 600 }}>Servidor Objetivo:</span>
          <select value={currentApiUrl} onChange={handleApiChange}>
            {API_PRESETS.map(preset => (
              <option key={preset.id} value={preset.url}>
                {preset.label}
              </option>
            ))}
            <option value="custom">⚙️ URL Personalizada...</option>
          </select>
        </div>

        <button
          className="btn-ghost"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refrescar catálogo y estado de carga"
        >
          {isRefreshing ? '⏳ Consultando...' : '🔄 Sincronizar'}
        </button>

        {user && (
          <>
            <div className="btn-ghost" style={{ cursor: 'default', background: 'rgba(255,255,255,0.03)' }}>
              <span>🛡️</span>
              <span>{user.username}</span>
            </div>

            <button
              className="btn-ghost"
              onClick={() => {
                clearStoredAuth();
                onLogout();
              }}
              title="Cerrar sesión"
            >
              🚪 Salir
            </button>
          </>
        )}
      </div>
    </header>
  );
};
