import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/Login/LoginPage';
import PosPanelPage from './pages/Pos/PosPanelPage';
import CashShiftPage from './pages/CashShift/CashShiftPage';
import ReportsDashboardPage from './pages/Reports/ReportsDashboardPage';
import QuoteListPage from './pages/Quotes/QuoteListPage';
import CommercialOpsPage from './pages/Commercial/CommercialOpsPage';
import ProductListPage from './pages/Products/ProductListPage';
import CustomerListPage from './pages/Customers/CustomerListPage';
import InventoryListPage from './pages/Inventory/InventoryListPage';
import { PaginaUsuarios } from './pages/Users/PaginaUsuarios';

const MainLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'pos' | 'shift' | 'reports' | 'quotes' | 'commercial' | 'catalog' | 'inventory' | 'customers' | 'users' | 'profile'>('pos');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'es' ? 'zh' : 'es';
    i18n.changeLanguage(nextLang);
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo_wpc_bajio.jpeg" alt="WPC Bajío Logo" style={{ height: '40px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }} />
            <h1 className="brand-title" style={{ fontSize: '1.25rem', letterSpacing: '0.5px' }}>WPC Bajío</h1>
          </div>

          {isAuthenticated && (
            <nav style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                className="lang-btn"
                onClick={() => setActiveTab('pos')}
                style={{ borderColor: activeTab === 'pos' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', background: activeTab === 'pos' ? 'rgba(56,189,248,0.15)' : undefined }}
              >
                🛒 {t('navPos')}
              </button>
              <button
                className="lang-btn"
                onClick={() => setActiveTab('shift')}
                style={{ borderColor: activeTab === 'shift' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', background: activeTab === 'shift' ? 'rgba(56,189,248,0.15)' : undefined }}
              >
                💵 {t('navShift')}
              </button>
              <button
                className="lang-btn"
                onClick={() => setActiveTab('reports')}
                style={{ borderColor: activeTab === 'reports' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', background: activeTab === 'reports' ? 'rgba(56,189,248,0.15)' : undefined }}
              >
                📈 {t('navReports')}
              </button>
              <button
                className="lang-btn"
                onClick={() => setActiveTab('quotes')}
                style={{ borderColor: activeTab === 'quotes' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', background: activeTab === 'quotes' ? 'rgba(56,189,248,0.15)' : undefined }}
              >
                📑 {t('navQuotes')}
              </button>
              <button
                className="lang-btn"
                onClick={() => setActiveTab('commercial')}
                style={{ borderColor: activeTab === 'commercial' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', background: activeTab === 'commercial' ? 'rgba(56,189,248,0.15)' : undefined }}
              >
                💰 {t('navCommercial')}
              </button>
              <button
                className="lang-btn"
                onClick={() => setActiveTab('catalog')}
                style={{ borderColor: activeTab === 'catalog' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', background: activeTab === 'catalog' ? 'rgba(56,189,248,0.15)' : undefined }}
              >
                📦 {t('navCatalog')}
              </button>
              <button
                className="lang-btn"
                onClick={() => setActiveTab('inventory')}
                style={{ borderColor: activeTab === 'inventory' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', background: activeTab === 'inventory' ? 'rgba(56,189,248,0.15)' : undefined }}
              >
                🏭 {t('navInventory')}
              </button>
              <button
                className="lang-btn"
                onClick={() => setActiveTab('customers')}
                style={{ borderColor: activeTab === 'customers' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', background: activeTab === 'customers' ? 'rgba(56,189,248,0.15)' : undefined }}
              >
                👥 {t('navCustomers')}
              </button>
              <button
                className="lang-btn"
                onClick={() => setActiveTab('users')}
                style={{ borderColor: activeTab === 'users' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', background: activeTab === 'users' ? 'rgba(56,189,248,0.15)' : undefined }}
              >
                🛡️ Usuarios
              </button>
            </nav>
          )}
        </div>

        <div className="nav-actions">
          {/* Dashboard UI de Logs Serilog */}
          <a
            href="http://localhost:5000/serilog-ui"
            target="_blank"
            rel="noopener noreferrer"
            className="lang-btn"
            style={{ textDecoration: 'none', borderColor: '#a855f7', color: '#c084fc' }}
            title="Abrir Dashboard de Logs Serilog en tiempo real (Usuario: administrador / Contraseña: Aaron096)"
          >
            📜 Serilog UI
          </a>

          {/* Conmutador Modo Claro / Modo Oscuro */}
          <button className="lang-btn" onClick={toggleTheme} title="Cambiar Tema Visual">
            {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
          </button>

          <button className="lang-btn" onClick={toggleLanguage}>
            🌐 {i18n.language === 'es' ? '中文' : 'Español'}
          </button>

          {isAuthenticated && user && (
            <button
              className="lang-btn"
              onClick={() => setActiveTab('profile')}
              style={{ fontSize: '0.85rem' }}
            >
              👤 {user.fullName || user.username}
            </button>
          )}

          {isAuthenticated && (
            <button className="lang-btn" onClick={logout} style={{ borderColor: 'var(--danger)', color: '#fca5a5' }}>
              {t('logout')}
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        {!isAuthenticated ? (
          <LoginPage />
        ) : (
          <>
            {activeTab === 'pos' && <PosPanelPage />}
            {activeTab === 'shift' && <CashShiftPage />}
            {activeTab === 'reports' && <ReportsDashboardPage />}
            {activeTab === 'quotes' && <QuoteListPage />}
            {activeTab === 'commercial' && <CommercialOpsPage />}
            {activeTab === 'catalog' && <ProductListPage />}
            {activeTab === 'inventory' && <InventoryListPage />}
            {activeTab === 'customers' && <CustomerListPage />}
            {activeTab === 'users' && <PaginaUsuarios />}
            {activeTab === 'profile' && (
              <div className="card">
                <h2>{t('userProfile')}</h2>
                <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <strong>Email:</strong> {user?.email}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      <strong>{t('role')}:</strong> {user?.roles.join(', ')}
                    </p>
                  </div>

                  <div style={{ padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4>{t('permissions')} ({user?.permissions.length})</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
                      {user?.permissions.map(p => (
                        <span key={p} className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        &copy; {new Date().getFullYear()} WPC Bajío — Punto de Venta e Inventario Lambrín Decorativo (.NET 9 & React TypeScript)
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
