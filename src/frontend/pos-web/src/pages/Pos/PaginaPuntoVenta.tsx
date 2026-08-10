import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { cashShiftService } from '../../services/cashShiftService';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { ElementoCarrito, servicioVentas } from '../../services/servicioVentas';
import { Cliente, Producto } from '../../types/tiposCatalogo';
import { ResumenVentas, Venta } from '../../types/tiposVentas';
import SaleReceiptModal from '../Sales/SaleReceiptModal';
import './PaginaPuntoVenta.css';

type PaymentType = 'FullPayment' | 'CardPayment' | 'AdvanceDeposit' | 'MixedPayment';
type Notice = { type: 'success' | 'error'; text: string } | null;

export const PaginaPuntoVenta: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Producto[]>([]);
  const [customers, setCustomers] = useState<Cliente[]>([]);
  const [salesSummary, setSalesSummary] = useState<ResumenVentas | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [cart, setCart] = useState<ElementoCarrito[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>('FullPayment');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [manualDiscount, setManualDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [receipt, setReceipt] = useState<Venta | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [hasOpenShift, setHasOpenShift] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const canDiscount = hasPermission('ventas', 'descuento');
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }), [locale]);

  const loadData = async () => {
    try {
      setLoading(true);
      setNotice(null);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const startDateIso = `${year}-${month}-${day}T00:00:00.000Z`;
      const endDateIso = `${year}-${month}-${day}T23:59:59.999Z`;

      const [catalog, customerDirectory, summary, currentShift] = await Promise.all([
        servicioCatalogo.getProducts(),
        servicioCatalogo.getCustomers(),
        servicioVentas.getSalesSummary(undefined, undefined, undefined, startDateIso, endDateIso),
        cashShiftService.getCurrentShift().catch(() => null)
      ]);
      setProducts(catalog.filter(product => product.isActive));
      setCustomers(customerDirectory);
      setSalesSummary(summary);
      const isShiftOpen = Boolean(currentShift && currentShift.status === 'Abierto');
      setHasOpenShift(isShiftOpen);
      if (!isShiftOpen) {
        setNotice({ type: 'error', text: t('noOpenShiftBanner') });
      }
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('posLoadError')) });
    } finally {
      setLoading(false);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useBarcodeScanner({ onScan: scannedCode => findAndAddProduct(scannedCode) });

  const selectedCustomer = customers.find(customer => customer.id === selectedCustomerId);
  const isWholesaleCustomer = selectedCustomer?.customerType.toLocaleLowerCase() === 'mayorista';
  const effectivePrice = (product: Producto, quantity: number) =>
    product.wholesalePrice > 0 &&
    (isWholesaleCustomer || (product.wholesaleMinQuantity > 0 && quantity >= product.wholesaleMinQuantity))
      ? product.wholesalePrice
      : product.unitPrice;

  const subtotal = cart.reduce((total, item) => total + item.quantity * effectivePrice(item.product, item.quantity), 0);
  const customerDiscount = Math.round(subtotal * Math.min(100, Math.max(0, selectedCustomer?.specialDiscountPercentage ?? 0)) / 100 * 100) / 100;
  const requestedDiscount = canDiscount ? Number(manualDiscount || 0) : 0;
  const appliedDiscount = Math.max(customerDiscount, Number.isFinite(requestedDiscount) ? requestedDiscount : 0);
  const taxableBase = Math.max(0, subtotal - appliedDiscount);
  const taxAmount = Math.round(taxableBase * 0.16 * 100) / 100;
  const totalAmount = taxableBase + taxAmount;
  const coverage = cart.reduce((total, item) => total + item.quantity * (item.product.coveragePerUnitSqM || 0), 0);

  const findAndAddProduct = (code: string) => {
    const term = code.trim().toLocaleLowerCase();
    if (!term) return;
    const product = products.find(item => item.barcode.toLocaleLowerCase() === term || item.sku.toLocaleLowerCase() === term);
    if (!product) {
      setNotice({ type: 'error', text: t('productCodeNotFound', { code }) });
      return;
    }
    addProductToCart(product);
  };

  const addProductToCart = (product: Producto) => {
    if (product.isQuoteOnly) {
      setNotice({ type: 'error', text: t('quoteOnlyProduct', { product: product.name }) });
      return;
    }
    if (product.availableQuantity <= 0) {
      setNotice({ type: 'error', text: t('productOutOfStock', { product: product.name }) });
      return;
    }
    const existing = cart.find(item => item.product.id === product.id);
    if (existing && existing.quantity + 1 > product.availableQuantity) {
      setNotice({ type: 'error', text: t('stockLimitReached', { quantity: product.availableQuantity }) });
      return;
    }
    setCart(current => existing
      ? current.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...current, { product, quantity: 1 }]);
    setNotice(null);
  };

  const updateQuantity = (productId: string, rawValue: string) => {
    if (rawValue === '') return;
    const quantity = Number(rawValue);
    const item = cart.find(current => current.product.id === productId);
    if (!item || !Number.isFinite(quantity) || !Number.isInteger(quantity)) return;
    if (quantity <= 0) {
      setCart(current => current.filter(entry => entry.product.id !== productId));
      return;
    }
    if (quantity > item.product.availableQuantity) {
      setNotice({ type: 'error', text: t('stockLimitReached', { quantity: item.product.availableQuantity }) });
      return;
    }
    setCart(current => current.map(entry => entry.product.id === productId ? { ...entry, quantity } : entry));
  };

  const changeQuantity = (productId: string, delta: number) => {
    const item = cart.find(current => current.product.id === productId);
    if (!item) return;
    updateQuantity(productId, String(item.quantity + delta));
  };

  const selectPaymentType = (nextType: PaymentType) => {
    setPaymentType(nextType);
    setCashAmount('');
    setCardAmount('');
    setTransferAmount('');
    if (nextType === 'AdvanceDeposit' && !selectedCustomerId) setCustomerModalOpen(true);
  };

  const submitManualCode = (event: React.FormEvent) => {
    event.preventDefault();
    findAndAddProduct(manualCode);
    setManualCode('');
    searchInputRef.current?.focus();
  };

  const processSale = async () => {
    if (!hasOpenShift) {
      setNotice({ type: 'error', text: t('noOpenShiftSaleBlocked') });
      return;
    }
    if (cart.length === 0) {
      setNotice({ type: 'error', text: t('emptyCartHint') });
      return;
    }
    if (appliedDiscount > subtotal) {
      setNotice({ type: 'error', text: t('discountAboveSubtotal') });
      return;
    }

    const cash = paymentType === 'FullPayment' ? totalAmount : paymentType === 'CardPayment' ? 0 : Number(cashAmount || 0);
    const card = paymentType === 'CardPayment' ? totalAmount : (paymentType === 'MixedPayment' ? Number(cardAmount || 0) : 0);
    const transfer = paymentType === 'MixedPayment' ? Number(transferAmount || 0) : 0;
    if (paymentType === 'MixedPayment' && Math.abs(cash + card + transfer - totalAmount) > 0.01) {
      setNotice({ type: 'error', text: t('mixedPaymentMismatch', { total: money.format(totalAmount) }) });
      return;
    }
    if (paymentType === 'AdvanceDeposit') {
      if (!selectedCustomerId) {
        setCustomerModalOpen(true);
        return;
      }
      if (cash <= 0 || cash >= totalAmount) {
        setNotice({ type: 'error', text: t('invalidDepositAmount', { total: money.format(totalAmount) }) });
        return;
      }
    }

    try {
      setProcessing(true);
      setNotice(null);
      const sale = await servicioVentas.procesarVenta({
        customerId: selectedCustomerId || undefined,
        paymentType: paymentType === 'CardPayment' ? 'MixedPayment' : paymentType,
        discountAmount: canDiscount ? Number(manualDiscount || 0) : 0,
        advanceAmount: paymentType === 'AdvanceDeposit' ? cash : totalAmount,
        cashAmount: cash,
        cardAmount: card,
        transferAmount: transfer,
        notes: notes.trim() || t('defaultSaleNote', { coverage: coverage.toFixed(2) }),
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: effectivePrice(item.product, item.quantity),
          discountAmount: 0
        }))
      });
      setReceipt(sale);
      setCart([]);
      setSelectedCustomerId('');
      setPaymentType('FullPayment');
      setCashAmount('');
      setCardAmount('');
      setTransferAmount('');
      setManualDiscount('');
      setNotes('');
      setNotice({ type: 'success', text: t('saleCompleted', { folio: sale.folioNumber }) });
      await loadData();
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('saleProcessError')) });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="pos-loading">{t('loading')}</div>;

  return <section className="pos-page">
    <header className="pos-header">
      <div><h1>🛒 {t('pointOfSaleTitle')}</h1><p>{t('pointOfSaleSubtitle')}</p></div>
      <form className="pos-scanner" onSubmit={submitManualCode}>
        <input ref={searchInputRef} value={manualCode} onChange={event => setManualCode(event.target.value)} placeholder={t('scanOrSearchBarcode')} aria-label={t('scanOrSearchBarcode')} />
        <button className="action-btn" type="submit">{t('search')}</button>
      </form>
    </header>

    {notice && <div className={`pos-notice pos-notice--${notice.type}`} role="alert">{notice.text}</div>}

    <div className="pos-layout">
      <article className="pos-card">
        <div className="pos-card__heading"><div><h2>📦 {t('quickCatalog')}</h2><p>{t('quickCatalogHint')}</p></div><strong>{products.length}</strong></div>
        <div className="pos-products">
          {products.map(product => {
            const unavailable = product.availableQuantity <= 0 || product.isQuoteOnly;
            return <button key={product.id} className={`pos-product ${unavailable ? 'pos-product--unavailable' : ''}`} onClick={() => addProductToCart(product)}>
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span className="pos-product__placeholder">📷</span>}
              <span className="pos-product__details">
                <small>{product.sku}</small><strong>{product.name}</strong>
                <span>{product.coveragePerUnitSqM} m²/{product.unitOfMeasure} · {product.piecesPerBox || 1} {t('piecesPerBoxShort')}</span>
                <b>{money.format(product.unitPrice)}</b>
                <em className={product.availableQuantity > 0 ? '' : 'is-empty'}>{product.isQuoteOnly ? t('quoteOnly') : t('availableStock', { quantity: product.availableQuantity })}</em>
              </span>
            </button>;
          })}
        </div>
      </article>

      <aside className="pos-card pos-checkout">
        <div className="pos-card__heading"><div><h2>🧾 {t('shoppingCart')}</h2><p>{t('cartItemsCount', { count: cart.length })}</p></div>{cart.length > 0 && <button className="pos-link-btn" onClick={() => setCart([])}>{t('clearCart')}</button>}</div>
        <label className="pos-field">{t('selectCustomer')}
          <select value={selectedCustomerId} onChange={event => setSelectedCustomerId(event.target.value)}>
            <option value="">{t('generalPublic')}</option>
            {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.displayName} ({customer.customerType})</option>)}
          </select>
        </label>

        <div className="pos-cart-list">
          {cart.length === 0 ? <div className="pos-empty">{t('emptyCartHint')}</div> : cart.map(item => {
            const price = effectivePrice(item.product, item.quantity);
            return <div className="pos-cart-item" key={item.product.id}>
              {item.product.imageUrl && <img src={item.product.imageUrl} alt="" />}
              <div>
                <small className="pos-cart-item__sku">{item.product.sku}</small>
                <strong>{item.product.name}</strong>
                <small>{item.product.unitOfMeasure} · {money.format(price)} · {(item.quantity * item.product.coveragePerUnitSqM).toFixed(2)} m²</small>
              </div>
              <div className="pos-quantity-control">
                <button type="button" onClick={() => changeQuantity(item.product.id, -1)} aria-label={t('decreaseQuantity')}>−</button>
                <input type="number" min="1" max={item.product.availableQuantity} step="1" value={item.quantity} aria-label={t('quantityForProduct', { product: item.product.name })} onFocus={event => event.currentTarget.select()} onChange={event => updateQuantity(item.product.id, event.target.value)} />
                <button type="button" onClick={() => changeQuantity(item.product.id, 1)} aria-label={t('increaseQuantity')}>+</button>
              </div>
              <b>{money.format(item.quantity * price)}</b>
              <button aria-label={t('removeProduct', { product: item.product.name })} onClick={() => setCart(current => current.filter(entry => entry.product.id !== item.product.id))}>×</button>
            </div>;
          })}
        </div>

        <div className="pos-totals">
          <span>{t('subtotal')}<b>{money.format(subtotal)}</b></span>
          {appliedDiscount > 0 && <span className="pos-discount">{t('discount')}<b>-{money.format(appliedDiscount)}</b></span>}
          <span>{t('tax')}<b>{money.format(taxAmount)}</b></span>
          {coverage > 0 && <span>{t('coverage')}<b>{coverage.toFixed(2)} m² <small style={{ fontWeight: 400, color: 'var(--primary-main)' }}>(📦 ~{cart.reduce((sum, item) => sum + Math.ceil(item.quantity / (item.product.piecesPerBox || 9)), 0)} {t('boxesEstimated')})</small></b></span>}
          <span className="pos-total">{t('total')}<b>{money.format(totalAmount)}</b></span>
        </div>

        {canDiscount && <label className="pos-field">{t('manualDiscount')}
          <input type="number" min="0" max={subtotal} step="0.01" value={manualDiscount} onChange={event => setManualDiscount(event.target.value)} placeholder="0.00" />
          {customerDiscount > 0 && <small>{t('customerDiscountApplied', { discount: money.format(customerDiscount) })}</small>}
        </label>}

        <label className="pos-field">{t('paymentType')}
          <select value={paymentType} onChange={event => selectPaymentType(event.target.value as PaymentType)}>
            <option value="FullPayment">{t('cashFullPayment')}</option>
            <option value="CardPayment">💳 Pago total con tarjeta</option>
            <option value="MixedPayment">{t('mixedPayment')}</option>
            <option value="AdvanceDeposit">{t('advanceDeposit')}</option>
          </select>
        </label>

        {paymentType === 'MixedPayment' && <div className="pos-payment-grid">
          <label>{t('cash')}<input type="number" min="0" step="0.01" value={cashAmount} onChange={event => setCashAmount(event.target.value)} placeholder="0.00" /></label>
          <label>{t('card')}<input type="number" min="0" step="0.01" value={cardAmount} onChange={event => setCardAmount(event.target.value)} placeholder="0.00" /></label>
          <label>{t('transfer')}<input type="number" min="0" step="0.01" value={transferAmount} onChange={event => setTransferAmount(event.target.value)} placeholder="0.00" /></label>
        </div>}
        {paymentType === 'AdvanceDeposit' && <label className="pos-field">{t('advanceAmount')} *<input type="number" min="0.01" max={Math.max(0, totalAmount - 0.01)} step="0.01" value={cashAmount} onChange={event => setCashAmount(event.target.value)} placeholder="0.00" /></label>}
        <label className="pos-field">{t('notes')}<textarea rows={2} maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} placeholder={t('saleNotesPlaceholder')} /></label>
        <button className="action-btn pos-process-btn" disabled={processing || cart.length === 0 || !hasOpenShift} onClick={() => void processSale()}>{processing ? t('processing') : t('completeSale')}</button>
      </aside>
    </div>

    {salesSummary && <article className="pos-card pos-daily-summary"><div><span>🧾 {t('todaySalesCount')}</span><strong>{salesSummary.salesCount}</strong></div><div><span>💰 {t('todaySalesTotal')}</span><strong>{money.format(salesSummary.totalAmount)}</strong></div></article>}

    {receipt && <SaleReceiptModal sale={receipt} onClose={() => setReceipt(null)} />}

    {customerModalOpen && <div className="pos-receipt-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) { setCustomerModalOpen(false); setPaymentType('FullPayment'); }
    }}><div className="pos-customer-modal" role="dialog" aria-modal="true" aria-labelledby="deposit-customer-title">
      <h2 id="deposit-customer-title">👤 {t('selectDepositCustomer')}</h2><p>{t('customerRequiredForDeposit')}</p>
      <div className="pos-customer-options">{customers.map(customer => <button type="button" key={customer.id} onClick={() => { setSelectedCustomerId(customer.id); setCustomerModalOpen(false); }}>{customer.displayName}<small>{customer.customerType} · {customer.phone}</small></button>)}</div>
      <button type="button" className="pos-receipt-close" onClick={() => { setCustomerModalOpen(false); setPaymentType('FullPayment'); }}>{t('cancel')}</button>
    </div></div>}
  </section>;
};

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
export default PaginaPuntoVenta;
