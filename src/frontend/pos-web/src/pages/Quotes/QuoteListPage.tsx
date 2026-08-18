import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { cashShiftService } from '../../services/cashShiftService';
import { commercialService } from '../../services/commercialService';
import { ConvertQuoteRequest, CreateQuoteRequest, Quote, QuoteOptions } from '../../types/commercial';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { loadAllPagesForExport } from '../../utils/pagedExport';
import './QuoteListPage.css';

type QuoteLine = { productId: string; quantity: string };
type PaymentType = ConvertQuoteRequest['paymentType'];

export const QuoteListPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [options, setOptions] = useState<QuoteOptions>({ products: [], customers: [] });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ search: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [validityDays, setValidityDays] = useState('15');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<QuoteLine[]>([{ productId: '', quantity: '1' }]);
  const [conversionQuote, setConversionQuote] = useState<Quote | null>(null);
  const [viewQuote, setViewQuote] = useState<Quote | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('FullPayment');

  const [cash, setCash] = useState('');
  const [card, setCard] = useState('');
  const [transfer, setTransfer] = useState('');

  const canDiscount = hasPermission('ventas', 'descuento');
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }), [locale]);
  const date = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }), [locale]);

  const exportConfig = useMemo<ExportReportConfig<Quote>>(() => ({
    moduleName: t('quotesManagement'),
    title: 'Histórico de Cotizaciones',
    fileName: 'Cotizaciones',
    sheetName: 'Cotizaciones',
    orientation: 'landscape',
    filters: [
      { label: 'Búsqueda', value: appliedFilters.search },
      { label: 'Estado', value: appliedFilters.status || 'Todos' }
    ],
    columns: [
      { key: 'folio', label: 'Cotización', width: 0.9, value: quote => quote.quoteNumber },
      { key: 'customer', label: 'Cliente', width: 1.5, value: quote => quote.customerDisplayName || t('generalPublic') },
      { key: 'products', label: 'Productos', type: 'number', width: 0.7, value: quote => quote.items.length },
      { key: 'created', label: 'Fecha de creación', type: 'datetime', width: 1.15, value: quote => quote.createdAtUtc },
      { key: 'expiration', label: 'Vencimiento', type: 'date', width: 1, value: quote => quote.expirationDateUtc },
      { key: 'subtotal', label: 'Subtotal', type: 'currency', width: 0.9, value: quote => quote.subTotal },
      { key: 'discount', label: 'Descuento', type: 'currency', width: 0.9, value: quote => quote.discountAmount },
      { key: 'tax', label: 'IVA', type: 'currency', width: 0.8, value: quote => quote.taxAmount },
      { key: 'total', label: 'Total', type: 'currency', width: 0.9, value: quote => quote.totalAmount },
      { key: 'status', label: 'Estado', width: 0.8, value: quote => t(quoteStatusKey(quote.status)) },
      { key: 'user', label: 'Usuario', width: 0.9, value: quote => quote.userUsername || '—' }
    ]
  }), [appliedFilters, t]);

  const load = async () => {
    try {
      setLoading(true);
      const [quoteData, optionData] = await Promise.all([
        commercialService.getQuotes(search.trim() || undefined, status || undefined),
        commercialService.getQuoteOptions()
      ]);
      setQuotes(quoteData);
      setOptions(optionData);
      setAppliedFilters({ search: search.trim(), status });
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('quoteLoadError')) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selectedCustomer = options.customers.find(customer => customer.id === customerId);
  const quoteSubtotal = lines.reduce((total, line) => {
    const product = options.products.find(item => item.id === line.productId);
    const quantity = Number(line.quantity || 0);
    if (!product || quantity <= 0) return total;
    const isWholesale = selectedCustomer?.customerType.toLowerCase() === 'mayorista' ||
      (product.wholesaleMinQuantity > 0 && quantity >= product.wholesaleMinQuantity);
    const unitPrice = isWholesale && product.wholesalePrice > 0 ? product.wholesalePrice : product.unitPrice;
    return total + quantity * unitPrice;
  }, 0);

  const customerDiscount = Math.round(quoteSubtotal * Math.min(100, Math.max(0, selectedCustomer?.specialDiscountPercentage ?? 0)) / 100 * 100) / 100;
  const requestedDiscount = canDiscount ? Number(discount || 0) : 0;
  const appliedDiscount = Math.max(customerDiscount, Number.isFinite(requestedDiscount) ? requestedDiscount : 0);
  const quoteTax = Math.round(quoteSubtotal * 0.16 * 100) / 100;
  const quoteTotal = Math.max(0, quoteSubtotal - appliedDiscount + quoteTax);

  const changeLineQuantity = (index: number, delta: number) => {
    setLines(current => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      const currentQty = Math.max(0, parseInt(line.quantity || '0', 10) || 0);
      const newQty = Math.max(1, currentQty + delta);
      return { ...line, quantity: newQty.toString() };
    }));
  };

  const openCreate = () => {
    setCustomerId('');
    setValidityDays('15');
    setDiscount('');
    setNotes('');
    setLines([{ productId: '', quantity: '1' }]);
    setNotice(null);
    setCreateOpen(true);
  };

  const saveQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedLines = lines
      .map(line => ({ productId: line.productId, quantity: Number(line.quantity) }))
      .filter(line => line.productId && line.quantity > 0);
    if (!customerId) {
      setNotice({ type: 'error', text: t('selectCustomerRequired') });
      return;
    }
    if (parsedLines.length === 0) {
      setNotice({ type: 'error', text: t('addAtLeastOneQuoteItem') });
      return;
    }

    try {
      setSaving(true);
      const request: CreateQuoteRequest = {
        customerId,
        validityDays: Number(validityDays),
        discountAmount: appliedDiscount,
        notes,
        items: parsedLines.map(line => {
          const prod = options.products.find(p => p.id === line.productId);
          return {
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: prod?.unitPrice ?? 0,
            discountAmount: 0
          };
        })
      };
      const created = await commercialService.createQuote(request);
      setCreateOpen(false);
      await load();
      setNotice({ type: 'success', text: t('quoteCreatedSuccess', { folio: created.quoteNumber }) });
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('quoteSaveError')) });
    } finally {
      setSaving(false);
    }
  };

  const openConversion = async (quote: Quote) => {
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
    setConversionQuote(quote);
    setPaymentType('FullPayment');
    setCash('');
    setCard('');
    setTransfer('');
    setNotice(null);
  };

  const convertQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!conversionQuote) return;
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

    const cashNum = Number(cash || 0);
    const cardNum = Number(card || 0);
    const transferNum = Number(transfer || 0);
    const advanceAmount = paymentType === 'AdvanceDeposit' ? cashNum : conversionQuote.totalAmount;
    const request: ConvertQuoteRequest = {
      paymentType,
      advanceAmount,
      cashAmount: paymentType === 'FullPayment' ? conversionQuote.totalAmount : cashNum,
      cardAmount: cardNum,
      transferAmount: transferNum
    };

    try {
      setSaving(true);
      const sale = await commercialService.convertQuoteToSale(conversionQuote.id, request);
      setConversionQuote(null);
      await load();
      setNotice({ type: 'success', text: t('quoteConvertedSuccess', { idVenta: sale.idVenta }) });
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('quoteConvertError')) });
    } finally {
      setSaving(false);
    }
  };

  return <section className="quotes-page">
    <header className="quotes-header"><div><h1>📑 {t('quotesManagement')}</h1><p>{t('quotesSubtitle')}</p></div><div className="quotes-header-actions"><ExportButtons data={quotes} config={exportConfig} onLoadAllData={kind => loadAllPagesForExport(kind, paging => commercialService.getQuotes(appliedFilters.search || undefined, appliedFilters.status || undefined, paging))} /><button className="action-btn" onClick={openCreate}>➕ {t('newQuote')}</button></div></header>
    <form className="quotes-filters" onSubmit={event => { event.preventDefault(); void load(); }}>
      <input className="form-control" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('searchQuotesPlaceholder')} />
      <select className="form-control" value={status} onChange={event => setStatus(event.target.value)}><option value="">{t('allStatuses')}</option><option value="Activa">{t('statusActive')}</option><option value="Convertida">{t('statusConverted')}</option><option value="Expirada">{t('statusExpired')}</option><option value="Cancelada">{t('statusCancelled')}</option></select>
      <button className="lang-btn">🔎 {t('search')}</button>
    </form>
    {notice && <div className={`quotes-notice quotes-notice--${notice.type}`} role="alert">{notice.text}</div>}
    <article className="quotes-card">{loading ? <div className="quotes-empty">{t('loading')}</div> : quotes.length === 0 ? <div className="quotes-empty">{t('noQuotes')}</div> : <div className="quotes-table-wrap"><table><thead><tr><th>{t('quoteNumber')}</th><th>{t('customer')}</th><th>{t('quotedProducts')}</th><th>{t('quoteCreationDate') || 'Fecha Inicio'}</th><th>{t('expirationDate')}</th><th>{t('total')}</th><th>{t('status')}</th><th>{t('actions')}</th></tr></thead><tbody>{quotes.map(quote => <tr key={quote.id}>
      <td><strong>{quote.quoteNumber}</strong></td>
      <td>{quote.customerDisplayName || t('generalPublic')}</td>
      <td><small style={{ color: 'var(--primary-main)', fontWeight: 600 }}>{quote.items.length} {t('quoteItems')}</small></td>
      <td>{date.format(new Date(quote.createdAtUtc))}</td>
      <td>{date.format(new Date(quote.expirationDateUtc))}</td>
      <td><strong>{money.format(quote.totalAmount)}</strong></td>
      <td><span className={`quotes-status quotes-status--${quote.status.toLowerCase()}`}>{t(quoteStatusKey(quote.status))}</span></td>
      <td>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="pos-link-btn" onClick={() => setViewQuote(quote)}>👁️ {t('viewQuote')}</button>
          {quote.status === 'Activa' && <button type="button" className="pos-link-btn" onClick={() => openConversion(quote)}>⚡ {t('convertAndCharge')}</button>}
        </div>
      </td>
    </tr>)}</tbody></table></div>}</article>

    {viewQuote && <Modal title={`📑 ${viewQuote.quoteNumber}`} onClose={() => setViewQuote(null)}>
      <div className="quotes-form">
        <div className="quotes-conversion-total">
          <span>{t('customer')}</span><b>{viewQuote.customerDisplayName || t('generalPublic')}</b>
          <span>{t('quoteCreationDate') || 'Fecha Inicio'}</span><b>{date.format(new Date(viewQuote.createdAtUtc))}</b>
          <span>{t('expirationDate')}</span><b>{date.format(new Date(viewQuote.expirationDateUtc))}</b>
          <span>Estado / Modalidad</span><b><span className={`badge ${viewQuote.status === 'Convertida' ? 'badge-success' : 'badge-info'}`}>{viewQuote.status === 'Convertida' && (viewQuote.advanceAmount ?? 0) > 0 ? 'Convertida (Apartado)' : viewQuote.status}</span></b>
        </div>
        <div className="quotes-lines" style={{ marginTop: '12px', width: '100%', boxSizing: 'border-box' }}>
          <header><strong>{t('quotedProducts')}</strong></header>
          <div style={{ width: '100%', overflowX: 'auto', marginTop: '8px' }}>
            <table className="customers-table" style={{ width: '100%', minWidth: '450px' }}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>{t('quantity')}</th>
                  <th>Precio Unit.</th>
                  <th>{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {viewQuote.items.map(item => (
                  <tr key={item.id}>
                    <td><code>{item.productSku}</code></td>
                    <td>{item.productName}</td>
                    <td><strong>{item.quantity} {item.unitOfMeasure}</strong></td>
                    <td>{money.format(item.unitPrice)}</td>
                    <td><strong>{money.format(item.totalPrice)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {viewQuote.notes && <div style={{ marginTop: '12px', padding: '10px', background: 'var(--background-container)', borderRadius: '6px' }}><strong>{t('notes')}:</strong> <p style={{ margin: '4px 0 0' }}>{viewQuote.notes}</p></div>}
        <div className="quotes-summary" style={{ marginTop: '16px' }}>
          <span>{t('subtotal')}<b>{money.format(viewQuote.subTotal)}</b></span>
          {viewQuote.discountAmount > 0 && <span>Descuento Aplicado<b>-{money.format(viewQuote.discountAmount)}</b></span>}
          <span>{t('tax')}<b>{money.format(viewQuote.taxAmount)}</b></span>
          <span>{t('total')}<b>{money.format(viewQuote.totalAmount)}</b></span>
          {(viewQuote.advanceAmount ?? 0) > 0 && <span style={{ color: '#16a34a', fontWeight: 600 }}>Anticipo Inicial<b>-{money.format(viewQuote.advanceAmount!)}</b></span>}
          {(viewQuote.pendingBalance ?? 0) > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>Monto Restante<b>{money.format(viewQuote.pendingBalance!)}</b></span>}
        </div>
        <footer>
          <button type="button" className="action-btn" onClick={() => setViewQuote(null)}>{t('closeEvidence')}</button>
        </footer>
      </div>
    </Modal>}

    {createOpen && <Modal title={t('newQuoteTitle')} onClose={() => setCreateOpen(false)}><form onSubmit={saveQuote} className="quotes-form">
      <div className="quotes-form-grid"><label>{t('customer')} *<select required value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="" disabled>{t('selectCustomerRequired')}</option>{options.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.displayName}</option>)}</select></label><label>{t('validityDays')} *<input required type="number" min="1" max="90" value={validityDays} onChange={event => setValidityDays(event.target.value)} /></label></div>
      <div className="quotes-lines"><header><strong>{t('quoteProducts')}</strong><button type="button" className="pos-link-btn" onClick={() => setLines(current => [...current, { productId: '', quantity: '1' }])}>➕ {t('addLine')}</button></header>{lines.map((line, index) => {
        const selectedProduct = options.products.find(product => product.id === line.productId);
        return <div className="quotes-line" key={index}>
          <div className="quotes-product-preview">{selectedProduct?.imageUrl ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} /> : <span>📷</span>}</div>
          <select required value={line.productId} onChange={event => setLines(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, productId: event.target.value } : item))}><option value="">{t('selectProductPlaceholder')}</option>{options.products.map(product => <option key={product.id} value={product.id}>{product.sku} — {product.name}</option>)}</select>
          <div className="quotes-quantity-control"><button type="button" onClick={() => changeLineQuantity(index, -1)}>−</button><input required type="number" min="1" step="1" value={line.quantity} onChange={event => setLines(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} placeholder="0" /><button type="button" onClick={() => changeLineQuantity(index, 1)}>+</button></div>
          {lines.length > 1 && <button type="button" onClick={() => setLines(current => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>}
        </div>;
      })}</div>
      {canDiscount && <label>{t('manualDiscount')}<input type="number" min="0" max={quoteSubtotal} step="0.01" value={discount} onChange={event => setDiscount(event.target.value)} placeholder="0.00" />{customerDiscount > 0 && <small>{t('customerDiscountApplied', { discount: money.format(customerDiscount) })}</small>}</label>}
      <label>{t('notes')}<textarea rows={3} maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} placeholder={t('quoteNotesPlaceholder')} /></label>
      <div className="quotes-summary"><span>{t('subtotal')}<b>{money.format(quoteSubtotal)}</b></span><span>{t('tax')}<b>{money.format(quoteTax)}</b></span><span>{t('total')}<b>{money.format(quoteTotal)}</b></span></div>
      <footer><button type="button" className="lang-btn" onClick={() => setCreateOpen(false)}>{t('cancel')}</button><button className="action-btn" disabled={saving}>{saving ? t('saving') : t('saveQuote')}</button></footer>
    </form></Modal>}

    {conversionQuote && <Modal title={t('convertQuoteTitle', { folio: conversionQuote.quoteNumber })} onClose={() => setConversionQuote(null)}><form onSubmit={convertQuote} className="quotes-form">
      <div className="quotes-conversion-total"><span>{t('customer')}</span><b>{conversionQuote.customerDisplayName || t('generalPublic')}</b><span>{t('total')}</span><strong>{money.format(conversionQuote.totalAmount)}</strong></div>
      <label>{t('paymentType')}<select value={paymentType} onChange={event => { setPaymentType(event.target.value as PaymentType); setCash(''); setCard(''); setTransfer(''); }}><option value="FullPayment">{t('cashFullPayment')}</option><option value="MixedPayment">{t('mixedPayment')}</option><option value="AdvanceDeposit">{t('advanceDeposit')}</option></select></label>
      {paymentType === 'MixedPayment' && <div className="quotes-form-grid"><label>{t('cash')}<input type="number" min="0" step="0.01" value={cash} onChange={event => setCash(event.target.value)} placeholder="0.00" /></label><label>{t('card')}<input type="number" min="0" step="0.01" value={card} onChange={event => setCard(event.target.value)} placeholder="0.00" /></label><label>{t('transfer')}<input type="number" min="0" step="0.01" value={transfer} onChange={event => setTransfer(event.target.value)} placeholder="0.00" /></label></div>}
      {paymentType === 'AdvanceDeposit' && <label>{t('advanceAmount')} *<input required type="number" min="0.01" max={conversionQuote.totalAmount - .01} step="0.01" value={cash} onChange={event => setCash(event.target.value)} placeholder="0.00" /></label>}
      <footer><button type="button" className="lang-btn" onClick={() => setConversionQuote(null)}>{t('cancel')}</button><button className="action-btn" disabled={saving}>{saving ? t('processing') : t('confirmConversion')}</button></footer>
    </form></Modal>}
  </section>;
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => <div className="quotes-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="quotes-modal" role="dialog" aria-modal="true"><header><h2>{title}</h2><button aria-label="Cerrar" onClick={onClose}>×</button></header>{children}</div></div>;
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const quoteStatusKey = (status: string) => ({ Activa: 'statusActive', Convertida: 'statusConverted', Expirada: 'statusExpired', Cancelada: 'statusCancelled', Procesando: 'processing' } as Record<string, string>)[status] ?? status;

export default QuoteListPage;
