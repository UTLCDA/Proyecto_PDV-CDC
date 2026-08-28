import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { servicioVentas } from '../../services/servicioVentas';
import { Cliente } from '../../types/tiposCatalogo';
import { ResumenVentas, Venta } from '../../types/tiposVentas';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { getOperationalDateInputValue, toOperationalUtcBoundary } from '../../utils/operationalDate';
import { loadAllPagesForExport } from '../../utils/pagedExport';
import SaleReceiptModal from './SaleReceiptModal';
import './SalesHistoryPage.css';

const today = getOperationalDateInputValue;

export const SalesHistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const canCancelSale = hasPermission('ventas', 'cancelar');

  const [sales, setSales] = useState<Venta[]>([]);
  const [customers, setCustomers] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [appliedFilters, setAppliedFilters] = useState(() => ({ search: '', customerId: '', status: '', startDate: today(), endDate: today() }));
  const [receipt, setReceipt] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [cancelSaleTarget, setCancelSaleTarget] = useState<Venta | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }), [locale]);

  const loadSales = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      setError(t('invalidReportDateRange'));
      return;
    }
    setLoading(true); setError('');
    const start = toOperationalUtcBoundary(startDate); const end = toOperationalUtcBoundary(endDate, true);
    try {
      const [salesData, customerData] = await Promise.all([
        servicioVentas.getSales(search.trim() || undefined, customerId || undefined, status || undefined, start, end),
        customers.length === 0 ? servicioCatalogo.getCustomers() : Promise.resolve(customers)
      ]);
      setSales(salesData); setCustomers(customerData);
      setAppliedFilters({ search: search.trim(), customerId, status, startDate, endDate });
    } catch (loadError) {
      setSales([]); setError(loadError instanceof Error ? loadError.message : t('salesLoadError'));
    } finally { setLoading(false); }
  }, [customerId, customers.length, endDate, search, startDate, status, t]);

  useEffect(() => { void loadSales(); }, [loadSales]);

  const handleConfirmCancelSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelSaleTarget || !cancelReason.trim()) return;
    setCancelling(true);
    setError('');
    try {
      await servicioVentas.cancelSale(cancelSaleTarget.id, cancelReason.trim());
      setCancelSaleTarget(null);
      setCancelReason('');
      await loadSales();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar la venta');
    } finally {
      setCancelling(false);
    }
  };

  const dynamicMetrics = useMemo(() => {
    const activeSales = sales.filter(s => s.status !== 'Cancelada' && s.status !== 'Cancelled');
    const totalCount = activeSales.length;
    const totalAmount = activeSales.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0);
    const pendingAmount = activeSales.reduce((acc, sale) => acc + (sale.pendingBalance || 0), 0);
    const paidAmount = Math.max(0, totalAmount - pendingAmount);
    return { totalCount, totalAmount, paidAmount, pendingAmount };
  }, [sales]);

  const safeFormat = (val: number | undefined | null) => money.format(Number.isFinite(val) ? val! : 0);

  const formatBadgeText = (saleStatus: string, pendingBalance: number) => {
    if (saleStatus === 'Cancelada' || saleStatus === 'Cancelled') return 'Cancelada';
    if (saleStatus === 'ApartadoPagado') return 'Apartado (Pagado)';
    if (saleStatus === 'AdvanceDeposit' || saleStatus === 'PendientePago' || pendingBalance > 0) return 'Apartado (Pendiente)';
    if (saleStatus === 'Completada' || saleStatus === 'Completed') return 'Completada';
    return saleStatus;
  };

  const exportConfig = useMemo<ExportReportConfig<Venta>>(() => ({
    moduleName: t('salesHistoryTitle'),
    title: 'Histórico de Ventas',
    fileName: 'Ventas',
    sheetName: 'Ventas',
    orientation: 'landscape',
    dateRange: { startDate: appliedFilters.startDate, endDate: appliedFilters.endDate },
    filters: [
      { label: 'Periodo', value: appliedFilters.startDate && appliedFilters.endDate ? `${appliedFilters.startDate} al ${appliedFilters.endDate}` : appliedFilters.startDate || appliedFilters.endDate },
      { label: 'Búsqueda', value: appliedFilters.search },
      { label: 'Cliente', value: customers.find(customer => customer.id === appliedFilters.customerId)?.displayName || (appliedFilters.customerId ? appliedFilters.customerId : 'Todos') },
      { label: 'Estado', value: appliedFilters.status || 'Todos' }
    ],
    columns: [
      { key: 'idVenta', label: 'Id Venta / 单号', type: 'number', width: 0.7, value: sale => sale.idVenta },
      { key: 'date', label: 'Fecha / 日期', type: 'datetime', width: 1.25, value: sale => sale.createdAtUtc },
      { key: 'customer', label: 'Cliente / 客户', width: 1.5, value: sale => sale.customerDisplayName || t('generalPublic') },
      { key: 'paymentType', label: 'Modalidad de Pago / 付款方式', width: 1.15, value: sale => t(paymentTypeKey(sale.paymentType)) },
      { key: 'status', label: 'Estado / 状态', width: 1.05, value: sale => formatBadgeText(sale.status, sale.pendingBalance) },
      { key: 'total', label: 'Total / 合计', type: 'currency', width: 1, value: sale => sale.totalAmount },
      { key: 'subtotal', label: 'Subtotal / 小计', type: 'currency', width: 1, value: sale => sale.subTotal },
      { key: 'discount', label: 'Descuento / 折扣', type: 'currency', width: 0.9, value: sale => sale.discountAmount },
      { key: 'tax', label: 'IVA / 税额', type: 'currency', width: 0.8, value: sale => sale.taxAmount },
      { key: 'advance', label: 'Anticipo / 预付款', type: 'currency', width: 1, value: sale => sale.advanceAmount },
      { key: 'balance', label: 'Saldo Pendiente / 余款', type: 'currency', width: 1, value: sale => sale.pendingBalance },
      { key: 'user', label: 'Usuario / 操作员', width: 0.9, value: sale => sale.userUsername || '—' }
    ]
  }), [appliedFilters, customers, t]);

  return <section className="sales-history-page">
    <article className="card sales-history-header">
      <div className="sales-history-header__top">
        <div><h2>🧾 {t('salesHistoryTitle')}</h2><p>{t('salesHistorySubtitle')}</p></div>
        <ExportButtons data={sales} config={exportConfig} onLoadAllData={kind => loadAllPagesForExport(kind, paging => servicioVentas.getSales(appliedFilters.search || undefined, appliedFilters.customerId || undefined, appliedFilters.status || undefined, toOperationalUtcBoundary(appliedFilters.startDate), toOperationalUtcBoundary(appliedFilters.endDate, true), paging))} />
      </div>
      <form onSubmit={event => { event.preventDefault(); void loadSales(); }}>
        <input className="form-control" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('searchSaleHistory')} />
        <select className="form-control" value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">{t('allCustomers')}</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.displayName}</option>)}</select>
        <select className="form-control" value={status} onChange={event => setStatus(event.target.value)}><option value="">{t('allStatuses')}</option><option value="Completada">{t('completedStatus')}</option><option value="PendientePago">{t('pendingPaymentStatus')}</option><option value="Cancelada">{t('cancelledStatus')}</option></select>
        <label className="sales-history-date-field"><span>{t('startDate')}</span><input className="form-control" type="date" max={endDate || undefined} value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
        <label className="sales-history-date-field"><span>{t('endDate')}</span><input className="form-control" type="date" min={startDate || undefined} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
        <button className="action-btn">🔎 {t('search')}</button>
        <button type="button" className="lang-btn" onClick={() => { setSearch(''); setCustomerId(''); setStatus(''); setStartDate(today()); setEndDate(today()); }}>{t('clearFilters')}</button>
      </form>
    </article>
    {error && <div className="pos-notice pos-notice--error">{error}</div>}
    <div className="sales-history-metrics">
      <article className="card"><span>🧾 {t('totalSalesCount')}</span><strong>{dynamicMetrics.totalCount}</strong></article>
      <article className="card"><span>💰 {t('total')}</span><strong>{safeFormat(dynamicMetrics.totalAmount)}</strong></article>
      <article className="card"><span>✅ {t('paidAmount')}</span><strong>{safeFormat(dynamicMetrics.paidAmount)}</strong></article>
      <article className="card"><span>⏳ {t('pendingBalance')}</span><strong>{safeFormat(dynamicMetrics.pendingAmount)}</strong></article>
    </div>
    <article className="card sales-history-table-wrap">{loading ? t('loading') : <table className="sales-history-table"><thead><tr><th>{t('folio')}</th><th>{t('date')}</th><th>{t('customer')}</th><th>{t('paymentType')}</th><th>{t('status')}</th><th>{t('total')}</th><th>{t('pendingBalance')}</th><th>{t('actions')}</th></tr></thead>
      <tbody>{sales.length === 0 && <tr><td colSpan={8} className="sales-history-empty">{t('noSalesInPeriod')}</td></tr>}{sales.map(sale => <tr key={sale.idVenta}>
        <td><strong>{t('saleNumber', { idVenta: sale.idVenta })}</strong></td>
        <td>{new Date(sale.createdAtUtc).toLocaleString(locale)}</td>
        <td>{sale.customerDisplayName || t('generalPublic')}</td>
        <td>{t(paymentTypeKey(sale.paymentType))}</td>
        <td><span className={`badge ${sale.status === 'Cancelada' || sale.status === 'Cancelled' ? 'badge-danger' : sale.pendingBalance > 0 ? 'badge-warning' : 'badge-success'}`}>{formatBadgeText(sale.status, sale.pendingBalance)}</span></td>
        <td>{safeFormat(sale.totalAmount)}</td>
        <td>{safeFormat(sale.pendingBalance)}</td>
        <td>
          <button className="pos-link-btn" onClick={() => setReceipt(sale)}>👁️ {t('viewReceipt')}</button>
          {canCancelSale && sale.status !== 'Cancelada' && sale.status !== 'Cancelled' && sale.status !== 'Devuelta' && (
            <button
              type="button"
              className="pos-link-btn"
              style={{ color: 'var(--danger)', marginLeft: '0.6rem' }}
              onClick={() => { setCancelSaleTarget(sale); setCancelReason(''); }}
              title="Cancelar esta venta (Solo Administrador)"
            >
              🚫 {t('cancel')}
            </button>
          )}
        </td>
      </tr>)}</tbody>
    </table>}</article>
    {receipt && <SaleReceiptModal sale={receipt} onClose={() => setReceipt(null)} />}

    {cancelSaleTarget && (
      <div className="pos-receipt-backdrop" onMouseDown={e => e.target === e.currentTarget && !cancelling && setCancelSaleTarget(null)}>
        <div className="pos-customer-modal" style={{ width: 'min(500px, 100%)' }} role="dialog" aria-modal="true">
          <h2 style={{ color: 'var(--danger)' }}>🚫 Cancelar Venta #{cancelSaleTarget.idVenta}</h2>
          <p>Esta acción reintegrará las piezas al inventario y ajustará el saldo del Corte de Caja.</p>
          <form onSubmit={handleConfirmCancelSale} style={{ display: 'grid', gap: '0.85rem', marginTop: '1rem' }}>
            <label className="pos-field">
              Motivo de Cancelación *
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Ingrese la razón de cancelación (ej. Error de cobro, cliente canceló)..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-input)', background: 'var(--background-surface)', color: 'var(--text-main)', resize: 'vertical' }}
              />
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="pos-receipt-close"
                style={{ flex: 1 }}
                disabled={cancelling}
                onClick={() => setCancelSaleTarget(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="action-btn"
                style={{ flex: 1.5, background: 'var(--danger)', borderColor: 'var(--danger)' }}
                disabled={cancelling || !cancelReason.trim()}
              >
                {cancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </section>;
};

const paymentTypeKey = (type: string) => ({ FullPayment: 'cashFullPayment', MixedPayment: 'mixedPayment', AdvanceDeposit: 'advanceDeposit' } as Record<string, string>)[type] ?? type;
export default SalesHistoryPage;
