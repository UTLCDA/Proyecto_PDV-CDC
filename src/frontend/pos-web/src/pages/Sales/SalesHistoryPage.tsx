import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { servicioVentas } from '../../services/servicioVentas';
import { Cliente } from '../../types/tiposCatalogo';
import { ResumenVentas, Venta } from '../../types/tiposVentas';
import SaleReceiptModal from './SaleReceiptModal';
import './SalesHistoryPage.css';

const today = () => new Date().toISOString().slice(0, 10);
const boundary = (date: string, end = false) => date ? `${date}T${end ? '23:59:59.999' : '00:00:00.000'}` : undefined;

export const SalesHistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [sales, setSales] = useState<Venta[]>([]);
  const [customers, setCustomers] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [receipt, setReceipt] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }), [locale]);

  const loadSales = useCallback(async () => {
    setLoading(true); setError('');
    const start = boundary(startDate); const end = boundary(endDate, true);
    try {
      const [salesData, customerData] = await Promise.all([
        servicioVentas.getSales(search.trim() || undefined, customerId || undefined, status || undefined, start, end),
        customers.length === 0 ? servicioCatalogo.getCustomers() : Promise.resolve(customers)
      ]);
      setSales(salesData); setCustomers(customerData);
    } catch (loadError) {
      setSales([]); setError(loadError instanceof Error ? loadError.message : t('salesLoadError'));
    } finally { setLoading(false); }
  }, [customerId, customers.length, endDate, search, startDate, status, t]);

  useEffect(() => { void loadSales(); }, [loadSales]);

  const dynamicMetrics = useMemo(() => {
    const totalCount = sales.length;
    const totalAmount = sales.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0);
    const pendingAmount = sales.reduce((acc, sale) => acc + (sale.pendingBalance || 0), 0);
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

  return <section className="sales-history-page">
    <article className="card sales-history-header"><div><h2>🧾 {t('salesHistoryTitle')}</h2><p>{t('salesHistorySubtitle')}</p></div>
      <form onSubmit={event => { event.preventDefault(); void loadSales(); }}>
        <input className="form-control" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('searchSaleHistory')} />
        <select className="form-control" value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">{t('allCustomers')}</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.displayName}</option>)}</select>
        <select className="form-control" value={status} onChange={event => setStatus(event.target.value)}><option value="">{t('allStatuses')}</option><option value="Completada">{t('completedStatus')}</option><option value="PendientePago">{t('pendingPaymentStatus')}</option><option value="Cancelada">{t('cancelledStatus')}</option></select>
        <label style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', fontWeight: 600 }}><span>{t('startDate')}</span><input className="form-control" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
        <label style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', fontWeight: 600 }}><span>{t('endDate')}</span><input className="form-control" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
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
      <tbody>{sales.length === 0 && <tr><td colSpan={8} className="sales-history-empty">{t('noSalesInPeriod')}</td></tr>}{sales.map(sale => <tr key={sale.id}><td><strong>{sale.folioNumber}</strong></td><td>{new Date(sale.createdAtUtc).toLocaleString(locale)}</td><td>{sale.customerDisplayName || t('generalPublic')}</td><td>{t(paymentTypeKey(sale.paymentType))}</td><td><span className={`badge ${sale.status === 'Cancelada' ? 'badge-danger' : sale.pendingBalance > 0 ? 'badge-warning' : 'badge-success'}`}>{formatBadgeText(sale.status, sale.pendingBalance)}</span></td><td>{safeFormat(sale.totalAmount)}</td><td>{safeFormat(sale.pendingBalance)}</td><td><button className="pos-link-btn" onClick={() => setReceipt(sale)}>👁️ {t('viewReceipt')}</button></td></tr>)}</tbody>
    </table>}</article>
    {receipt && <SaleReceiptModal sale={receipt} onClose={() => setReceipt(null)} />}
  </section>;
};

const paymentTypeKey = (type: string) => ({ FullPayment: 'cashFullPayment', MixedPayment: 'mixedPayment', AdvanceDeposit: 'advanceDeposit' } as Record<string, string>)[type] ?? type;
export default SalesHistoryPage;
