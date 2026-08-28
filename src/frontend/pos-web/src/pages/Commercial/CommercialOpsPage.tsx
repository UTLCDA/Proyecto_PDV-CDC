import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { cashShiftService } from '../../services/cashShiftService';
import { commercialService } from '../../services/commercialService';
import { servicioVentas } from '../../services/servicioVentas';
import { DocumentTemplate, PaymentInstallment, PaymentTransaction, QuoteOptions, SaleReturn, SaveDocumentTemplateRequest } from '../../types/commercial';
import { Venta } from '../../types/tiposVentas';
import { parseUtcDate } from '../../utils/dateUtils';
import { paymentReceiptArguments } from '../../utils/receiptUtils';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { getOperationalDateInputValue, toOperationalUtcBoundary } from '../../utils/operationalDate';
import { loadAllPagesForExport } from '../../utils/pagedExport';
import SaleReceiptModal from '../Sales/SaleReceiptModal';
import './CommercialOpsPage.css';

const today = getOperationalDateInputValue;
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
  const [historyStartDate, setHistoryStartDate] = useState(today);
  const [historyEndDate, setHistoryEndDate] = useState(today);
  const [appliedHistoryFilters, setAppliedHistoryFilters] = useState(() => ({ search: '', customerId: '', paymentMethod: '', startDate: today(), endDate: today() }));
  const [receiptSale, setReceiptSale] = useState<Venta | null>(null);
  const [receiptTargetPaymentId, setReceiptTargetPaymentId] = useState<string | undefined>(undefined);
  const [receiptCutoffDate, setReceiptCutoffDate] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saleIdVenta, setSaleIdVenta] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnIdVenta, setReturnIdVenta] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Card' | 'Transfer' | 'StoreCredit'>('StoreCredit');
  const [returnQuantities, setReturnQuantities] = useState<ReturnQuantity>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateCategory, setTemplateCategory] = useState<SaveDocumentTemplateRequest['category']>('ContratoVenta');
  const [templateContent, setTemplateContent] = useState('');
  const [contractIdVenta, setContractIdVenta] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }), [locale]);
  const dateTime = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }), [locale]);
  const selectedHistoryCustomer = options.customers.find(customer => customer.id === appliedHistoryFilters.customerId)?.displayName;
  const historyExportFilters = useMemo(() => [
    { label: 'Periodo', value: appliedHistoryFilters.startDate && appliedHistoryFilters.endDate ? `${appliedHistoryFilters.startDate} al ${appliedHistoryFilters.endDate}` : appliedHistoryFilters.startDate || appliedHistoryFilters.endDate },
    { label: 'Búsqueda', value: appliedHistoryFilters.search },
    { label: 'Cliente', value: selectedHistoryCustomer || 'Todos' },
    { label: 'Método de pago', value: appliedHistoryFilters.paymentMethod ? paymentMethodLabel(appliedHistoryFilters.paymentMethod) : 'Todos' }
  ], [appliedHistoryFilters, selectedHistoryCustomer]);

  const transactionExportConfig = useMemo<ExportReportConfig<PaymentTransaction>>(() => ({
    moduleName: t('transactionsModuleTitle'),
    title: 'Histórico de Transacciones y Movimientos de Pago',
    fileName: 'Transacciones_Pagos',
    sheetName: 'Transacciones',
    orientation: 'landscape',
    dateRange: { startDate: appliedHistoryFilters.startDate, endDate: appliedHistoryFilters.endDate },
    filters: historyExportFilters,
    columns: [
      { key: 'idVenta', label: 'Id Venta / 单号', type: 'number', width: 0.8, value: item => item.idVenta },
      { key: 'reference', label: 'Recibo / Referencia / 凭证', width: 1.2, value: item => item.referenceNumber },
      { key: 'date', label: 'Fecha / 日期', type: 'datetime', width: 1.2, value: item => item.createdAtUtc },
      { key: 'movement', label: 'Movimiento / 交易类型', width: 1.2, value: item => transactionTypeLabel(item.transactionType) },
      { key: 'paymentMethod', label: 'Método de Pago / 付款方式', width: 1.1, value: item => paymentMethodLabel(item.paymentMethod) },
      { key: 'amount', label: 'Monto Pagado / 付款金额', type: 'currency', width: 1, value: item => item.amount },
      { key: 'customer', label: 'Cliente / 客户', width: 1.4, value: item => item.customerDisplayName || 'Público General' },
      { key: 'user', label: 'Usuario / 操作员', width: 0.9, value: item => item.userUsername || '—' }
    ]
  }), [appliedHistoryFilters.endDate, appliedHistoryFilters.startDate, historyExportFilters, t]);

  const installmentExportConfig = useMemo<ExportReportConfig<PaymentInstallment>>(() => ({
    moduleName: t('installmentsManager'),
    title: 'Histórico de Abonos a Saldos Pendientes',
    fileName: 'Abonos',
    sheetName: 'Abonos',
    orientation: 'landscape',
    dateRange: { startDate: appliedHistoryFilters.startDate, endDate: appliedHistoryFilters.endDate },
    filters: historyExportFilters,
    columns: [
      { key: 'idVenta', label: 'Id Venta / 单号', type: 'number', width: 0.8, value: item => item.idVenta },
      { key: 'receipt', label: 'Núm. Recibo / 收据编号', width: 1.1, value: item => item.receiptNumber },
      { key: 'date', label: 'Fecha / 日期', type: 'datetime', width: 1.2, value: item => item.createdAtUtc },
      { key: 'paymentMethod', label: 'Método de Pago / 付款方式', width: 1.1, value: item => paymentMethodLabel(item.paymentMethod) },
      { key: 'amount', label: 'Monto Pagado / 付款金额', type: 'currency', width: 1, value: item => item.amountPaid },
      { key: 'previousBalance', label: 'Saldo Anterior / 原待付余额', type: 'currency', width: 1.1, value: item => item.previousPendingBalance },
      { key: 'newBalance', label: 'Saldo Pendiente / 新待付余额', type: 'currency', width: 1.1, value: item => item.newPendingBalance },
      { key: 'user', label: 'Usuario / 操作员', width: 0.9, value: item => item.userUsername || '—' },
      { key: 'notes', label: 'Observaciones / 备注', width: 1.4, value: item => item.notes || '—' }
    ]
  }), [appliedHistoryFilters.endDate, appliedHistoryFilters.startDate, historyExportFilters, t]);

  const returnExportConfig = useMemo<ExportReportConfig<SaleReturn>>(() => ({
    moduleName: t('returnsModuleTitle'),
    title: 'Histórico de Devoluciones',
    fileName: 'Devoluciones',
    sheetName: 'Devoluciones',
    orientation: 'landscape',
    columns: [
      { key: 'returnNumber', label: 'Núm. Devolución / 退货单号', width: 1.1, value: item => item.returnNumber },
      { key: 'idVenta', label: 'Id Venta / 单号', type: 'number', width: 0.8, value: item => item.idVenta },
      { key: 'date', label: 'Fecha / 日期', type: 'datetime', width: 1.2, value: item => item.createdAtUtc },
      { key: 'refundMethod', label: 'Método de Reembolso / 退款方式', width: 1.2, value: item => t(refundMethodKey(item.refundMethod)) },
      { key: 'total', label: 'Total Devolución / 退货总额', type: 'currency', width: 1.1, value: item => item.totalRefundAmount },
      { key: 'appliedBalance', label: 'Aplicado a Saldo / 抵扣尾款', type: 'currency', width: 1.1, value: item => item.appliedToPendingBalance },
      { key: 'refunded', label: 'Monto Reembolsado / 实退金额', type: 'currency', width: 1.1, value: item => item.refundedAmount },
      { key: 'status', label: 'Estado / 状态', width: 0.85, value: item => item.status },
      { key: 'reason', label: 'Motivo / 原因', width: 1.5, value: item => item.reason }
    ]
  }), [t]);

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
          startDate: toOperationalUtcBoundary(historyStartDate),
          endDate: toOperationalUtcBoundary(historyEndDate, true)
        }));
      }
      if (showTransactions) {
        setTransactionHistory(await commercialService.getPaymentTransactions({
          startDate: toOperationalUtcBoundary(historyStartDate),
          endDate: toOperationalUtcBoundary(historyEndDate, true)
        }));
      }
      if (showInstallments || showTransactions) {
        setAppliedHistoryFilters({ search: '', customerId: '', paymentMethod: '', startDate: historyStartDate, endDate: historyEndDate });
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

  const selectedPendingSale = pendingSales.find(sale => sale.idVenta === Number(saleIdVenta));
  const selectedReturnSale = eligibleSales.find(sale => sale.idVenta === Number(returnIdVenta));
  const contractSale = [...pendingSales, ...eligibleSales].find(sale => sale.idVenta === Number(contractIdVenta));
  const previewText = renderTemplate(templateContent, contractSale);

  const selectInstallmentSale = async (value: string) => {
    setSaleIdVenta(value);
    setAmountPaid('');
    try {
      setInstallments(value ? await commercialService.getInstallments(Number(value)) : []);
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('installmentLoadError')) });
    }
  };

  const viewReceiptForSale = async (targetIdVenta: number, targetPaymentId?: string, cutoffDate?: string) => {
    try {
      setLoading(true);
      setReceiptTargetPaymentId(targetPaymentId);
      setReceiptCutoffDate(cutoffDate);
      const sale = await servicioVentas.getSaleByIdVenta(targetIdVenta);
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
    if (!saleIdVenta || !Number.isFinite(amount) || amount <= 0) {
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
      const receipt = await commercialService.registerInstallment(Number(saleIdVenta), amount, paymentMethod, paymentNotes);
      await load();
      setSaleIdVenta('');
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
    if (historyStartDate && historyEndDate && historyStartDate > historyEndDate) {
      setNotice({ type: 'error', text: t('invalidReportDateRange') });
      return;
    }
    try {
      const filters = {
        search: historySearch.trim() || undefined,
        customerId: historyCustomerId || undefined,
        paymentMethod: historyPaymentMethod || undefined,
        startDate: toOperationalUtcBoundary(historyStartDate),
        endDate: toOperationalUtcBoundary(historyEndDate, true)
      };
      if (showTransactions) {
        setTransactionHistory(await commercialService.getPaymentTransactions(filters));
      } else {
        setInstallmentHistory(await commercialService.getInstallmentHistory(filters));
      }
      setAppliedHistoryFilters({ search: historySearch.trim(), customerId: historyCustomerId, paymentMethod: historyPaymentMethod, startDate: historyStartDate, endDate: historyEndDate });
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('installmentLoadError')) });
    }
  };

  const clearHistoryFilters = async () => {
    const operationalToday = today();
    setHistorySearch('');
    setHistoryCustomerId('');
    setHistoryPaymentMethod('');
    setHistoryStartDate(operationalToday);
    setHistoryEndDate(operationalToday);
    const currentDayFilter = {
      startDate: toOperationalUtcBoundary(operationalToday),
      endDate: toOperationalUtcBoundary(operationalToday, true)
    };
    try {
      if (showTransactions) {
        setTransactionHistory(await commercialService.getPaymentTransactions(currentDayFilter));
      } else {
        setInstallmentHistory(await commercialService.getInstallmentHistory(currentDayFilter));
      }
      setAppliedHistoryFilters({ search: '', customerId: '', paymentMethod: '', startDate: operationalToday, endDate: operationalToday });
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('installmentLoadError')) });
    }
  };

  const openReturn = () => {
    setReturnIdVenta('');
    setReturnReason('');
    setRefundMethod('StoreCredit');
    setReturnQuantities({});
    setNotice(null);
    setReturnOpen(true);
  };

  const selectReturnSale = (value: string) => {
    setReturnIdVenta(value);
    setReturnQuantities({});
  };

  const remainingQuantity = (productId: string, sold: number) => Math.max(0, sold - returns
    .filter(item => item.idVenta === Number(returnIdVenta))
    .flatMap(item => item.items)
    .filter(item => item.productId === productId)
    .reduce((total, item) => total + item.quantity, 0));

  const processReturn = async (event: React.FormEvent) => {
    event.preventDefault();
    const items = selectedReturnSale?.items
      .map(item => ({ productId: item.productId, quantity: Number(returnQuantities[item.productId] || 0) }))
      .filter(item => item.quantity > 0) ?? [];
    if (!returnIdVenta || returnReason.trim().length < 3 || items.length === 0) {
      setNotice({ type: 'error', text: t('invalidReturn') });
      return;
    }
    try {
      setSaving(true);
      const processed = await commercialService.processReturn({ idVenta: Number(returnIdVenta), refundMethod, reason: returnReason, items });
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
- Saldo Pendiente de Liquidar: {{SALDO}}`);
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
        <header><div><h2>💳 {t('transactionsModuleTitle')}</h2><p>{t('transactionsModuleSubtitle')}</p></div><div className="commercial-section-actions"><ExportButtons data={transactionHistory} config={transactionExportConfig} onLoadAllData={kind => loadAllPagesForExport(kind, paging => commercialService.getPaymentTransactions({
          search: appliedHistoryFilters.search || undefined,
          customerId: appliedHistoryFilters.customerId || undefined,
          paymentMethod: appliedHistoryFilters.paymentMethod || undefined,
          startDate: toOperationalUtcBoundary(appliedHistoryFilters.startDate),
          endDate: toOperationalUtcBoundary(appliedHistoryFilters.endDate, true)
        }, paging))} /></div></header>
        <form className="commercial-history-filters" onSubmit={filterInstallmentHistory} style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder={t('searchInstallments')} />
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
          <label style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', fontWeight: 600 }}><span>{t('startDate')}</span><input type="date" max={historyEndDate || undefined} value={historyStartDate} onChange={event => setHistoryStartDate(event.target.value)} /></label>
          <label style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', fontWeight: 600 }}><span>{t('endDate')}</span><input type="date" min={historyStartDate || undefined} value={historyEndDate} onChange={event => setHistoryEndDate(event.target.value)} /></label>
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
                    <td><strong>{t('saleNumber', { idVenta: item.idVenta })}</strong></td>
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
                      <button type="button" className="pos-link-btn" onClick={() => void viewReceiptForSale(...paymentReceiptArguments(item))}>
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
          <label>{t('pendingSale')} *<select required value={saleIdVenta} onChange={event => void selectInstallmentSale(event.target.value)}><option value="">{t('selectPendingSale')}</option>{pendingSales.map(sale => <option key={sale.idVenta} value={sale.idVenta}>{t('saleNumber', { idVenta: sale.idVenta })} — {sale.customerDisplayName} — {money.format(sale.pendingBalance)}</option>)}</select></label>
          {selectedPendingSale && (
            <div className="commercial-balance" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span>{t('customer')}<b>{selectedPendingSale.customerDisplayName}</b></span>
                <span>{t('initialDeposit')}<b>{money.format(selectedPendingSale.advanceAmount)}</b></span>
                <span>{t('pendingBalance')}<strong>{money.format(selectedPendingSale.pendingBalance)}</strong></span>
              </div>
              <button type="button" className="action-btn" onClick={() => void viewReceiptForSale(selectedPendingSale.idVenta)} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                👁️ Consultar Comprobante de Venta
              </button>
            </div>
          )}
          <div className="commercial-form-grid"><label>{t('installmentAmount')} *<input required type="number" min="0.01" max={selectedPendingSale?.pendingBalance} step="0.01" value={amountPaid} onChange={event => setAmountPaid(event.target.value)} placeholder="0.00" /></label><label>{t('paymentMethod')} *<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}><option value="Cash">{t('cash')}</option><option value="Card">{t('card')}</option><option value="Transfer">{t('transfer')}</option></select></label></div>
          <label>{t('notes')}<textarea rows={2} maxLength={500} value={paymentNotes} onChange={event => setPaymentNotes(event.target.value)} placeholder={t('installmentNotesPlaceholder')} /></label>
          <button className="action-btn" disabled={saving || !saleIdVenta}>{saving ? t('processing') : t('registerInstallment')}</button>
        </form>
        {installments.length > 0 && <div className="commercial-history" style={{ marginTop: '16px' }}>
          <h3>{t('installmentHistory')}</h3>
          {installments.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--background-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)', margin: '6px 0' }}>
              <div>
                <b style={{ display: 'block', color: 'var(--primary-main)' }}>{item.receiptNumber}</b>
                <small style={{ color: 'var(--text-secondary)' }}>{dateTime.format(parseUtcDate(item.createdAtUtc))}</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ color: '#2b8a3e', display: 'block' }}>{money.format(item.amountPaid)}</strong>
                <small style={{ color: 'var(--text-secondary)' }}>{t('remainingBalance', { balance: money.format(item.newPendingBalance) })}</small>
              </div>
              <button type="button" className="pos-link-btn" onClick={() => void viewReceiptForSale(...paymentReceiptArguments(item))}>👁️ Recibo</button>
            </div>
          ))}
        </div>}
        <div className="commercial-global-history">
          <div className="commercial-section-heading"><h3>{showTransactions ? '💳 Histórico de Transacciones y Movimientos de Pago' : t('globalInstallmentHistory')}</h3><ExportButtons data={installmentHistory} config={installmentExportConfig} onLoadAllData={kind => loadAllPagesForExport(kind, paging => commercialService.getInstallmentHistory({
            search: appliedHistoryFilters.search || undefined,
            customerId: appliedHistoryFilters.customerId || undefined,
            paymentMethod: appliedHistoryFilters.paymentMethod || undefined,
            startDate: toOperationalUtcBoundary(appliedHistoryFilters.startDate),
            endDate: toOperationalUtcBoundary(appliedHistoryFilters.endDate, true)
          }, paging))} /></div>
          <form className="commercial-history-filters" onSubmit={filterInstallmentHistory} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <input value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder={t('searchInstallments')} />
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
            <label style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', fontWeight: 600 }}><span>{t('startDate')}</span><input type="date" max={historyEndDate || undefined} value={historyStartDate} onChange={event => setHistoryStartDate(event.target.value)} /></label>
            <label style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', fontWeight: 600 }}><span>{t('endDate')}</span><input type="date" min={historyStartDate || undefined} value={historyEndDate} onChange={event => setHistoryEndDate(event.target.value)} /></label>
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
                        <td><strong>{t('saleNumber', { idVenta: item.idVenta })}</strong></td>
                        <td><code>{item.referenceNumber}</code></td>
                        <td>{dateTime.format(parseUtcDate(item.createdAtUtc))}</td>
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
                          <button type="button" className="pos-link-btn" onClick={() => void viewReceiptForSale(...paymentReceiptArguments(item))}>
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
                        <td><strong>{t('saleNumber', { idVenta: item.idVenta })}</strong></td>
                        <td><code>{item.receiptNumber}</code></td>
                        <td>{dateTime.format(parseUtcDate(item.createdAtUtc))}</td>
                        <td>
                          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {item.paymentMethod === 'Cash' ? '💵 Efectivo' : item.paymentMethod === 'Card' ? '💳 Tarjeta' : '🏦 SPEI'}
                          </span>
                        </td>
                        <td><strong>{money.format(item.amountPaid)}</strong></td>
                        <td>{money.format(item.newPendingBalance)}</td>
                        <td><small>{item.userUsername || '—'}</small></td>
                        <td>
                          <button type="button" className="pos-link-btn" onClick={() => void viewReceiptForSale(...paymentReceiptArguments(item))}>
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

      {showReturns && <article className="commercial-card"><header><div><h2>↩️ {t('returnHistory')}</h2><p>{t('returnHistoryHint')}</p></div><div className="commercial-section-actions"><strong>{returns.length}</strong><ExportButtons data={returns} config={returnExportConfig} onLoadAllData={kind => loadAllPagesForExport(kind, paging => commercialService.getReturns(undefined, paging))} /></div></header>{returns.length === 0 ? <div className="commercial-empty">{t('noReturns')}</div> : <div className="commercial-history-table-wrap" style={{ overflowX: 'auto', marginTop: '12px' }}>
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
                <td><strong>{t('saleNumber', { idVenta: item.idVenta })}</strong></td>
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

    {returnOpen && <Modal title={t('processReturnTitle')} onClose={() => setReturnOpen(false)}><form className="commercial-form" onSubmit={processReturn}><label>{t('originalSale')} *<select required value={returnIdVenta} onChange={event => selectReturnSale(event.target.value)}><option value="">{t('selectOriginalSale')}</option>{eligibleSales.map(sale => <option key={sale.idVenta} value={sale.idVenta}>{t('saleNumber', { idVenta: sale.idVenta })} — {sale.customerDisplayName || t('generalPublic')}</option>)}</select></label>{selectedReturnSale && <div className="commercial-return-items">{selectedReturnSale.items.map(item => { const remaining = remainingQuantity(item.productId, item.quantity); return <label key={item.id}><span>{item.productSku} — {item.productName}<small>{t('returnAvailable', { quantity: remaining })}</small></span><input type="number" min="0" max={remaining} step="0.0001" value={returnQuantities[item.productId] ?? ''} onChange={event => setReturnQuantities(current => ({ ...current, [item.productId]: event.target.value }))} placeholder="0" /></label>; })}</div>}<label>{t('refundMethod')} *<select value={refundMethod} onChange={event => setRefundMethod(event.target.value as typeof refundMethod)}><option value="StoreCredit">{t('storeCredit')}</option><option value="Cash">{t('cash')}</option><option value="Card">{t('card')}</option><option value="Transfer">{t('transfer')}</option></select></label><label>{t('returnReason')} *<textarea required rows={3} maxLength={500} value={returnReason} onChange={event => setReturnReason(event.target.value)} placeholder={t('returnReasonPlaceholder')} /></label><footer><button type="button" className="lang-btn" onClick={() => setReturnOpen(false)}>{t('cancel')}</button><button className="commercial-danger-btn" disabled={saving}>{saving ? t('processing') : t('confirmReturn')}</button></footer></form></Modal>}

    {previewOpen && <Modal title={t('contractPreview')} onClose={() => setPreviewOpen(false)}>
      <div className="commercial-preview-controls">
        <label>{t('relatedSale')}
          <select value={contractIdVenta} onChange={event => setContractIdVenta(event.target.value)}>
            <option value="">{t('withoutRelatedSale')}</option>
            {[...pendingSales, ...eligibleSales].filter((sale, index, all) => all.findIndex(item => item.idVenta === sale.idVenta) === index).map(sale => (
              <option key={sale.idVenta} value={sale.idVenta}>{t('saleNumber', { idVenta: sale.idVenta })} — {sale.customerDisplayName}</option>
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

    {receiptSale && <SaleReceiptModal sale={receiptSale} targetPaymentId={receiptTargetPaymentId} cutoffDate={receiptCutoffDate} onClose={() => { setReceiptSale(null); setReceiptTargetPaymentId(undefined); setReceiptCutoffDate(undefined); }} />}
  </section>;
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => <div className="commercial-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="commercial-modal" role="dialog" aria-modal="true"><header><h2>{title}</h2><button aria-label="Cerrar" onClick={onClose}>×</button></header>{children}</div></div>;
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const refundMethodKey = (method: string) => ({ Cash: 'cash', Card: 'card', Transfer: 'transfer', StoreCredit: 'storeCredit' } as Record<string, string>)[method] ?? method;
const paymentMethodLabel = (method: string) => ({ Cash: 'Efectivo', Card: 'Tarjeta', Transfer: 'SPEI', StoreCredit: 'Crédito en tienda' } as Record<string, string>)[method] ?? method;
const transactionTypeLabel = (type: string) => ({ Advance: 'Anticipo inicial', Sale: 'Pago de venta', Installment: 'Abono a saldo' } as Record<string, string>)[type] ?? type;
const templateCategoryKey = (category: string) => ({ ContratoVenta: 'saleContract', ContratoApartado: 'depositContract', ReciboAbono: 'installmentReceipt' } as Record<string, string>)[category] ?? category;
const renderTemplate = (content: string, sale?: Venta) => {
  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const replacements: Record<string, string> = {
    '{{FOLIO}}': sale ? String(sale.idVenta) : '{{FOLIO}}',
    '{{CLIENTE}}': sale?.customerDisplayName ?? '{{CLIENTE}}',
    '{{TOTAL}}': sale ? currency.format(sale.totalAmount) : '{{TOTAL}}',
    '{{SALDO}}': sale ? currency.format(sale.pendingBalance) : '{{SALDO}}',
    '{{FECHA}}': new Intl.DateTimeFormat('es-MX').format(new Date()),
    '{{VENDEDOR}}': sale?.userUsername ?? 'Vendedor WPC Bajío'
  };
  return Object.entries(replacements).reduce((text, [token, value]) => text.split(token).join(value), content);
};

export default CommercialOpsPage;
