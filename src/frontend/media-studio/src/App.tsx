import React, { useState, useEffect, useCallback } from 'react';
import { StudioProduct, ImageFilterStatus } from './types/studioTypes';
import { getStoredToken, getStoredUser, isProductionApi, mediaApi } from './api/mediaApi';
import { HeaderNavbar } from './components/HeaderNavbar';
import { DashboardStats } from './components/DashboardStats';
import { ProductImageCard } from './components/ProductImageCard';
import { ImageInspectorModal } from './components/ImageInspectorModal';
import { LoginView } from './components/LoginView';

export const App: React.FC = () => {
  const [user, setUser] = useState(getStoredUser());
  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ImageFilterStatus>('all');
  const [inspectingProduct, setInspectingProduct] = useState<StudioProduct | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isProd = isProductionApi();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  const loadProducts = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      setLoading(true);
      const res = await mediaApi.getProducts('', 1, 300);
      setProducts(res.items || []);
    } catch (err: any) {
      showToast(`Error al consultar catálogo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      showToast('Sesión expirada o no autorizada. Ingresa tus credenciales.');
    };
    window.addEventListener('wpc-studio-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('wpc-studio-unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user, loadProducts]);

  // Filter products by search and status
  const filteredProducts = products.filter(p => {
    const q = search.trim().toLowerCase();
    const matchQuery =
      !q ||
      p.sku.toLowerCase().includes(q) ||
      p.nombre.toLowerCase().includes(q) ||
      (p.idProducto && String(p.idProducto).includes(q));

    if (!matchQuery) return false;

    const isWebp = p.imageUrl && p.imageUrl.startsWith('/products');
    const isBase64 = p.imageUrl && p.imageUrl.startsWith('data:image');
    const hasImage = Boolean(p.imageUrl);

    if (statusFilter === 'webp') return isWebp;
    if (statusFilter === 'base64') return isBase64;
    if (statusFilter === 'missing') return !hasImage;

    return true;
  });

  if (!user) {
    return <LoginView onLoginSuccess={u => setUser(u)} />;
  }

  const withWebpCount = products.filter(p => p.imageUrl?.startsWith('/products')).length;
  const missingCount = products.filter(p => !p.imageUrl).length;
  const base64Count = products.filter(p => p.imageUrl?.startsWith('data:image')).length;

  return (
    <div className="studio-layout">
      <HeaderNavbar
        user={user}
        onLogout={() => setUser(null)}
        onRefresh={loadProducts}
        isRefreshing={loading}
      />

      {isProd && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(225, 29, 72, 0.2) 0%, rgba(244, 63, 94, 0.15) 100%)',
          borderBottom: '1px solid rgba(244, 63, 94, 0.35)',
          padding: '0.55rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          color: '#fecdd3'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>🔴</span>
            <strong>MODO PR ACTIVO:</strong>
            <span>Estás conectado al servidor de Producción (<code>api.wpcbajio.com</code>). Las fotos que subas se reflejarán en vivo.</span>
          </div>
          <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.3)', color: '#fff' }}>
            Acceso Privado DEV
          </span>
        </div>
      )}

      <main className="studio-main">
        <DashboardStats
          products={products}
          onMigrateSuccess={loadProducts}
          showToast={showToast}
        />

        <section className="toolbar-section">
          <div className="search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Buscar producto por SKU, Nombre o #ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                onClick={() => setSearch('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-pills">
            <button
              className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Todos ({products.length})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'webp' ? 'active' : ''}`}
              onClick={() => setStatusFilter('webp')}
            >
              ✅ Con WebP en {isProd ? 'PR' : 'DEV'} ({withWebpCount})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'missing' ? 'active' : ''}`}
              onClick={() => setStatusFilter('missing')}
              style={missingCount > 0 ? { color: '#fb7185' } : {}}
            >
              ⚠️ Pendientes de Carga ({missingCount})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'base64' ? 'active' : ''}`}
              onClick={() => setStatusFilter('base64')}
            >
              🔄 Base64 Residual ({base64Count})
            </button>
          </div>
        </section>

        {loading && products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2rem' }}>⏳</span>
            <p style={{ marginTop: '0.75rem' }}>Consultando productos en {isProd ? 'PR (Producción)' : 'DEV'}...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
            <span style={{ fontSize: '2.5rem' }}>📦</span>
            <p style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>No se encontraron productos con el filtro aplicado.</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map(prod => (
              <ProductImageCard
                key={prod.id}
                product={prod}
                onInspect={p => setInspectingProduct(p)}
                onImageUpdated={loadProducts}
                showToast={showToast}
              />
            ))}
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
        WPC Bajío &copy; {new Date().getFullYear()} — Media Studio Privado DEV (Puerto 5175) &middot; {isProd ? 'Conectado a PR (api.wpcbajio.com)' : 'Conectado a DEV Local'}
      </footer>

      {inspectingProduct && (
        <ImageInspectorModal
          product={inspectingProduct}
          onClose={() => setInspectingProduct(null)}
          onUpdated={async () => {
            await loadProducts();
            const updated = products.find(p => p.id === inspectingProduct.id);
            if (updated) setInspectingProduct(updated);
          }}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className="toast-container">
          <div className="toast">
            <span>ℹ️</span>
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
