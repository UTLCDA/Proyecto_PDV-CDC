import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/Login/LoginPage';
import PosPanelPage from './pages/Pos/PosPanelPage';
import SalesHistoryPage from './pages/Sales/SalesHistoryPage';
import CashShiftPage from './pages/CashShift/CashShiftPage';
import ReportsDashboardPage from './pages/Reports/ReportsDashboardPage';
import QuoteListPage from './pages/Quotes/QuoteListPage';
import CommercialOpsPage from './pages/Commercial/CommercialOpsPage';
import ProductListPage from './pages/Products/ProductListPage';
import CategoryListPage from './pages/Categories/CategoryListPage';
import CustomerListPage from './pages/Customers/CustomerListPage';
import InventoryListPage from './pages/Inventory/InventoryListPage';
import InventoryMovementsPage from './pages/Inventory/InventoryMovementsPage';
import { PaginaUsuarios } from './pages/Users/PaginaUsuarios';
import AuditLogPage from './pages/Audit/AuditLogPage';
import { AppTab, canAccessTab, getDefaultTab } from './security/accessControl';
import AccessDeniedModal from './components/common/AccessDeniedModal';

const MainLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('pos');
  const [accessDeniedOpen, setAccessDeniedOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState('');
  const [accessDeniedModule, setAccessDeniedModule] = useState('');

  const userPermissions = user?.permissions ?? [];
  const canOpenTab = (tab: AppTab) => isAuthenticated && canAccessTab(userPermissions, tab);
  const currentTab = canOpenTab(activeTab) ? activeTab : getDefaultTab(userPermissions);

  useEffect(() => {
    if (user) {
      setActiveTab(getDefaultTab(user.permissions));
    }
  }, [user?.id]);

  useEffect(() => {
    const handleAccessDenied = (event: Event) => {
      const customEvent = event as CustomEvent<{ endpoint?: string; status?: number; message?: string }>;
      setAccessDeniedModule('');
      setAccessDeniedMessage(customEvent.detail?.message || 'No cuenta con los permisos de seguridad requeridos para realizar esta operación o acceder a este módulo.');
      setAccessDeniedOpen(true);
    };
    window.addEventListener('lambrin-access-denied', handleAccessDenied);
    return () => window.removeEventListener('lambrin-access-denied', handleAccessDenied);
  }, []);

  const handleNavTabClick = (tab: AppTab, tabLabelKey: string) => {
    if (canOpenTab(tab)) {
      setActiveTab(tab);
    } else {
      setAccessDeniedModule(t(tabLabelKey));
      setAccessDeniedMessage('');
      setAccessDeniedOpen(true);
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'es' ? 'zh' : 'es';
    i18n.changeLanguage(nextLang);
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="navbar-main">
          <div className="navbar-brand">
            <img src="/logo_wpc_bajio.jpeg" alt="WPC Bajío" className="brand-logo" />
            <h1 className="brand-title">WPC Bajío</h1>
          </div>

          {isAuthenticated && (
            <nav className="module-nav">
              {canOpenTab('pos') && (
              <button
                className={`lang-btn ${currentTab === 'pos' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('pos')}
              >
                🛒 {t('navPos')}
              </button>
              )}
              {canOpenTab('sales') && (
              <button
                className={`lang-btn ${currentTab === 'sales' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('sales')}
              >
                🧾 {t('navSales')}
              </button>
              )}
              {canOpenTab('shift') && (
              <button
                className={`lang-btn ${currentTab === 'shift' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('shift')}
              >
                💵 {t('navShift')}
              </button>
              )}
              {canOpenTab('reports') && (
              <button
                className={`lang-btn ${currentTab === 'reports' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                📈 {t('navReports')}
              </button>
              )}
              {canOpenTab('quotes') && (
              <button
                className={`lang-btn ${currentTab === 'quotes' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('quotes')}
              >
                📑 {t('navQuotes')}
              </button>
              )}
              {canOpenTab('commercial') && (
              <button
                className={`lang-btn ${currentTab === 'commercial' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('commercial')}
              >
                💰 {t('navCommercial')}
              </button>
              )}
              {canOpenTab('transactions') && (
              <button
                className={`lang-btn ${currentTab === 'transactions' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('transactions')}
              >
                💳 {t('navTransactions')}
              </button>
              )}
              {canOpenTab('returns') && (
              <button
                className={`lang-btn ${currentTab === 'returns' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('returns')}
              >
                ↩️ {t('navReturns')}
              </button>
              )}
              {canOpenTab('contracts') && (
              <button
                className={`lang-btn ${currentTab === 'contracts' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('contracts')}
              >
                📄 {t('navContracts')}
              </button>
              )}
              {canOpenTab('catalog') && (
              <button
                className={`lang-btn ${currentTab === 'catalog' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('catalog')}
              >
                📦 {t('navCatalog')}
              </button>
              )}
              {canOpenTab('categories') && (
              <button
                className={`lang-btn ${currentTab === 'categories' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('categories')}
              >
                📁 {t('navCategories')}
              </button>
              )}
              {canOpenTab('inventory') && (
              <button
                className={`lang-btn ${currentTab === 'inventory' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('inventory')}
              >
                🏭 {t('navInventory')}
              </button>
              )}
              {canOpenTab('inventory-movements') && (
              <button
                className={`lang-btn ${currentTab === 'inventory-movements' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('inventory-movements')}
              >
                📋 {t('navInventoryMovements')}
              </button>
              )}
              {canOpenTab('customers') && (
              <button
                className={`lang-btn ${currentTab === 'customers' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('customers')}
              >
                👥 {t('navCustomers')}
              </button>
              )}
              {canOpenTab('users') && (
              <button
                className={`lang-btn ${currentTab === 'users' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                🛡️ {t('navUsers')}
              </button>
              )}
              {canOpenTab('audit') && (
              <button
                className={`lang-btn ${currentTab === 'audit' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('audit')}
              >
                🔍 {t('navAudit')}
              </button>
              )}
            </nav>
          )}
        </div>

        <div className="nav-actions">
          {/* Dashboard UI de Logs Serilog */}


          <span className="nav-mode-indicator" title={t('lightMode')}>
            ☀️ {t('lightMode')}
          </span>

          <button className="lang-btn" onClick={toggleLanguage}>
            🌐 {i18n.language === 'es' ? '中文' : 'Español'}
          </button>

          {isAuthenticated && user && (
            <button
              className="lang-btn nav-profile-button"
              onClick={() => setActiveTab('profile')}
            >
              <span aria-hidden="true">👤</span>
              <span className="nav-profile-copy">
                <span>{user.fullName || user.username}</span>
                <small>{user.roles.join(', ')}</small>
              </span>
            </button>
          )}

          {isAuthenticated && (
            <button className="lang-btn nav-logout-button" onClick={logout}>
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
            {currentTab === 'pos' && <PosPanelPage />}
            {currentTab === 'sales' && <SalesHistoryPage />}
            {currentTab === 'shift' && <CashShiftPage />}
            {currentTab === 'reports' && <ReportsDashboardPage />}
            {currentTab === 'quotes' && <QuoteListPage />}
            {currentTab === 'commercial' && <CommercialOpsPage mode="installments" />}
            {currentTab === 'transactions' && <CommercialOpsPage mode="transactions" />}
            {currentTab === 'returns' && <CommercialOpsPage mode="returns" />}
            {currentTab === 'contracts' && <CommercialOpsPage mode="contracts" />}
            {currentTab === 'catalog' && <ProductListPage />}
            {currentTab === 'categories' && <CategoryListPage />}
            {currentTab === 'inventory' && <InventoryListPage />}
            {currentTab === 'inventory-movements' && <InventoryMovementsPage />}
            {currentTab === 'customers' && <CustomerListPage />}
            {currentTab === 'users' && <PaginaUsuarios />}
            {currentTab === 'audit' && <AuditLogPage />}
            {currentTab === 'profile' && (
              <div className="card">
                <h2>{t('userProfile')}</h2>
                <div className="profile-grid">
                  <div className="profile-panel">
                    <p>
                      <strong>Email:</strong> {user?.email}
                    </p>
                    <p>
                      <strong>{t('role')}:</strong> {user?.roles.join(', ')}
                    </p>
                  </div>

                  <div className="profile-panel">
                    <h4>{t('permissions')} ({user?.permissions.length})</h4>
                    <div className="profile-permissions">
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

      <AccessDeniedModal
        isOpen={accessDeniedOpen}
        onClose={() => setAccessDeniedOpen(false)}
        moduleName={accessDeniedModule}
        customMessage={accessDeniedMessage}
      />
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
