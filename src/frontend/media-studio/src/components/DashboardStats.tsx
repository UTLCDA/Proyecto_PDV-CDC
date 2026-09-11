import React, { useState } from 'react';
import { StudioProduct } from '../types/studioTypes';
import { isProductionApi, mediaApi } from '../api/mediaApi';

interface DashboardStatsProps {
  products: StudioProduct[];
  onMigrateSuccess: () => void;
  showToast: (msg: string) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  products,
  onMigrateSuccess,
  showToast
}) => {
  const [migrating, setMigrating] = useState(false);
  const isProd = isProductionApi();

  const total = products.length;
  const withWebp = products.filter(p => p.imageUrl && p.imageUrl.startsWith('/products')).length;
  const withBase64 = products.filter(p => p.imageUrl && p.imageUrl.startsWith('data:image')).length;
  const missing = total - withWebp - withBase64;
  const coveragePercent = total > 0 ? Math.round((withWebp / total) * 100) : 0;

  // Estimation: Base64 stored was ~400KB per image vs WebP ~25KB total variants = ~375KB saved per product
  const savedMb = ((withWebp * 375) / 1024).toFixed(1);

  const handleMigrateAll = async () => {
    const targetText = isProd ? 'EL SERVIDOR DE PRODUCCIÓN (PR - api.wpcbajio.com)' : 'tu servidor local';
    if (!window.confirm(`⚠️ ATENCIÓN: ¿Deseas escanear y convertir todas las imágenes Base64 restantes a archivos físicos WebP en ${targetText}?`)) {
      return;
    }
    try {
      setMigrating(true);
      const res = await mediaApi.migrateBase64Images();
      showToast(`Migración completada: ${res.converted} convertidas, ${res.failed} fallidas.`);
      onMigrateSuccess();
    } catch (err: any) {
      alert(`Error en migración: ${err.message}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <section className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon orange">📦</div>
        <div className="stat-info">
          <h3>Total Productos {isProd ? '(PR)' : '(DEV)'}</h3>
          <div className="stat-value">{total}</div>
          <div className="stat-desc">En catálogo activo</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon green">⚡</div>
        <div className="stat-info">
          <h3>Cargadas en WebP {isProd ? '(PR)' : ''}</h3>
          <div className="stat-value">
            {withWebp}{' '}
            <small style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>
              ({coveragePercent}%)
            </small>
          </div>
          <div className="stat-desc">
            <div style={{ background: 'rgba(255,255,255,0.08)', height: '5px', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
              <div style={{ background: '#10b981', width: `${coveragePercent}%`, height: '100%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: missing > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: missing > 0 ? '#fb7185' : '#34d399' }}>
          {missing > 0 ? '⚠️' : '✅'}
        </div>
        <div className="stat-info">
          <h3>Pendientes de Carga {isProd ? '(PR)' : ''}</h3>
          <div className="stat-value" style={{ color: missing > 0 ? '#fb7185' : '#34d399' }}>
            {missing}
          </div>
          <div className="stat-desc">{missing === 0 ? '¡100% fotográfico cubierto!' : 'Faltan fotos por asignar'}</div>
        </div>
      </div>

      <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: '0.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Ahorro BD: ~{savedMb} MB
            </h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Base64 residual: <strong>{withBase64}</strong>
            </div>
          </div>
          {withBase64 > 0 && (
            <span className="badge badge-base64">Por Migrar</span>
          )}
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={handleMigrateAll}
          disabled={migrating || withBase64 === 0}
        >
          {migrating ? '⏳ Convirtiendo...' : `🚀 Convertir Base64 en ${isProd ? 'PR' : 'DEV'}`}
        </button>
      </div>
    </section>
  );
};
