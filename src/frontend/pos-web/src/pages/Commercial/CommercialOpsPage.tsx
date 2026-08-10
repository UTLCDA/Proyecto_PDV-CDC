import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { cashShiftService } from '../../services/cashShiftService';
import { commercialService } from '../../services/commercialService';
import { servicioVentas } from '../../services/servicioVentas';
import { DocumentTemplate, PaymentInstallment, PaymentTransaction, QuoteOptions, SaleReturn, SaveDocumentTemplateRequest } from '../../types/commercial';
import { Venta } from '../../types/tiposVentas';
import SaleReceiptModal from '../Sales/SaleReceiptModal';
import './CommercialOpsPage.css';

const today = () => new Date().toISOString().slice(0, 10);
type ReturnQuantity = Record<string, string>;
type CommercialMode = 'installments' | 'returns' | 'contracts' | 'transactions';

export const CommercialOpsPage: React.FC<{ mode?: CommercialMode }> = ({ mode = 'installments' }) => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const canInstallments = hasPermission('comercial', 'abonos');
  const canReturns = hasPermission('comercial', 'devoluciones');
  const canContracts = hasPermission('comercial', 'contratos');
  const showInstallments = mode === 'installments' && canInstallments;
  const showTransactions = mode === 'transactions';
  const showReturns = mode === 'returns' && canReturns;
  const showContracts = mode === 'contracts' && canContracts;
  const [pendingSales, setPendingSales] = useState<Venta[]>([]);
  const [eligibleSales, setEligibleSales] = useState<Venta[]>([]);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [installmentHistory, setInstallmentHistory] = useState<PaymentInstallment[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<PaymentTransaction[]>([]);
  const [options, setOptions] = useState<QuoteOptions>({ products: [], customers: [] });
  const [historySearch, setHistorySearch] = useState('');
  const [historyCustomerId, setHistoryCustomerId] = useState('');
  const [historyPaymentMethod, setHistoryPaymentMethod] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [receiptSale, setReceiptSale] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saleId, setSaleId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnSaleId, setReturnSaleId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Card' | 'Transfer' | 'StoreCredit'>('StoreCredit');
  const [returnQuantities, setReturnQuantities] = useState<ReturnQuantity>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateCategory, setTemplateCategory] = useState<SaveDocumentTemplateRequest['category']>('ContratoVenta');
  const [templateContent, setTemplateContent] = useState('');
  const [contractSaleId, setContractSaleId] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }), [locale]);
  const dateTime = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }), [locale]);

  const load = async () => {
    try {
      setLoading(true);
      const [pending, eligible, returnHistory, documentTemplates, quoteOptions] = await Promise.all([
        showInstallments ? commercialService.getPendingSales() : Promise.resolve([]),
        showReturns || showContracts ? commercialService.getEligibleReturnSales() : Promise.resolve([]),
        showReturns ? commercialService.getReturns() : Promise.resolve([]),
        showContracts ? commercialService.getDocumentTemplates() : Promise.resolve([]),
        commercialService.getQuoteOptions().catch(() => ({ products: [], customers: [] }))
      ]);
      setPendingSales(pending);
      setEligibleSales(eligible);
      setReturns(returnHistory);
      setTemplates(documentTemplates);
      setOptions(quoteOptions);
      if (showInstallments) {
        setInstallmentHistory(await commercialService.getInstallmentHistory({
          startDate: historyStartDate ? `${historyStartDate}T00:00:00.000` : undefined,
          endDate: historyEndDate ? `${historyEndDate}T23:59:59.999` : undefined
        }));
      }
      if (showTransactions) {
        setTransactionHistory(await commercialService.getPaymentTransactions({
          startDate: historyStartDate ? `${historyStartDate}T00:00:00.000` : undefined,
          endDate: historyEndDate ? `${historyEndDate}T23:59:59.999` : undefined
        }));
      }
      if (selectedTemplateId) {
        const refreshed = documentTemplates.find(template => template.id === selectedTemplateId);
        if (refreshed) selectTemplate(refreshed);
      }
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('commercialLoadError')) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [showInstallments, showTransactions, showReturns, showContracts]);

  const selectedPendingSale = pendingSales.find(sale => sale.id === saleId);
  const selectedReturnSale = eligibleSales.find(sale => sale.id === returnSaleId);
  const contractSale = [...pendingSales, ...eligibleSales].find(sale => sale.id === contractSaleId);
  const previewText = renderTemplate(templateContent, contractSale);

  const selectInstallmentSale = async (id: string) => {
    setSaleId(id);
    setAmountPaid('');
    try {
      setInstallments(id ? await commercialService.getInstallments(id) : []);
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('installmentLoadError')) });
    }
  };

  const viewReceiptForSale = async (targetSaleId: string) => {
    try {
      setLoading(true);
      const sale = await servicioVentas.getSaleById(targetSaleId);
      setReceiptSale(sale);
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('receiptLoadError')) });
    } finally {
      setLoading(false);
    }
  };

  const registerInstallment = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(amountPaid);
    if (!saleId || !Number.isFinite(amount) || amount <= 0) {
      setNotice({ type: 'error', text: t('invalidInstallment') });
      return;
    }
    try {
      const shift = await cashShiftService.getCurrentShift();
      if (!shift || shift.status !== 'Abierto') {
        setNotice({ type: 'error', text: t('noOpenShiftSaleBlocked') });
        return;
      }
    } catch {
      setNotice({ type: 'error', text: t('noOpenShiftSaleBlocked') });
      return;
    }
    try {
      setSaving(true);
      const receipt = await commercialService.registerInstallment(saleId, amount, paymentMethod, paymentNotes);
      await load();
      setSaleId('');
      setAmountPaid('');
      setPaymentNotes('');
      setInstallments([]);
      setNotice({ type: 'success', text: t('installmentRegistered', { receipt: receipt.receiptNumber, balance: money.format(receipt.newPendingBalance) }) });
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('installmentSaveError')) });
    } finally {
      setSaving(false);
    }
  };

  const filterInstallmentHistory = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (showTransactions) {
        setTransactionHistory(await commercialService.getPaymentTransactions({
          search: historySearch.trim() || undefined,
          customerId: historyCustomerId || undefined,
          paymentMethod: historyPaymentMethod || undefined,
          startDate: historyStartDate ? `${historyStartDate}T00:00:00.000` : undefined,
          endDate: historyEndDate ? `${historyEndDate}T23:59:59.999` : undefined
        }));
      } else {
        setInstallmentHistory(await commercialService.getInstallmentHistory({
          search: historySearch.trim() || undefined,
          customerId: historyCustomerId || undefined,
          paymentMethod: historyPaymentMethod || undefined,
          startDate: historyStartDate ? `${historyStartDate}T00:00:00.000` : undefined,
          endDate: historyEndDate ? `${historyEndDate}T23:59:59.999` : undefined
        }));
      }
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('installmentLoadError')) });
    }
  };

  const clearHistoryFilters = async () => {
    setHistorySearch('');
    setHistoryCustomerId('');
    setHistoryPaymentMethod('');
    setHistoryStartDate('');
    setHistoryEndDate('');
    try {
      if (showTransactions) {
        setTransactionHistory(await commercialService.getPaymentTransactions());
      } else {
        setInstallmentHistory(await commercialService.getInstallmentHistory());
      }
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('installmentLoadError')) });
    }
  };

  const openReturn = () => {
    setReturnSaleId('');
    setReturnReason('');
    setRefundMethod('StoreCredit');
    setReturnQuantities({});
    setNotice(null);
    setReturnOpen(true);
  };

  const selectReturnSale = (id: string) => {
    setReturnSaleId(id);
    setReturnQuantities({});
  };

  const remainingQuantity = (productId: string, sold: number) => Math.max(0, sold - returns
    .filter(item => item.saleId === returnSaleId)
    .flatMap(item => item.items)
    .filter(item => item.productId === productId)
    .reduce((total, item) => total + item.quantity, 0));

  const processReturn = async (event: React.FormEvent) => {
    event.preventDefault();
    const items = selectedReturnSale?.items
      .map(item => ({ productId: item.productId, quantity: Number(returnQuantities[item.productId] || 0) }))
      .filter(item => item.quantity > 0) ?? [];
    if (!returnSaleId || returnReason.trim().length < 3 || items.length === 0) {
      setNotice({ type: 'error', text: t('invalidReturn') });
      return;
    }
    try {
      setSaving(true);
      const processed = await commercialService.processReturn({ saleId: returnSaleId, refundMethod, reason: returnReason, items });
      setReturnOpen(false);
      await load();
      setNotice({ type: 'success', text: t('returnProcessed', { folio: processed.returnNumber, amount: money.format(processed.totalRefundAmount) }) });
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('returnSaveError')) });
    } finally {
      setSaving(false);
    }
  };

  const newTemplate = () => {
    setSelectedTemplateId('');
    setTemplateTitle('Contrato Estándar WPC Bajío');
    setTemplateCategory('ContratoVenta');
    setTemplateContent(`CONTRATO DE COMPRAVENTA Y GARANTÍA WPC BAJÍO

FOLIO DE OPERACIÓN: {{FOLIO}}
FECHA DE EMISIÓN: {{FECHA}}
CLIENTE / RAZÓN SOCIAL: {{CLIENTE}}
ATENDIDO POR: {{VENDEDOR}}

1. OBJETO DEL CONTRATO:
Por medio del presente documento, WPC Bajío acuerda la comercialización y suministro de material decorativo Lambrín / Paneles según la especificación del pedido {{FOLIO}}.

2. RESUMEN FINANCIERO:
- Monto Total Acordado: {{TOTAL}}
- Saldo Pendiente de Liquidar: {{SALDO}}

3. CONDICIONES Y GARANTÍA:
El comprador declara estar conforme con las cantidades, colores y especificaciones técnicas de los productos adquiridos. La garantía cubre defectos de fabricación por 12 meses.`);
  };

  const selectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplateId(template.id);
    setTemplateTitle(template.title);
    setTemplateCategory(template.category as SaveDocumentTemplateRequest['category']);
    setTemplateContent(template.templateContentHtml);
  };

  const saveTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    const request = { title: templateTitle, category: templateCategory, templateContent };
    try {
      setSaving(true);
      const saved = selectedTemplateId
        ? await commercialService.updateDocumentTemplate(selectedTemplateId, request)
        : await commercialService.createDocumentTemplate(request);
      setSelectedTemplateId(saved.id);
      await load();
      setNotice({ type: 'success', text: t('templateSaved') });
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('templateSaveError')) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="commercial-empty">{t('loading')}</div>;

  return <section className="commercial-page">
    <header className="commercial-header"><div><h1>{mode === 'returns' ? '↩️' : mode === 'contracts' ? '📄' : mode === 'transactions' ? '💳' : '💰'} {t(mode === 'returns' ? 'returnsModuleTitle' : mode === 'contracts' ? 'contractsModuleTitle' : mode === 'transactions' ? 'transactionsModuleTitle' : 'installmentsManager')}</h1><p>{t(mode === 'returns' ? 'returnHistoryHint' : mode === 'contracts' ? 'contractTemplatesSubtitle' : mode === 'transactions' ? 'transactionsModuleSubtitle' : 'installmentsSubtitle')}</p></div>{showReturns && <button className="commercial-danger-btn" onClick={openReturn}>↩️ {t('processReturn')}</button>}</header>
    {notice && <div className={`commercial-notice commercial-notice--${notice.type}`} role="alert">{notice.text}</div>}

    <div className="commercial-grid">
      {showTransactions && <article className="commercial-card commercial-contracts" style={{ gridColumn: '1 / -1' }}>
        <header><div><h2>💳 {t('transactionsModuleTitle')}</h2><p>{t('transactionsModuleSubtitle')}</p></div><strong>{transactionHistory.length}</strong></header>
        <form className="commercial-history-filters" onSubmit={filterInstallmentHistory} style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder="Buscar por folio de venta o N° recibo..." />
          <select value={historyCustomerId} onChange={event => setHistoryCustomerId(event.target.value)}>
            <option value="">{t('allCustomers')}</option>
            {options.customers.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </select>
          <select value={historyPaymentMethod} onChange={event => setHistoryPaymentMethod(event.target.value)}>
            <option value="">{t('allPaymentMethods')}</option>
            <option value="Cash">💵 {t('cash')}</option>
            <option value="Card">💳 {t('card')}</option>
            <option value="Transfer">🏦 {t('transfer')}</option>
          </select>
          <label style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', fontWeight: 600 }}><span>{t('startDate')}</span><input type="date" value={historyStartDate} onChange={event => setHistoryStartDate(event.target.value)} /></label>
          <label style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', fontWeight: 600 }}><span>{t('endDate')}</span><input type="date" value={historyEndDate} onChange={event => setHistoryEndDate(event.target.value)} /></label>
          <button className="lang-btn">🔎 {t('search')}</button>
          <button type="button" className="lang-btn" onClick={() => void clearHistoryFilters()}>{t('clearFilters')}</button>
        </form>
        <div className="commercial-history-table-wrap" style={{ overflowX: 'auto' }}>
          {transactionHistory.length === 0 ? <div className="commercial-empty">{t('noInstallments')}</div> : (
            <table className="customers-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Folio Venta</th>
                  <th>N° Recibo / Referencia</th>
                  <th>{t('date')}</th>
                  <th>Movimiento</th>
                  <th>{t('paymentType')}</th>
                  <th>Monto Pagado</th>
                  <th>Cliente</th>
                  <th>{t('user')}</th>
                  <th>{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {transactionHistory.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.saleFolioNumber}</strong></td>
                    <td><code>{item.referenceNumber}</code></td>
                    <td>{dateTime.format(new Date(item.createdAtUtc))}</td>
                    <td>
                      <span className={`badge ${item.transactionType === 'Advance' ? 'badge-warning' : item.transactionType === 'Sale' ? 'badge-success' : 'badge-info'}`}>
                        {item.transactionType === 'Advance' ? 'Anticipo Inicial' : item.transactionType === 'Sale' ? 'Pago de Venta' : 'Abono a Saldo'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {item.paymentMethod === 'Cash' ? '💵 Efectivo' : item.paymentMethod === 'Card' ? '💳 Tarjeta' : '🏦 SPEI'}
                      </span>
                    </td>
                    <td><strong style={{ color: '#2b8a3e' }}>{money.format(item.amount)}</strong></td>
                    <td><small>{item.customerDisplayName || 'Público General'}</small></td>
                    <td><small>{item.userUsername || '—'}</small></td>
                    <td>
                      <button type="button" className="pos-link-btn" onClick={() => void viewReceiptForSale(item.saleId)}>
                        👁️ Comprobante
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </article>}
      {showInstallments && <article className="commercial-card"><header><div><h2>💰 {t('installmentsManager')}</h2><p>{t('installmentsSubtitle')}</p></div><strong>{pendingSales.length}</strong></header>
        <form className="commercial-form" onSubmit={registerInstallment}>
          <label>{t('pendingSale')} *<select required value={saleId} onChange={event => void selectInstallmentSale(event.target.value)}><option value="">{t('selectPendingSale')}</option>{pendingSales.map(sale => <option key={sale.id} value={sale.id}>{sale.folioNumber} — {sale.customerDisplayName} — {money.format(sale.pendingBalance)}</option>)}</select></label>
          {selectedPendingSale && (
            <div className="commercial-balance" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span>{t('customer')}<b>{selectedPendingSale.customerDisplayName}</b></span>
                <span>{t('initialDeposit')}<b>{money.format(selectedPendingSale.advanceAmount)}</b></span>
                <span>{t('pendingBalance')}<strong>{money.format(selectedPendingSale.pendingBalance)}</strong></span>
              </div>
              <button type="button" className="action-btn" onClick={() => void viewReceiptForSale(selectedPendingSale.id)} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                👁️ Consultar Comprobante de Venta
              </button>
            </div>
          )}
          <div className="commercial-form-grid"><label>{t('installmentAmount')} *<input required type="number" min="0.01" max={selectedPendingSale?.pendingBalance} step="0.01" value={amountPaid} onChange={event => setAmountPaid(event.target.value)} placeholder="0.00" /></label><label>{t('paymentMethod')} *<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}><option value="Cash">{t('cash')}</option><option value="Card">{t('card')}</option><option value="Transfer">{t('transfer')}</option></select></label></div>
          <label>{t('notes')}<textarea rows={2} maxLength={500} value={paymentNotes} onChange={event => setPaymentNotes(event.target.value)} placeholder={t('installmentNotesPlaceholder')} /></label>
          <button className="action-btn" disabled={saving || !saleId}>{saving ? t('processing') : t('registerInstallment')}</button>
        </form>
        {installments.length > 0 && <div className="commercial-history" style={{ marginTop: '16px' }}>
          <h3>{t('installmentHistory')}</h3>
          {installments.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--background-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)', margin: '6px 0' }}>
              <div>
                <b style={{ display: 'block', color: 'var(--primary-main)' }}>{item.receiptNumber}</b>
                <small style={{ color: 'var(--text-secondary)' }}>{dateTime.format(new Date(item.createdAtUtc))}</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ color: '#2b8a3e', display: 'block' }}>{money.format(item.amountPaid)}</strong>
                <small style={{ color: 'var(--text-secondary)' }}>{t('remainingBalance', { balance: money.format(item.newPendingBalance) })}</small>
              </div>
              <button type="button" className="pos-link-btn" onClick={() => void viewReceiptForSale(item.saleId)}>👁️ Recibo</button>
            </div>
          ))}
        </div>}
        <div className="commercial-global-history">
          <h3>{showTransactions ? '💳 Histórico de Transacciones y Movimientos de Pago' : t('globalInstallmentHistory')}</h3>
          <form className="commercial-history-filters" onSubmit={filterInstallmentHistory} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <input value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder="Buscar por folio de venta o N° recibo..." />
            <select value={historyCustomerId} onChange={event => setHistoryCustomerId(event.target.value)}>
              <option value="">{t('allCustomers')}</option>
              {options.customers.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select>
            <select value={historyPaymentMethod} onChange={event => setHistoryPaymentMethod(event.target.value)}>
              <option value="">{t('allPaymentMethods')}</option>
              <option value="Cash">💵 {t('cash')}</option>
              <option value="Card">💳 {t('card')}</option>
              <option value="Transfer">🏦 {t('transfer')}</option>
            </select>
            <label style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', fontWeight: 600 }}><span>{t('startDate')}</span><input type="date" value={historyStartDate} onChange={event => setHistoryStartDate(event.target.value)} /></label>
            <label style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', fontWeight: 600 }}><span>{t('endDate')}</span><input type="date" value={historyEndDate} onChange={event => setHistoryEndDate(event.target.value)} /></label>
            <button className="lang-btn">🔎 {t('search')}</button>
            <button type="button" className="lang-btn" onClick={() => void clearHistoryFilters()}>{t('clearFilters')}</button>
          </form>
          <div className="commercial-history-table-wrap" style={{ marginTop: '12px', overflowX: 'auto' }}>
            {showTransactions ? (
              transactionHistory.length === 0 ? <div className="commercial-empty">{t('noInstallments')}</div> : (
                <table className="customers-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Folio Venta</th>
                      <th>N° Recibo / Referencia</th>
                      <th>{t('date')}</th>
                      <th>Movimiento</th>
                      <th>{t('paymentType')}</th>
                      <th>Monto Pagado</th>
                      <th>Cliente</th>
                      <th>{t('user')}</th>
                      <th>{t('action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionHistory.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.saleFolioNumber}</strong></td>
                        <td><code>{item.referenceNumber}</code></td>
                        <td>{dateTime.format(new Date(item.createdAtUtc))}</td>
                        <td>
                          <span className={`badge ${item.transactionType === 'Advance' ? 'badge-warning' : item.transactionType === 'Sale' ? 'badge-success' : 'badge-info'}`}>
                            {item.transactionType === 'Advance' ? 'Anticipo Inicial' : item.transactionType === 'Sale' ? 'Pago de Venta' : 'Abono a Saldo'}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {item.paymentMethod === 'Cash' ? '💵 Efectivo' : item.paymentMethod === 'Card' ? '💳 Tarjeta' : '🏦 SPEI'}
                          </span>
                        </td>
                        <td><strong>{money.format(item.amount)}</strong></td>
                        <td><small>{item.customerDisplayName || 'Público General'}</small></td>
                        <td><small>{item.userUsername || '—'}</small></td>
                        <td>
                          <button type="button" className="pos-link-btn" onClick={() => void viewReceiptForSale(item.saleId)}>
                            👁️ Comprobante
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              installmentHistory.length === 0 ? <div className="commercial-empty">{t('noInstallments')}</div> : (
                <table className="customers-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Folio Venta</th>
                      <th>N° Recibo</th>
                      <th>{t('date')}</th>
                      <th>{t('paymentType')}</th>
                      <th>{t('amountPaid')}</th>
                      <th>{t('pendingBalance')}</th>
                      <th>{t('user')}</th>
                      <th>{t('action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installmentHistory.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.saleFolioNumber}</strong></td>
                        <td><code>{item.receiptNumber}</code></td>
                        <td>{dateTime.format(new Date(item.createdAtUtc))}</td>
                        <td>
                          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {item.paymentMethod === 'Cash' ? '💵 Efectivo' : item.paymentMethod === 'Card' ? '💳 Tarjeta' : '🏦 SPEI'}
                          </span>
                        </td>
                        <td><strong>{money.format(item.amountPaid)}</strong></td>
                        <td>{money.format(item.newPendingBalance)}</td>
                        <td><small>{item.userUsername || '—'}</small></td>
                        <td>
                          <button type="button" className="pos-link-btn" onClick={() => void viewReceiptForSale(item.saleId)}>
                            👁️ Comprobante
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      </article>}

      {showReturns && <article className="commercial-card"><header><div><h2>↩️ {t('returnHistory')}</h2><p>{t('returnHistoryHint')}</p></div><strong>{returns.length}</strong></header>{returns.length === 0 ? <div className="commercial-empty">{t('noReturns')}</div> : <div className="commercial-history-table-wrap" style={{ overflowX: 'auto', marginTop: '12px' }}>
        <table className="customers-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>N° Devolución</th>
              <th>Folio Venta</th>
              <th>{t('returnDate')}</th>
              <th>Método Reembolso</th>
              <th>Monto Reembolsado</th>
            </tr>
          </thead>
          <tbody>
            {returns.map(item => (
              <tr key={item.id}>
                <td><strong>{item.returnNumber}</strong></td>
                <td><code>{item.saleFolioNumber}</code></td>
                <td>{dateTime.format(new Date(item.createdAtUtc))}</td>
                <td><span className="badge badge-info">{t(refundMethodKey(item.refundMethod))}</span></td>
                <td><strong style={{ color: 'var(--danger)' }}>{money.format(item.totalRefundAmount)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}</article>}

      {showContracts && <article className="commercial-card commercial-contracts"><header><div><h2>📄 {t('contractTemplates')}</h2><p>{t('contractTemplatesSubtitle')}</p></div><button className="pos-link-btn" onClick={newTemplate}>➕ {t('newTemplate')}</button></header>
        <div className="commercial-template-layout"><nav>{templates.length === 0 && <span>{t('noTemplates')}</span>}{templates.map(template => <button key={template.id} className={selectedTemplateId === template.id ? 'is-selected' : ''} onClick={() => selectTemplate(template)}>{template.title}<small>{t(templateCategoryKey(template.category))}</small></button>)}</nav>
          <form className="commercial-form" onSubmit={saveTemplate}>
            <label>{t('templateTitle')} *<input required maxLength={150} value={templateTitle} onChange={event => setTemplateTitle(event.target.value)} /></label>
            <label>{t('templateCategory')} *<select value={templateCategory} onChange={event => setTemplateCategory(event.target.value as SaveDocumentTemplateRequest['category'])}><option value="ContratoVenta">{t('saleContract')}</option><option value="ContratoApartado">{t('depositContract')}</option><option value="ReciboAbono">{t('installmentReceipt')}</option></select></label>
            <label>{t('templateContent')} *<textarea required rows={10} maxLength={10000} value={templateContent} onChange={event => setTemplateContent(event.target.value)} placeholder={t('templateContentPlaceholder')} /></label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <small style={{ width: '100%', fontWeight: 600 }}>Insertar variables dinámicas:</small>
              {['{{FOLIO}}', '{{CLIENTE}}', '{{TOTAL}}', '{{SALDO}}', '{{FECHA}}', '{{VENDEDOR}}'].map(variable => (
                <button type="button" key={variable} className="lang-btn" style={{ fontSize: '0.8rem', padding: '2px 8px' }} onClick={() => setTemplateContent(prev => `${prev} ${variable}`)}>
                  + {variable}
                </button>
              ))}
            </div>
            <div className="commercial-form-actions"><button type="button" className="lang-btn" disabled={!templateContent} onClick={() => setPreviewOpen(true)}>{t('preview')}</button><button className="action-btn" disabled={saving}>{saving ? t('saving') : t('saveTemplate')}</button></div>
          </form>
        </div>
      </article>}
    </div>

    {returnOpen && <Modal title={t('processReturnTitle')} onClose={() => setReturnOpen(false)}><form className="commercial-form" onSubmit={processReturn}><label>{t('originalSale')} *<select required value={returnSaleId} onChange={event => selectReturnSale(event.target.value)}><option value="">{t('selectOriginalSale')}</option>{eligibleSales.map(sale => <option key={sale.id} value={sale.id}>{sale.folioNumber} — {sale.customerDisplayName || t('generalPublic')}</option>)}</select></label>{selectedReturnSale && <div className="commercial-return-items">{selectedReturnSale.items.map(item => { const remaining = remainingQuantity(item.productId, item.quantity); return <label key={item.id}><span>{item.productSku} — {item.productName}<small>{t('returnAvailable', { quantity: remaining })}</small></span><input type="number" min="0" max={remaining} step="0.0001" value={returnQuantities[item.productId] ?? ''} onChange={event => setReturnQuantities(current => ({ ...current, [item.productId]: event.target.value }))} placeholder="0" /></label>; })}</div>}<label>{t('refundMethod')} *<select value={refundMethod} onChange={event => setRefundMethod(event.target.value as typeof refundMethod)}><option value="StoreCredit">{t('storeCredit')}</option><option value="Cash">{t('cash')}</option><option value="Card">{t('card')}</option><option value="Transfer">{t('transfer')}</option></select></label><label>{t('returnReason')} *<textarea required rows={3} maxLength={500} value={returnReason} onChange={event => setReturnReason(event.target.value)} placeholder={t('returnReasonPlaceholder')} /></label><footer><button type="button" className="lang-btn" onClick={() => setReturnOpen(false)}>{t('cancel')}</button><button className="commercial-danger-btn" disabled={saving}>{saving ? t('processing') : t('confirmReturn')}</button></footer></form></Modal>}

    {previewOpen && <Modal title={t('contractPreview')} onClose={() => setPreviewOpen(false)}>
      <div className="commercial-preview-controls">
        <label>{t('relatedSale')}
          <select value={contractSaleId} onChange={event => setContractSaleId(event.target.value)}>
            <option value="">{t('withoutRelatedSale')}</option>
            {[...pendingSales, ...eligibleSales].filter((sale, index, all) => all.findIndex(item => item.id === sale.id) === index).map(sale => (
              <option key={sale.id} value={sale.id}>{sale.folioNumber} — {sale.customerDisplayName}</option>
            ))}
          </select>
        </label>
      </div>
      <article className="commercial-document">
        <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '12px' }}>
          <img src="/logo_wpc_bajio.jpeg" alt="WPC Bajío Logo" style={{ maxHeight: '75px', objectFit: 'contain' }} />
          <h2 style={{ margin: '8px 0 2px 0', fontSize: '1.4rem' }}>WPC BAJÍO — PANELES Y LAMBRÍN DECORATIVO</h2>
          <span style={{ fontSize: '0.85rem', color: '#666' }}>Documento Oficial de Garantía y Contrato</span>
        </div>
        <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{templateTitle}</h3>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{previewText}</div>
        <footer style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #ccc', paddingTop: '16px' }}>
          <span>____________________________<br /><b>{t('customerSignature')}</b><br /><small>{contractSale?.customerDisplayName || 'Firma Cliente'}</small></span>
          <span>____________________________<br /><b>{t('companySignature')}</b><br /><small>WPC Bajío Autorizado</small></span>
        </footer>
      </article>
      <div className="commercial-preview-actions">
        <button className="action-btn" onClick={() => window.print()}>🖨️ {t('printContract')}</button>
      </div>
    </Modal>}

    {receiptSale && <SaleReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />}
  </section>;
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => <div className="commercial-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="commercial-modal" role="dialog" aria-modal="true"><header><h2>{title}</h2><button aria-label="Cerrar" onClick={onClose}>×</button></header>{children}</div></div>;
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const refundMethodKey = (method: string) => ({ Cash: 'cash', Card: 'card', Transfer: 'transfer', StoreCredit: 'storeCredit' } as Record<string, string>)[method] ?? method;
const paymentMethodKey = (method: string) => ({ Cash: 'cash', Card: 'card', Transfer: 'transfer' } as Record<string, string>)[method] ?? method;
const templateCategoryKey = (category: string) => ({ ContratoVenta: 'saleContract', ContratoApartado: 'depositContract', ReciboAbono: 'installmentReceipt' } as Record<string, string>)[category] ?? category;
const renderTemplate = (content: string, sale?: Venta) => {
  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const replacements: Record<string, string> = {
    '{{FOLIO}}': sale?.folioNumber ?? '{{FOLIO}}',
    '{{CLIENTE}}': sale?.customerDisplayName ?? '{{CLIENTE}}',
    '{{TOTAL}}': sale ? currency.format(sale.totalAmount) : '{{TOTAL}}',
    '{{SALDO}}': sale ? currency.format(sale.pendingBalance) : '{{SALDO}}',
    '{{FECHA}}': new Intl.DateTimeFormat('es-MX').format(new Date()),
    '{{VENDEDOR}}': sale?.userUsername ?? 'Vendedor WPC Bajío'
  };
  return Object.entries(replacements).reduce((text, [token, value]) => text.split(token).join(value), content);
};

export default CommercialOpsPage;
