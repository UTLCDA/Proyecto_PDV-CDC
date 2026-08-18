import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { permissionCodes } from '../../security/accessControl';
import { reportsService } from '../../services/reportsService';
import { InventorySummaryReport, LowStockProductReport, SalesSummaryReport, TopProductReport } from '../../types/reports';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { getOperationalDateInputValue, toOperationalUtcBoundary } from '../../utils/operationalDate';
import './ReportsDashboardPage.css';

const hasPermission = (permissions: readonly string[], permission: string) =>
  permissions.some(item => item.toLowerCase() === permission.toLowerCase());

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const currentDate = getOperationalDateInputValue;

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
  const [appliedStartDate, setAppliedStartDate] = useState(currentDate);
  const [appliedEndDate, setAppliedEndDate] = useState(currentDate);
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

  const reportDateRange = useMemo(() => ({ startDate: appliedStartDate, endDate: appliedEndDate }), [appliedEndDate, appliedStartDate]);
  const reportFilters = useMemo(() => [{ label: 'Periodo', value: `${appliedStartDate} al ${appliedEndDate}` }], [appliedEndDate, appliedStartDate]);
  const summaryRows = useMemo(() => summary ? [summary] : [], [summary]);
  const inventoryRows = useMemo(() => inventorySummary ? [inventorySummary] : [], [inventorySummary]);

  const summaryExportConfig = useMemo<ExportReportConfig<SalesSummaryReport>>(() => ({
    moduleName: t('reportsDashboardTitle'),
    title: 'Resumen de Ventas',
    fileName: 'Resumen_Ventas',
    sheetName: 'ResumenVentas',
    orientation: 'landscape',
    dateRange: reportDateRange,
    filters: reportFilters,
    columns: [
      { key: 'count', label: 'Ventas', type: 'number', width: 0.65, value: row => row.totalSalesCount },
      { key: 'gross', label: 'Venta bruta', type: 'currency', width: 0.9, value: row => row.totalSalesAmount },
      { key: 'returns', label: 'Devoluciones', type: 'currency', width: 0.9, value: row => row.totalReturnedAmount },
      { key: 'net', label: 'Venta neta', type: 'currency', width: 0.9, value: row => row.netSalesAmount },
      { key: 'tax', label: 'Impuestos', type: 'currency', width: 0.85, value: row => row.totalTaxAmount },
      { key: 'discount', label: 'Descuentos', type: 'currency', width: 0.85, value: row => row.totalDiscountAmount },
      { key: 'ticket', label: 'Ticket promedio', type: 'currency', width: 0.9, value: row => row.averageTicketAmount },
      { key: 'cash', label: 'Efectivo', type: 'currency', width: 0.8, value: row => row.totalCashIncome },
      { key: 'card', label: 'Tarjeta', type: 'currency', width: 0.8, value: row => row.totalCardIncome },
      { key: 'transfer', label: 'Transferencia', type: 'currency', width: 0.85, value: row => row.totalTransferIncome }
    ]
  }), [reportDateRange, reportFilters, t]);

  const productsExportConfig = useMemo<ExportReportConfig<TopProductReport>>(() => ({
    moduleName: t('reportsDashboardTitle'),
    title: 'Productos Más Vendidos',
    fileName: 'Productos_Mas_Vendidos',
    sheetName: 'ProductosVendidos',
    orientation: 'landscape',
    dateRange: reportDateRange,
    filters: reportFilters,
    columns: [
      { key: 'sku', label: 'SKU', width: 0.8, value: row => row.sku },
      { key: 'product', label: 'Producto', width: 1.5, value: row => row.productName },
      { key: 'category', label: 'Categoría', width: 1, value: row => row.categoryName },
      { key: 'sold', label: 'Cantidad vendida', type: 'number', width: 0.8, value: row => row.totalQuantitySold },
      { key: 'returned', label: 'Cantidad devuelta', type: 'number', width: 0.8, value: row => row.totalQuantityReturned },
      { key: 'netQuantity', label: 'Cantidad neta', type: 'number', width: 0.75, value: row => row.netQuantitySold },
      { key: 'revenue', label: 'Ingreso bruto', type: 'currency', width: 0.85, value: row => row.totalRevenue },
      { key: 'returnedAmount', label: 'Monto devuelto', type: 'currency', width: 0.85, value: row => row.totalReturnedAmount },
      { key: 'netRevenue', label: 'Ingreso neto', type: 'currency', width: 0.85, value: row => row.netRevenue }
    ]
  }), [reportDateRange, reportFilters, t]);

  const inventorySummaryExportConfig = useMemo<ExportReportConfig<InventorySummaryReport>>(() => ({
    moduleName: t('inventoryReportTitle'),
    title: 'Resumen de Inventario',
    fileName: 'Resumen_Inventario',
    sheetName: 'ResumenInventario',
    orientation: 'landscape',
    columns: [
      { key: 'products', label: 'Productos activos', type: 'number', width: 0.9, value: row => row.totalProducts },
      { key: 'units', label: 'Unidades existentes', type: 'number', width: 0.95, value: row => row.totalUnitsOnHand },
      { key: 'lowStock', label: 'Stock bajo', type: 'number', width: 0.75, value: row => row.lowStockProducts },
      { key: 'outOfStock', label: 'Sin existencia', type: 'number', width: 0.8, value: row => row.outOfStockProducts },
      { key: 'value', label: 'Valor de inventario', type: 'currency', width: 1, value: row => row.inventoryRetailValue },
      { key: 'reorder', label: 'Reorden sugerido', type: 'number', width: 0.9, value: row => row.suggestedReorderUnits }
    ]
  }), [t]);

  const lowStockExportConfig = useMemo<ExportReportConfig<LowStockProductReport>>(() => ({
    moduleName: t('inventoryReportTitle'),
    title: 'Productos con Existencia Baja',
    fileName: 'Inventario_Stock_Bajo',
    sheetName: 'StockBajo',
    orientation: 'landscape',
    columns: [
      { key: 'sku', label: 'SKU', width: 0.8, value: row => row.sku },
      { key: 'product', label: 'Producto', width: 1.6, value: row => row.productName },
      { key: 'stock', label: 'Existencia', type: 'number', width: 0.75, value: row => row.quantityOnHand },
      { key: 'threshold', label: 'Mínimo', type: 'number', width: 0.7, value: row => row.minimumAlertThreshold },
      { key: 'reorder', label: 'Reorden sugerido', type: 'number', width: 0.85, value: row => row.suggestedReorderQuantity },
      { key: 'unit', label: 'Unidad', width: 0.7, value: row => row.unitOfMeasure },
      { key: 'status', label: 'Estado', width: 0.8, value: row => row.isOutOfStock ? 'Sin existencia' : 'Stock bajo' }
    ]
  }), [t]);

  const loadDashboard = async () => {
    if (startDate && endDate && startDate > endDate) {
      setError(t('invalidReportDateRange'));
      return;
    }

    setLoading(true);
    setError('');
    const dateFilters = {
      startDate: toOperationalUtcBoundary(startDate),
      endDate: toOperationalUtcBoundary(endDate, true)
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
      setAppliedStartDate(startDate);
      setAppliedEndDate(endDate);
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
            <input className="input-field" type="date" max={endDate || undefined} value={startDate} onChange={event => setStartDate(event.target.value)} />
          </label>
          <label>
            <span>{t('endDate')}</span>
            <input className="input-field" type="date" min={startDate || undefined} value={endDate} onChange={event => setEndDate(event.target.value)} />
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

          <div className="reports-export-row"><ExportButtons data={summaryRows} config={summaryExportConfig} /></div>

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
            <div className="reports-section-heading"><h3>🏆 {t('topSellingProducts')}</h3><ExportButtons data={topProducts} config={productsExportConfig} /></div>
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
          <div className="reports-section-heading"><h3>🏭 {t('inventoryReportTitle')}</h3><ExportButtons data={inventoryRows} config={inventorySummaryExportConfig} /></div>
          <div className="reports-inventory-grid">
            <div><span>{t('activeProducts')}</span><strong>{inventorySummary.totalProducts}</strong></div>
            <div><span>{t('totalUnitsOnHand')}</span><strong>{numberFormatter.format(inventorySummary.totalUnitsOnHand)}</strong></div>
            <div><span>{t('lowStockProducts')}</span><strong>{inventorySummary.lowStockProducts}</strong></div>
            <div><span>{t('outOfStockProducts')}</span><strong>{inventorySummary.outOfStockProducts}</strong></div>
            <div><span>{t('inventoryRetailValue')}</span><strong>{currencyFormatter.format(inventorySummary.inventoryRetailValue)}</strong></div>
            <div><span>{t('suggestedReorderUnits')}</span><strong>{numberFormatter.format(inventorySummary.suggestedReorderUnits)}</strong></div>
          </div>
          <div className="reports-section-heading reports-low-stock-title"><h4>⚠️ {t('lowStockProductDetail')}</h4><ExportButtons data={inventorySummary.lowStockProductList} config={lowStockExportConfig} /></div>
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
