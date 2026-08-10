import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { permissionCodes } from '../../security/accessControl';
import { reportsService } from '../../services/reportsService';
import { InventorySummaryReport, SalesSummaryReport, TopProductReport } from '../../types/reports';
import './ReportsDashboardPage.css';

const hasPermission = (permissions: readonly string[], permission: string) =>
  permissions.some(item => item.toLowerCase() === permission.toLowerCase());

const toUtcBoundary = (date: string, endOfDay = false) => {
  if (!date) return undefined;
  return `${date}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const currentDate = () => new Date().toISOString().slice(0, 10);

export const ReportsDashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const canViewSales = hasPermission(permissions, permissionCodes.reportsSalesView);
  const canViewInventory = hasPermission(permissions, permissionCodes.reportsInventoryView);
  const [summary, setSummary] = useState<SalesSummaryReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductReport[]>([]);
  const [inventorySummary, setInventorySummary] = useState<InventorySummaryReport | null>(null);
  const [startDate, setStartDate] = useState(currentDate);
  const [endDate, setEndDate] = useState(currentDate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currencyFormatter = useMemo(() => new Intl.NumberFormat(
    i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX',
    { style: 'currency', currency: 'MXN' }
  ), [i18n.language]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(
    i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX',
    { maximumFractionDigits: 2 }
  ), [i18n.language]);

  const loadDashboard = async () => {
    if (startDate && endDate && startDate > endDate) {
      setError(t('invalidReportDateRange'));
      return;
    }

    setLoading(true);
    setError('');
    const dateFilters = {
      startDate: toUtcBoundary(startDate),
      endDate: toUtcBoundary(endDate, true)
    };

    try {
      const [salesData, productsData, stockData] = await Promise.all([
        canViewSales ? reportsService.getSalesSummary(dateFilters) : Promise.resolve(null),
        canViewSales ? reportsService.getTopProducts(10, dateFilters) : Promise.resolve([]),
        canViewInventory ? reportsService.getInventorySummary() : Promise.resolve(null)
      ]);
      setSummary(salesData);
      setTopProducts(productsData);
      setInventorySummary(stockData);
    } catch (loadError) {
      setSummary(null);
      setTopProducts([]);
      setInventorySummary(null);
      setError(getErrorMessage(loadError, t('reportsLoadError')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
    // Los filtros sólo se aplican al enviar el formulario; no se recarga mientras el usuario escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewInventory, canViewSales]);

  const clearFilters = () => {
    setStartDate(currentDate());
    setEndDate(currentDate());
  };

  if (loading) return <div>{t('loading')}</div>;

  return (
    <div className="reports-page">
      <section className="card reports-header-card">
        <div>
          <h2>📈 {t('reportsDashboardTitle')}</h2>
          <p>{t('reportsDashboardSubtitle')}</p>
        </div>
        <form className="reports-filter-form" onSubmit={(event) => { event.preventDefault(); void loadDashboard(); }}>
          <label>
            <span>{t('startDate')}</span>
            <input className="input-field" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
          </label>
          <label>
            <span>{t('endDate')}</span>
            <input className="input-field" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} />
          </label>
          <button type="submit" className="action-btn">🔎 {t('applyFilters')}</button>
          <button type="button" className="lang-btn" onClick={clearFilters}>{t('clearFilters')}</button>
        </form>
      </section>

      {error && <div className="reports-notice reports-notice-error" role="alert">{error}</div>}

      {canViewSales && summary && (
        <>
          <section className="reports-metric-grid" aria-label={t('salesSummary')}>
            <article className="card reports-metric-card">
              <span>🧾 {t('totalSalesCount')}</span>
              <strong>{summary.totalSalesCount}</strong>
            </article>
            <article className="card reports-metric-card">
              <span>💵 {t('grossSalesAmount')}</span>
              <strong>{currencyFormatter.format(summary.totalSalesAmount)}</strong>
            </article>
            <article className="card reports-metric-card reports-metric-danger">
              <span>↩ {t('totalReturnedAmount')}</span>
              <strong>{currencyFormatter.format(summary.totalReturnedAmount)}</strong>
            </article>
            <article className="card reports-metric-card reports-metric-success">
              <span>📊 {t('netSalesAmount')}</span>
              <strong>{currencyFormatter.format(summary.netSalesAmount)}</strong>
            </article>
            <article className="card reports-metric-card">
              <span>🧮 {t('averageTicket')}</span>
              <strong>{currencyFormatter.format(summary.averageTicketAmount)}</strong>
            </article>
            <article className="card reports-metric-card">
              <span>🏛️ {t('totalTaxAmount')}</span>
              <strong>{currencyFormatter.format(summary.totalTaxAmount)}</strong>
            </article>
          </section>

          <section className="card">
            <h3>💳 {t('collectionsByMethod')}</h3>
            <div className="reports-payment-grid">
              <div><span>💵 {t('cash')}</span><strong>{currencyFormatter.format(summary.totalCashIncome)}</strong></div>
              <div><span>💳 {t('card')}</span><strong>{currencyFormatter.format(summary.totalCardIncome)}</strong></div>
              <div><span>🏦 {t('bankTransfer')}</span><strong>{currencyFormatter.format(summary.totalTransferIncome)}</strong></div>
              <div><span>🏷️ {t('discount')}</span><strong>{currencyFormatter.format(summary.totalDiscountAmount)}</strong></div>
            </div>
          </section>

          <section className="card">
            <h3>🏆 {t('topSellingProducts')}</h3>
            {topProducts.length === 0 ? (
              <p className="reports-empty">{t('noSalesInPeriod')}</p>
            ) : (
              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>SKU / {t('productCatalog')}</th>
                      <th>{t('category')}</th>
                      <th>{t('quantitySold')}</th>
                      <th>{t('quantityReturned')}</th>
                      <th>{t('netQuantity')}</th>
                      <th>{t('netRevenue')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map(product => (
                      <tr key={product.productId}>
                        <td><strong>{product.productName}</strong><small>{product.sku}</small></td>
                        <td>{product.categoryName}</td>
                        <td>{numberFormatter.format(product.totalQuantitySold)}</td>
                        <td>{numberFormatter.format(product.totalQuantityReturned)}</td>
                        <td><strong>{numberFormatter.format(product.netQuantitySold)}</strong></td>
                        <td className="reports-positive-value">{currencyFormatter.format(product.netRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {canViewInventory && inventorySummary && (
        <section className="card">
          <h3>🏭 {t('inventoryReportTitle')}</h3>
          <div className="reports-inventory-grid">
            <div><span>{t('activeProducts')}</span><strong>{inventorySummary.totalProducts}</strong></div>
            <div><span>{t('totalUnitsOnHand')}</span><strong>{numberFormatter.format(inventorySummary.totalUnitsOnHand)}</strong></div>
            <div><span>{t('lowStockProducts')}</span><strong>{inventorySummary.lowStockProducts}</strong></div>
            <div><span>{t('outOfStockProducts')}</span><strong>{inventorySummary.outOfStockProducts}</strong></div>
            <div><span>{t('inventoryRetailValue')}</span><strong>{currencyFormatter.format(inventorySummary.inventoryRetailValue)}</strong></div>
            <div><span>{t('suggestedReorderUnits')}</span><strong>{numberFormatter.format(inventorySummary.suggestedReorderUnits)}</strong></div>
          </div>
          <h4 className="reports-low-stock-title">⚠️ {t('lowStockProductDetail')}</h4>
          {inventorySummary.lowStockProductList.length === 0 ? <p className="reports-empty">{t('noLowStockProducts')}</p> : <div className="reports-table-wrap">
            <table className="reports-table"><thead><tr><th>SKU / {t('productCatalog')}</th><th>{t('stockOnHand')}</th><th>{t('minThreshold')}</th><th>{t('suggestedReorderUnits')}</th><th>{t('stockStatus')}</th></tr></thead>
              <tbody>{inventorySummary.lowStockProductList.map(product => <tr key={product.productId}>
                <td><strong>{product.productName}</strong><small>{product.sku}</small></td>
                <td>{numberFormatter.format(product.quantityOnHand)} {product.unitOfMeasure}</td>
                <td>{numberFormatter.format(product.minimumAlertThreshold)} {product.unitOfMeasure}</td>
                <td>{numberFormatter.format(product.suggestedReorderQuantity)} {product.unitOfMeasure}</td>
                <td><span className={`badge ${product.isOutOfStock ? 'badge-danger' : 'badge-warning'}`}>{t(product.isOutOfStock ? 'outOfStock' : 'lowStockAlert')}</span></td>
              </tr>)}</tbody>
            </table>
          </div>}
        </section>
      )}
    </div>
  );
};

export default ReportsDashboardPage;
