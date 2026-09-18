import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { cashShiftService } from '../../services/cashShiftService';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { ElementoCarrito, servicioVentas } from '../../services/servicioVentas';
import { Cliente, Producto, Categoria } from '../../types/tiposCatalogo';
import { resolveProductImageUrl } from '../../services/apiClient';
import { ResumenVentas, Venta } from '../../types/tiposVentas';
import SaleReceiptModal from '../Sales/SaleReceiptModal';
import './PaginaPuntoVenta.css';

type PaymentType = 'FullPayment' | 'CardPayment' | 'AdvanceDeposit' | 'MixedPayment';
type Notice = { type: 'success' | 'error'; text?: string; key?: string; params?: Record<string, unknown> } | null;

const normalizeMacDash = (str: string) =>
  str.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFF0D\uFE63]/g, '-');

const normalizeCode = (val?: string | null): string => {
  if (!val) return '';
  return normalizeMacDash(val.trim().toLowerCase());
};

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
  const [bankReference, setBankReference] = useState('');
  const [isBankRefAlertOpen, setIsBankRefAlertOpen] = useState(false);
  const [manualDiscount, setManualDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const DEFAULT_CATEGORY_ID = '7938934b-d6cb-44fd-98de-b0645c66017d';
  const [categories, setCategories] = useState<Categoria[]>([
    {
      id: DEFAULT_CATEGORY_ID,
      name: 'Lambrin Interior 格栅板',
      slug: 'lambrin-interior',
      description: 'Lambrin Interior 格栅板',
      isActive: true,
      subCategories: []
    }
  ]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(DEFAULT_CATEGORY_ID);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [productDetailModal, setProductDetailModal] = useState<Producto | null>(null);
  const [receipt, setReceipt] = useState<Venta | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    customerType: 'Particular',
    dailyBoxLimit: '0'
  });
  const [savingNewCustomer, setSavingNewCustomer] = useState(false);
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [hasOpenShift, setHasOpenShift] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [calcProductId, setCalcProductId] = useState('');
  const [calcMode, setCalcMode] = useState<'wall' | 'direct'>('wall');
  const [calcHeight, setCalcHeight] = useState('');
  const [calcWidth, setCalcWidth] = useState('');
  const [calcTargetM2, setCalcTargetM2] = useState('');
  const [calcProductSearch, setCalcProductSearch] = useState('');
  const [calcDropdownOpen, setCalcDropdownOpen] = useState(false);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  const [calcRemoteProducts, setCalcRemoteProducts] = useState<Producto[]>([]);

  const canDiscount = hasPermission('ventas', 'descuento');
  const canCreateCustomer = hasPermission('clientes', 'crear');
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }), [locale]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategoryId) {
      list = list.filter(p => p.categoryId === selectedCategoryId);
    }
    if (!cardSearch.trim()) return list;
    const query = normalizeCode(cardSearch);
    const queryNoDashes = query.replace(/-/g, '');

    return list.filter(p => {
      const sku = normalizeCode(p.sku);
      const skuNoDashes = sku.replace(/-/g, '');
      const barcode = normalizeCode(p.barcode);
      const barcodeNoDashes = barcode.replace(/-/g, '');
      const name = p.name.toLowerCase();

      return (
        sku.includes(query) ||
        (queryNoDashes && skuNoDashes.includes(queryNoDashes)) ||
        barcode.includes(query) ||
        (queryNoDashes && barcodeNoDashes.includes(queryNoDashes)) ||
        name.includes(query)
      );
    });
  }, [products, selectedCategoryId, cardSearch]);

  const handleCategoryChange = async (catId: string) => {
    setSelectedCategoryId(catId);
    try {
      setCategoryLoading(true);
      const catalog = await servicioCatalogo.getProducts(undefined, catId || undefined, { page: 1, pageSize: 500 });
      const productItems = Array.isArray(catalog) ? catalog : catalog.items;
      setProducts(productItems.filter(product => product.isActive));
    } catch (err) {
      console.error('Error al filtrar productos por categoría:', err);
    } finally {
      setCategoryLoading(false);
    }
  };

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

      const [catalog, customerDirectory, summary, currentShift, categoryList] = await Promise.all([
        servicioCatalogo.getProducts(undefined, DEFAULT_CATEGORY_ID, { page: 1, pageSize: 500 }),
        servicioCatalogo.getCustomers(undefined, undefined, undefined, { page: 1, pageSize: 500 }),
        servicioVentas.getSalesSummary(undefined, undefined, undefined, startDateIso, endDateIso),
        cashShiftService.getCurrentShift().catch(() => null),
        servicioCatalogo.getCategories(undefined, { page: 1, pageSize: 500 }).catch(() => null)
      ]);
      const productItems = Array.isArray(catalog) ? catalog : catalog.items;
      setProducts(productItems.filter(product => product.isActive));
      const customerItems = Array.isArray(customerDirectory) ? customerDirectory : customerDirectory.items;
      setCustomers(customerItems);
      setSalesSummary(summary);
      const categoryItems = Array.isArray(categoryList) ? categoryList : categoryList?.items ?? [];
      if (categoryItems.length > 0) {
        setCategories(categoryItems.filter(c => c.isActive !== false));
      }
      const isShiftOpen = Boolean(currentShift && currentShift.status === 'Abierto');
      setHasOpenShift(isShiftOpen);
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

  useEffect(() => {
    if (!productDetailModal && !isNewCustomerModalOpen && !isCalculatorModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProductDetailModal(null);
        setIsNewCustomerModalOpen(false);
        setIsCalculatorModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [productDetailModal, isNewCustomerModalOpen, isCalculatorModalOpen]);

  useBarcodeScanner({ onScan: scannedCode => void findAndAddProduct(scannedCode) });

  const selectedCustomer = customers.find(customer => customer.id === selectedCustomerId);
  const isWholesaleCustomer = selectedCustomer?.customerType.toLocaleLowerCase() === 'mayorista';

  const calculateCartItemPricing = (
    product: Producto,
    quantity: number,
    isWholesaleCust: boolean
  ) => {
    const unitPrice = product.unitPrice;
    const wholesalePrice = product.wholesalePrice > 0 ? product.wholesalePrice : unitPrice;
    const isLambrinInterior = product.categoryId === DEFAULT_CATEGORY_ID;
    const ppb = product.piecesPerBox && product.piecesPerBox > 0 ? product.piecesPerBox : 1;

    if (isWholesaleCust) {
      return {
        subtotal: quantity * wholesalePrice,
        isSplitPricing: false,
        boxes: Math.floor(quantity / ppb),
        remPzas: quantity % ppb,
        wholesalePieces: quantity,
        wholesalePrice,
        retailPieces: 0,
        retailPrice: unitPrice,
        effectiveUnitPrice: wholesalePrice,
        ruleApplied: 'customerWholesale'
      };
    }

    if (isLambrinInterior && product.wholesalePrice > 0) {
      const boxes = Math.floor(quantity / ppb);
      const loosePieces = quantity % ppb;

      if (boxes >= 2) {
        return {
          subtotal: quantity * wholesalePrice,
          isSplitPricing: false,
          boxes,
          remPzas: loosePieces,
          wholesalePieces: quantity,
          wholesalePrice,
          retailPieces: 0,
          retailPrice: unitPrice,
          effectiveUnitPrice: wholesalePrice,
          ruleApplied: 'lambrin2BoxesPlus'
        };
      } else if (boxes === 1) {
        const wholesalePieces = ppb;
        const retailPieces = loosePieces;
        const subtotal = (wholesalePieces * wholesalePrice) + (retailPieces * unitPrice);
        return {
          subtotal,
          isSplitPricing: loosePieces > 0,
          boxes,
          remPzas: loosePieces,
          wholesalePieces,
          wholesalePrice,
          retailPieces,
          retailPrice: unitPrice,
          effectiveUnitPrice: subtotal / quantity,
          ruleApplied: 'lambrin1BoxSplit'
        };
      } else {
        return {
          subtotal: quantity * unitPrice,
          isSplitPricing: false,
          boxes,
          remPzas: loosePieces,
          wholesalePieces: 0,
          wholesalePrice,
          retailPieces: quantity,
          retailPrice: unitPrice,
          effectiveUnitPrice: unitPrice,
          ruleApplied: 'lambrinRetail'
        };
      }
    }

    const qualifiesWholesale = wholesalePrice > 0 && product.wholesaleMinQuantity > 0 && quantity >= product.wholesaleMinQuantity;
    const chosenPrice = qualifiesWholesale ? wholesalePrice : unitPrice;
    return {
      subtotal: quantity * chosenPrice,
      isSplitPricing: false,
      boxes: Math.floor(quantity / ppb),
      remPzas: quantity % ppb,
      wholesalePieces: qualifiesWholesale ? quantity : 0,
      wholesalePrice,
      retailPieces: qualifiesWholesale ? 0 : quantity,
      retailPrice: unitPrice,
      effectiveUnitPrice: chosenPrice,
      ruleApplied: qualifiesWholesale ? 'standardWholesale' : 'standardRetail'
    };
  };

  const effectivePrice = (product: Producto, quantity: number) => {
    return calculateCartItemPricing(product, quantity, isWholesaleCustomer).effectiveUnitPrice;
  };

  const getPieceCoverage = (product: Producto): number => {
    if (product.coveragePerUnitSqM && product.coveragePerUnitSqM > 0) return product.coveragePerUnitSqM;
    if (product.boxCoverageSqM && product.piecesPerBox && product.piecesPerBox > 0) {
      return product.boxCoverageSqM / product.piecesPerBox;
    }
    return 0;
  };

  const subtotal = cart.reduce((total, item) => {
    return total + calculateCartItemPricing(item.product, item.quantity, isWholesaleCustomer).subtotal;
  }, 0);

  // Descuento automático del cliente (en porcentaje)
  const customerDiscountPercent = Math.min(100, Math.max(0, selectedCustomer?.specialDiscountPercentage ?? 0));
  const customerDiscountAmount = Math.round(subtotal * (customerDiscountPercent / 100) * 100) / 100;

  // Descuento manual ingresado como PORCENTAJE (0 a 100%)
  const manualDiscountPercent = canDiscount ? Math.min(100, Math.max(0, parseFloat(manualDiscount || '0') || 0)) : 0;
  const manualDiscountAmount = Math.round(subtotal * (manualDiscountPercent / 100) * 100) / 100;

  // Se aplica el descuento mayor (en pesos)
  const appliedDiscount = Math.max(customerDiscountAmount, manualDiscountAmount);
  const effectiveDiscountPercent = subtotal > 0 ? Math.round((appliedDiscount / subtotal) * 1000) / 10 : 0;

  // Base gravable: IVA (16%) aplica sobre el subtotal descontado
  const taxableBase = Math.max(0, subtotal - appliedDiscount);
  const taxAmount = requiresInvoice ? Math.round(taxableBase * 0.16 * 100) / 100 : 0;
  const totalAmount = Math.max(0, taxableBase + taxAmount);
  const coverage = cart.reduce((total, item) => total + item.quantity * getPieceCoverage(item.product), 0);

  // Búsqueda remota de productos para la calculadora de m²
  useEffect(() => {
    if (!isCalculatorModalOpen) return;
    const term = calcProductSearch.trim();
    if (!term) {
      setCalcRemoteProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await servicioCatalogo.getProducts(term, undefined, { page: 1, pageSize: 200 });
        const items = Array.isArray(res) ? res : res.items;
        setCalcRemoteProducts(items.filter(p => p.isActive));
      } catch {
        setCalcRemoteProducts([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [calcProductSearch, isCalculatorModalOpen]);

  const calcFilteredProducts = useMemo(() => {
    const map = new Map<string, Producto>();
    for (const p of products) {
      map.set(p.id, p);
    }
    for (const rp of calcRemoteProducts) {
      if (!map.has(rp.id)) {
        map.set(rp.id, rp);
      }
    }
    const all = Array.from(map.values());
    const cleanSearch = calcProductSearch.trim();
    if (!cleanSearch) return all;

    const selected = all.find(p => p.id === calcProductId);
    if (selected && `${selected.sku} — ${selected.name}`.toLowerCase() === cleanSearch.toLowerCase()) {
      return all;
    }

    const query = normalizeCode(cleanSearch);
    const queryNoDashes = query.replace(/-/g, '');
    return all.filter(p => {
      const sku = normalizeCode(p.sku);
      const skuNoDashes = sku.replace(/-/g, '');
      const barcode = normalizeCode(p.barcode);
      const barcodeNoDashes = barcode.replace(/-/g, '');
      const name = p.name.toLowerCase();
      return (
        sku.includes(query) ||
        (queryNoDashes && skuNoDashes.includes(queryNoDashes)) ||
        barcode.includes(query) ||
        (queryNoDashes && barcodeNoDashes.includes(queryNoDashes)) ||
        name.includes(query)
      );
    });
  }, [products, calcRemoteProducts, calcProductSearch, calcProductId]);

  const selectedCalcProduct = useMemo(() => {
    if (!calcProductId) return null;
    return products.find(p => p.id === calcProductId) || calcRemoteProducts.find(p => p.id === calcProductId) || null;
  }, [calcProductId, products, calcRemoteProducts]);
  const calcPieceCoverage = selectedCalcProduct ? getPieceCoverage(selectedCalcProduct) : 0;
  const calcTargetNum = calcMode === 'wall'
    ? (Number(calcHeight || 0) * Number(calcWidth || 0))
    : (parseFloat(calcTargetM2) || 0);
  const calcNeededPieces = calcPieceCoverage > 0 && calcTargetNum > 0 ? Math.ceil(calcTargetNum / calcPieceCoverage) : 0;
  const calcPpb = selectedCalcProduct?.piecesPerBox && selectedCalcProduct.piecesPerBox > 0 ? selectedCalcProduct.piecesPerBox : 1;
  const calcBoxesEq = Math.ceil(calcNeededPieces / calcPpb);
  const calcRealCoverage = (calcNeededPieces * calcPieceCoverage).toFixed(2);
  const calcPricing = selectedCalcProduct ? calculateCartItemPricing(selectedCalcProduct, calcNeededPieces, isWholesaleCustomer) : null;
  const calcTotalCost = calcPricing ? calcPricing.subtotal : 0;

  const findAndAddProduct = async (code: string) => {
    const term = normalizeCode(code);
    const termNoDashes = term.replace(/-/g, '');
    if (!term) return;
    let product = products.find(item => {
      const b = normalizeCode(item.barcode);
      const bNoDashes = b.replace(/-/g, '');
      return b === term || (termNoDashes && bNoDashes === termNoDashes);
    });

    if (!product) {
      try {
        const fetched = await servicioCatalogo.getProductByCode(term);
        if (fetched && fetched.isActive) {
          const fetchedBarcode = normalizeCode(fetched.barcode);
          const fetchedBarcodeNoDashes = fetchedBarcode.replace(/-/g, '');
          if (fetchedBarcode === term || (termNoDashes && fetchedBarcodeNoDashes === termNoDashes)) {
            product = fetched;
            setProducts(prev => prev.some(p => p.id === fetched.id) ? prev : [fetched, ...prev]);
          }
        }
      } catch {
        // No encontrado en backend
      }
    }

    if (!product) {
      setNotice({ type: 'error', text: t('productCodeNotFound', { code }) });
      return;
    }
    addProductToCart(product, 1);
  };

  const addProductToCart = (product: Producto, qtyToAdd = 1) => {
    if (product.isQuoteOnly) {
      setNotice({ type: 'error', text: t('quoteOnlyProduct', { product: product.name }) });
      return;
    }
    if (product.availableQuantity <= 0) {
      setNotice({ type: 'error', text: t('productOutOfStock', { product: product.name }) });
      return;
    }
    const existing = cart.find(item => item.product.id === product.id);
    const newQty = (existing?.quantity || 0) + qtyToAdd;
    if (newQty > product.availableQuantity) {
      setNotice({ type: 'error', text: t('stockLimitReached', { quantity: product.availableQuantity }) });
      return;
    }
    setCart(current => existing
      ? current.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item)
      : [...current, { product, quantity: qtyToAdd }]);
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
    void findAndAddProduct(manualCode);
    setManualCode('');
    searchInputRef.current?.focus();
  };

  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.firstName.trim() || !newCustomerForm.lastName.trim() || !newCustomerForm.email.trim() || !newCustomerForm.phone.trim()) {
      setNotice({ type: 'error', text: 'Por favor complete todos los campos obligatorios del cliente.' });
      return;
    }
    try {
      setSavingNewCustomer(true);
      const created = await servicioCatalogo.createCustomer({
        firstName: newCustomerForm.firstName.trim(),
        lastName: newCustomerForm.lastName.trim(),
        companyName: newCustomerForm.companyName.trim() || undefined,
        email: newCustomerForm.email.trim(),
        phone: newCustomerForm.phone.trim().replace(/\D/g, ''),
        address: 'N/A',
        city: 'León',
        state: 'Guanajuato',
        postalCode: '37000',
        customerType: newCustomerForm.customerType,
        specialDiscountPercentage: 0,
        dailyBoxLimit: Number(newCustomerForm.dailyBoxLimit || 0),
        notes: 'Cliente registrado desde PDV'
      });
      const updatedCustomers = await servicioCatalogo.getCustomers(undefined, undefined, undefined, { page: 1, pageSize: 500 });
      setCustomers(Array.isArray(updatedCustomers) ? updatedCustomers : updatedCustomers.items);
      setSelectedCustomerId(created.id);
      setIsNewCustomerModalOpen(false);
      setNewCustomerForm({ firstName: '', lastName: '', companyName: '', email: '', phone: '', customerType: 'Particular', dailyBoxLimit: '0' });
      setNotice({ type: 'success', text: `Cliente ${created.displayName} dado de alta con éxito.` });
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err, 'Error al registrar cliente.') });
    } finally {
      setSavingNewCustomer(false);
    }
  };

  const processSale = async () => {
    if (!hasOpenShift) {
      setNotice({ type: 'error', key: 'noOpenShiftSaleBlocked', text: t('noOpenShiftSaleBlocked') });
      return;
    }
    if (cart.length === 0) {
      setNotice({ type: 'error', key: 'emptyCartHint', text: t('emptyCartHint') });
      return;
    }
    if (appliedDiscount > subtotal) {
      setNotice({ type: 'error', key: 'discountAboveSubtotal', text: t('discountAboveSubtotal') });
      return;
    }

    const cash = paymentType === 'FullPayment' ? totalAmount : paymentType === 'CardPayment' ? 0 : Number(cashAmount || 0);
    const card = paymentType === 'CardPayment' ? totalAmount : (paymentType === 'MixedPayment' ? Number(cardAmount || 0) : 0);
    const transfer = paymentType === 'MixedPayment' ? Number(transferAmount || 0) : 0;

    const requiresBankRef = paymentType === 'CardPayment' || (paymentType === 'MixedPayment' && (card > 0 || transfer > 0));
    if (requiresBankRef && !bankReference.trim()) {
      setIsBankRefAlertOpen(true);
      return;
    }

    if (paymentType === 'MixedPayment' && Math.abs(cash + card + transfer - totalAmount) > 0.01) {
      setNotice({ type: 'error', key: 'mixedPaymentMismatch', params: { total: money.format(totalAmount) }, text: t('mixedPaymentMismatch', { total: money.format(totalAmount) }) });
      return;
    }
    if (paymentType === 'AdvanceDeposit') {
      if (!selectedCustomerId) {
        setCustomerModalOpen(true);
        return;
      }
      if (cash <= 0 || cash >= totalAmount) {
        setNotice({ type: 'error', key: 'invalidDepositAmount', params: { total: money.format(totalAmount) }, text: t('invalidDepositAmount', { total: money.format(totalAmount) }) });
        return;
      }
    }

    try {
      setProcessing(true);
      setNotice(null);
      const baseNotes = notes.trim() || t('defaultSaleNote', { coverage: coverage.toFixed(2) });
      const finalNotes = bankReference.trim() ? `${baseNotes} | Ref: ${bankReference.trim()}` : baseNotes;

      const sale = await servicioVentas.procesarVenta({
        customerId: selectedCustomerId || undefined,
        paymentType: paymentType === 'CardPayment' ? 'MixedPayment' : paymentType,
        discountAmount: appliedDiscount,
        advanceAmount: paymentType === 'AdvanceDeposit' ? cash : totalAmount,
        cashAmount: cash,
        cardAmount: card,
        transferAmount: transfer,
        notes: finalNotes,
        requiresInvoice,
        items: cart.map(item => {
          const pricing = calculateCartItemPricing(item.product, item.quantity, isWholesaleCustomer);
          return {
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: pricing.effectiveUnitPrice,
            discountAmount: 0
          };
        })
      });
      setReceipt(sale);
      setCart([]);
      setSelectedCustomerId('');
      setPaymentType('FullPayment');
      setCashAmount('');
      setCardAmount('');
      setTransferAmount('');
      setBankReference('');
      setManualDiscount('');
      setNotes('');
      setNotice({ type: 'success', key: 'saleCompleted', params: { idVenta: sale.idVenta }, text: t('saleCompleted', { idVenta: sale.idVenta }) });
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

    {!hasOpenShift && (
      <div className="pos-notice pos-notice--error" role="alert">
        {t('noOpenShiftBanner')}
      </div>
    )}

    {notice && (
      <div className={`pos-notice pos-notice--${notice.type}`} role="alert">
        {notice.key ? t(notice.key, notice.params) : notice.text}
      </div>
    )}

    <div className="pos-layout">
      <article className="pos-card">
        <div className="pos-card__heading">
          <div>
            <h2>📦 {t('quickCatalog')}</h2>
            <p>{t('quickCatalogHint')}</p>
          </div>
          <strong>{filteredProducts.length}</strong>
        </div>

        <div className="pos-card-search">
          <select
            value={selectedCategoryId}
            onChange={e => void handleCategoryChange(e.target.value)}
            aria-label={t('category')}
          >
            <option value="">📂 {t('allCategories')}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <input
            type="search"
            value={cardSearch}
            onChange={e => setCardSearch(e.target.value)}
            placeholder={`🔍 ${t('search')} (${t('product')}, SKU, ${t('material')})...`}
            aria-label={t('search')}
          />
        </div>

        {categoryLoading ? (
          <div className="pos-category-loading">
            <div className="pos-category-spinner" />
            <span>{t('loadingCategoryProducts')}</span>
          </div>
        ) : (
          <div className="pos-products">
            {filteredProducts.map(product => {
              const unavailable = product.availableQuantity <= 0 || product.isQuoteOnly;
              const ppb = product.piecesPerBox && product.piecesPerBox > 0 ? product.piecesPerBox : 1;

              return (
                <div key={product.id} className={`pos-product ${unavailable ? 'pos-product--unavailable' : ''}`}>
                  <div
                    className="pos-product__main"
                    onClick={() => setProductDetailModal(product)}
                    title={t('viewProductDetailTooltip')}
                    style={{ cursor: 'pointer' }}
                  >
                    {product.imageUrl ? (
                      <img
                        src={resolveProductImageUrl(product.imageUrl)}
                        alt={product.name}
                        width={120}
                        height={120}
                        decoding="async"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="pos-product__placeholder">📷</span>
                    )}
                    <span className="pos-product__details">
                      <small>{product.sku}</small>
                      <strong>{product.name}</strong>
                      <span>{product.coveragePerUnitSqM} m²/Pza · {ppb} pzas/caja</span>
                      <b>{money.format(product.unitPrice)}</b>
                      <em className={product.availableQuantity > 0 ? '' : 'is-empty'}>
                        {product.isQuoteOnly ? t('quoteOnly') : t('availableStock', { quantity: product.availableQuantity })}
                      </em>
                    </span>
                  </div>
                  <div className="pos-product__cart-btns">
                    <button
                      type="button"
                      className="pos-btn-p"
                      disabled={unavailable}
                      title={`${t('unitPza')} +1`}
                      onClick={(e) => { e.stopPropagation(); addProductToCart(product, 1); }}
                    >
                      {t('unitPza')} +
                    </button>

                    <button
                      type="button"
                      className="pos-btn-c"
                      disabled={unavailable}
                      title={`${t('unitCaja')} +1 (${ppb} ${t('deleteProductPieces')})`}
                      onClick={(e) => { e.stopPropagation(); addProductToCart(product, ppb); }}
                    >
                      {t('unitCaja')} +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>

      <aside className="pos-card pos-checkout">
        <div className="pos-card__heading">
          <div><h2>🧾 {t('shoppingCart')}</h2><p>{t('cartItemsCount', { count: cart.length })}</p></div>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              type="button"
              className="action-btn"
              onClick={() => {
                setIsCalculatorModalOpen(true);
                setCalcDropdownOpen(false);
              }}
              title={t('calculatorM2')}
            >
              📐 {t('calculatorM2')}
            </button>
            {cart.length > 0 && <button className="pos-link-btn" onClick={() => setCart([])}>{t('clearCart')}</button>}
          </div>
        </div>
        <label className="pos-field">{t('selectCustomer')}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <select style={{ flex: 1 }} value={selectedCustomerId} onChange={event => setSelectedCustomerId(event.target.value)}>
              <option value="">{t('generalPublic')}</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.displayName} ({customer.customerType}){customer.dailyBoxLimit > 0 ? ` [Límite: ${customer.dailyBoxLimit} cjas/día]` : ''}
                </option>
              ))}
            </select>
            {canCreateCustomer && (
              <button
                type="button"
                className="action-btn"
                onClick={() => setIsNewCustomerModalOpen(true)}
                title="Dar de alta nuevo cliente"
              >
                ➕ Cliente
              </button>
            )}
          </div>
        </label>

        <div className="pos-cart-list">
          {cart.length === 0 ? <div className="pos-empty">{t('emptyCartHint')}</div> : cart.map(item => {
            const pricing = calculateCartItemPricing(item.product, item.quantity, isWholesaleCustomer);
            const ppb = item.product.piecesPerBox && item.product.piecesPerBox > 0 ? item.product.piecesPerBox : 1;
            const boxes = Math.floor(item.quantity / ppb);
            const remPzas = item.quantity % ppb;
            const breakdownStr = ppb > 1 && boxes > 0
              ? `${item.quantity} Pzas (${boxes} Cja${boxes > 1 ? 's' : ''}${remPzas > 0 ? ` + ${remPzas} Pza${remPzas > 1 ? 's' : ''}` : ''})`
              : `${item.quantity} Pza${item.quantity > 1 ? 's' : ''}`;

            return (
              <div className="pos-cart-item" key={item.product.id}>
                <div className="pos-cart-item__top">
                  {item.product.imageUrl && (
                    <img
                      src={resolveProductImageUrl(item.product.imageUrl)}
                      alt=""
                      className="pos-cart-item__img"
                      width={44}
                      height={44}
                      decoding="async"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="pos-cart-item__title">
                    <small className="pos-cart-item__sku">{item.product.sku}</small>
                    <strong>{item.product.name}</strong>
                  </div>
                  <button
                    type="button"
                    className="pos-cart-item__remove"
                    aria-label={t('removeProduct', { product: item.product.name })}
                    onClick={() => setCart(current => current.filter(entry => entry.product.id !== item.product.id))}
                    title="Quitar del carrito"
                  >
                    ×
                  </button>
                </div>

                {pricing.ruleApplied === 'lambrin2BoxesPlus' && (
                  <div className="pos-cart-item__wholesale-row">
                    <span className="badge badge-success">
                      {t('wholesaleAppliedBoxes', { boxes })}
                    </span>
                  </div>
                )}
                {pricing.ruleApplied === 'lambrin1BoxSplit' && pricing.isSplitPricing && (
                  <div className="pos-cart-item__wholesale-row">
                    <span className="badge badge-warning">
                      {t('splitWholesaleBox', { ppb, rem: pricing.retailPieces })}
                    </span>
                  </div>
                )}

                <div className="pos-cart-item__bottom">
                  <div className="pos-quantity-control">
                    <button type="button" onClick={() => changeQuantity(item.product.id, -1)} aria-label={t('decreaseQuantity')}>−</button>
                    <input
                      type="number"
                      min="1"
                      max={item.product.availableQuantity}
                      step="1"
                      value={item.quantity}
                      aria-label={t('quantityForProduct', { product: item.product.name })}
                      onFocus={event => event.currentTarget.select()}
                      onChange={event => updateQuantity(item.product.id, event.target.value)}
                    />
                    <button type="button" onClick={() => changeQuantity(item.product.id, 1)} aria-label={t('increaseQuantity')}>+</button>
                  </div>

                  <div className="pos-cart-item__meta">
                    <span className="pos-cart-item__details">
                      {breakdownStr} · {money.format(pricing.effectiveUnitPrice)} · {(item.quantity * getPieceCoverage(item.product)).toFixed(2)} m²
                    </span>
                  </div>

                  <b className="pos-cart-item__subtotal">{money.format(pricing.subtotal)}</b>
                </div>
              </div>
            );
          })}
        </div>


        <div className="pos-totals">
          <div className="pos-totals__invoice-row" onClick={() => setRequiresInvoice(prev => !prev)}>
            <label className="pos-totals__checkbox-label" onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={requiresInvoice}
                onChange={event => setRequiresInvoice(event.target.checked)}
              />
              <span>🧾 {t('requiresInvoiceLabel')}</span>
            </label>
            <span className={`pos-invoice-badge ${requiresInvoice ? 'is-active' : ''}`}>
              {requiresInvoice ? `${t('yes')} (+16%)` : `${t('no')} (0%)`}
            </span>
          </div>

          <span>{t('subtotal')}<b>{money.format(subtotal)}</b></span>
          {appliedDiscount > 0 && <span className="pos-discount">{t('discount')}<b>-{money.format(appliedDiscount)}</b></span>}
          {requiresInvoice && <span>{t('tax')}<b>{money.format(taxAmount)}</b></span>}
          {coverage > 0 && <span>{t('coverage')}<b>{coverage.toFixed(2)} m² <small style={{ fontWeight: 400, color: 'var(--primary-main)' }}>(📦 ~{cart.reduce((sum, item) => sum + Math.ceil(item.quantity / ((item.product.piecesPerBox && item.product.piecesPerBox > 0) ? item.product.piecesPerBox : 1)), 0)} {t('boxesEstimated')})</small></b></span>}
          <span className="pos-total">{t('total')}<b>{money.format(totalAmount)}</b></span>
        </div>

        {canDiscount && (
          <label className="pos-field">
            {t('manualDiscountPercent')}
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={manualDiscount}
                onChange={event => setManualDiscount(event.target.value)}
                placeholder="0"
              />
              <span style={{ fontWeight: 700, color: 'var(--primary-main)' }}>%</span>
            </div>
            {appliedDiscount > 0 && (
              <small style={{ color: 'var(--success, #2e7d32)', display: 'block', marginTop: '3px', fontWeight: 650 }}>
                {t('discountAmountSummary', { amount: money.format(appliedDiscount), percent: effectiveDiscountPercent })}
              </small>
            )}
            {customerDiscountPercent > 0 && (
              <small style={{ display: 'block', marginTop: '2px', color: 'var(--text-muted)' }}>
                {t('customerDiscountApplied', { discount: `${customerDiscountPercent}%` })}
              </small>
            )}
          </label>
        )}

        <label className="pos-field">{t('paymentType')}
          <select value={paymentType} onChange={event => selectPaymentType(event.target.value as PaymentType)}>
            <option value="FullPayment">💵 {t('cashFullPayment')}</option>
            <option value="CardPayment">💳 {t('cardFullPayment')}</option>
            <option value="MixedPayment">🔀 {t('mixedPayment')}</option>
            <option value="AdvanceDeposit">📑 {t('advanceDeposit')}</option>
          </select>
        </label>

        {paymentType === 'MixedPayment' && <div className="pos-payment-grid">
          <label>{t('cash')}<input type="number" min="0" step="0.01" value={cashAmount} onChange={event => setCashAmount(event.target.value)} placeholder="0.00" /></label>
          <label>{t('card')}<input type="number" min="0" step="0.01" value={cardAmount} onChange={event => setCardAmount(event.target.value)} placeholder="0.00" /></label>
          <label>{t('transfer')}<input type="number" min="0" step="0.01" value={transferAmount} onChange={event => setTransferAmount(event.target.value)} placeholder="0.00" /></label>
        </div>}
        {(paymentType === 'CardPayment' || paymentType === 'MixedPayment') && (
          <label className="pos-field">{t('bankReference')} *
            <input
              type="text"
              maxLength={50}
              value={bankReference}
              onChange={event => setBankReference(event.target.value)}
              placeholder={t('bankReferencePlaceholder')}
              required
            />
          </label>
        )}
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

    {isNewCustomerModalOpen && (
      <div className="pos-receipt-backdrop" onMouseDown={e => e.target === e.currentTarget && setIsNewCustomerModalOpen(false)}>
        <div className="pos-customer-modal" style={{ width: 'min(500px, 100%)' }} role="dialog" aria-modal="true">
          <h2>➕ Dar de alta nuevo cliente</h2>
          <p>Complete los datos para registrar el cliente desde la caja.</p>
          <form onSubmit={handleSaveNewCustomer} style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
            <label className="pos-field">Nombre(s) *
              <input required value={newCustomerForm.firstName} onChange={e => setNewCustomerForm(prev => ({ ...prev, firstName: e.target.value }))} placeholder="Ej. Juan" />
            </label>
            <label className="pos-field">Apellido(s) *
              <input required value={newCustomerForm.lastName} onChange={e => setNewCustomerForm(prev => ({ ...prev, lastName: e.target.value }))} placeholder="Ej. Pérez" />
            </label>
            <label className="pos-field">Empresa / Negocio
              <input value={newCustomerForm.companyName} onChange={e => setNewCustomerForm(prev => ({ ...prev, companyName: e.target.value }))} placeholder="Ej. Decoraciones Bajío" />
            </label>
            <label className="pos-field">Correo electrónico *
              <input required type="email" value={newCustomerForm.email} onChange={e => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))} placeholder="cliente@correo.com" />
            </label>
            <label className="pos-field">Teléfono *
              <input required type="tel" value={newCustomerForm.phone} onChange={e => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="4771234567" />
            </label>
            <label className="pos-field">Tipo de cliente
              <select value={newCustomerForm.customerType} onChange={e => setNewCustomerForm(prev => ({ ...prev, customerType: e.target.value }))}>
                <option value="Particular">Particular</option>
                <option value="Mayorista">Mayorista</option>
                <option value="Arquitecto/Constructor">Arquitecto/Constructor</option>
              </select>
            </label>
            <label className="pos-field">Límite diario de cajas (0 = Sin límite)
              <input type="number" min="0" step="1" value={newCustomerForm.dailyBoxLimit} onChange={e => setNewCustomerForm(prev => ({ ...prev, dailyBoxLimit: e.target.value }))} placeholder="0" />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="pos-receipt-close" style={{ flex: 1 }} onClick={() => setIsNewCustomerModalOpen(false)}>Cancelar</button>
              <button type="submit" className="action-btn" style={{ flex: 1 }} disabled={savingNewCustomer}>{savingNewCustomer ? 'Guardando...' : 'Guardar y Seleccionar'}</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {isCalculatorModalOpen && (
      <div className="pos-receipt-backdrop" onMouseDown={e => e.target === e.currentTarget && setIsCalculatorModalOpen(false)}>
        <div
          className="pos-customer-modal"
          style={{
            width: 'min(780px, 96vw)',
            maxHeight: '92vh',
            minHeight: 'min(540px, 85vh)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.75rem',
            borderRadius: '14px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)'
          }}
          role="dialog"
          aria-modal="true"
        >
          <h2>📐 {t('calcModalTitle')}</h2>
          <p>{t('calcModalSubtitle')}</p>

          <form style={{ display: 'grid', gap: '0.85rem', marginTop: '1rem' }} onSubmit={e => e.preventDefault()}>
            <div className="calc-mode-toggle" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', padding: '6px', background: '#f3f4f6', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '0.5rem' }}>
              <button
                type="button"
                className={`calc-mode-btn ${calcMode === 'wall' ? 'is-active' : ''}`}
                onClick={() => setCalcMode('wall')}
                style={calcMode === 'wall' ? {
                  background: '#c59b27',
                  color: '#ffffff',
                  border: '1px solid #a8821d',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(197, 155, 39, 0.45)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                } : {
                  background: '#ffffff',
                  color: '#4b5563',
                  border: '1px solid #d1d5db',
                  fontWeight: 600,
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                🧱 {t('calcWallMode')}
              </button>
              <button
                type="button"
                className={`calc-mode-btn ${calcMode === 'direct' ? 'is-active' : ''}`}
                onClick={() => setCalcMode('direct')}
                style={calcMode === 'direct' ? {
                  background: '#c59b27',
                  color: '#ffffff',
                  border: '1px solid #a8821d',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(197, 155, 39, 0.45)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                } : {
                  background: '#ffffff',
                  color: '#4b5563',
                  border: '1px solid #d1d5db',
                  fontWeight: 600,
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                📐 {t('calcDirectMode')}
              </button>
            </div>

            <div className="pos-field">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>
                {t('selectProduct')}
              </label>
              <div className="calc-product-search-box" style={{ position: 'relative', width: '100%' }}>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={`🔍 ${t('calcSearchProduct')}`}
                    value={calcProductSearch}
                    onChange={e => {
                      setCalcProductSearch(e.target.value);
                      setCalcDropdownOpen(true);
                      if (selectedCalcProduct) {
                        setCalcProductId('');
                      }
                    }}
                    onFocus={() => setCalcDropdownOpen(true)}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      border: '1px solid var(--border-input, #cbd5e1)',
                      borderRadius: '6px',
                      fontSize: '0.88rem',
                      background: 'var(--background-surface, #ffffff)',
                      color: 'var(--text-main, #111827)'
                    }}
                  />
                  {selectedCalcProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setCalcProductId('');
                        setCalcProductSearch('');
                        setCalcDropdownOpen(true);
                      }}
                      className="lang-btn"
                      style={{
                        padding: '0.6rem 0.85rem',
                        fontSize: '0.82rem',
                        whiteSpace: 'nowrap',
                        color: 'var(--danger, #ef4444)',
                        borderColor: '#fca5a5'
                      }}
                      title={t('calcChangeProduct')}
                    >
                      ✕ {t('calcChangeProduct')}
                    </button>
                  )}
                </div>

                {calcDropdownOpen && (
                  <ul
                    className="calc-product-dropdown"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      maxHeight: '280px',
                      overflowY: 'auto',
                      overscrollBehavior: 'contain',
                      margin: '4px 0 0 0',
                      padding: '4px 0',
                      listStyle: 'none',
                      background: '#ffffff',
                      border: '1.5px solid var(--primary-main, #c59b27)',
                      borderRadius: '8px',
                      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)',
                      boxSizing: 'border-box'
                    }}
                  >
                    {calcFilteredProducts.length === 0 ? (
                      <li style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.85rem' }}>
                        {t('calcNoProductsFound')}
                      </li>
                    ) : (
                      calcFilteredProducts.map(p => (
                        <li
                          key={p.id}
                          className="calc-product-dropdown-item"
                          onMouseDown={e => {
                            e.preventDefault();
                            setCalcProductId(p.id);
                            setCalcProductSearch(`${p.sku} — ${p.name}`);
                            setCalcDropdownOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem 1.15rem',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            fontSize: '0.88rem',
                            color: '#1f2937',
                            boxSizing: 'border-box',
                            minWidth: 0,
                            width: '100%'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ color: '#c59b27', fontSize: '0.95rem' }}>{p.sku}</strong>
                            <span style={{ margin: '0 0.4rem', color: '#9ca3af' }}>—</span>
                            <span style={{ fontWeight: 500 }}>{p.name}</span>
                            {p.barcode && (
                              <small style={{ display: 'block', color: '#6b7280', fontSize: '0.75rem', marginTop: '3px' }}>
                                条形码 / Cód: {p.barcode}
                              </small>
                            )}
                          </div>
                          <span
                            className="badge badge-info"
                            style={{
                              flexShrink: 0,
                              marginLeft: '0.5rem',
                              whiteSpace: 'nowrap',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              padding: '0.3rem 0.65rem',
                              borderRadius: '6px'
                            }}
                          >
                            {p.coveragePerUnitSqM || 0} m²
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>

            {calcMode === 'wall' ? (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div className="calc-wall-grid">
                  <label className="pos-field">{t('calcWallHeight')}
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ej. 2.60"
                      value={calcHeight}
                      onChange={e => setCalcHeight(e.target.value)}
                      autoFocus
                    />
                  </label>
                  <label className="pos-field">{t('calcWallWidth')}
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ej. 3.50"
                      value={calcWidth}
                      onChange={e => setCalcWidth(e.target.value)}
                    />
                  </label>
                </div>
                <div style={{
                  padding: '0.5rem 0.75rem',
                  background: 'var(--background-container)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)'
                }}>
                  {t('calcCalculatedArea')}: <strong style={{ color: 'var(--primary-main)' }}>{(Number(calcHeight || 0) * Number(calcWidth || 0)).toFixed(2)} m²</strong>
                </div>
              </div>
            ) : (
              <label className="pos-field">{t('calcDirectAreaLabel')}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej. 15.5"
                    value={calcTargetM2}
                    onChange={e => setCalcTargetM2(e.target.value)}
                    autoFocus
                  />
                  <span style={{ fontWeight: 700, color: 'var(--primary-main)' }}>m²</span>
                </div>
              </label>
            )}

            {selectedCalcProduct && (
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                padding: '0.6rem 0.85rem',
                background: 'var(--background-container)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                <span>📐 {t('calcPieceCoverage')}: <strong>{calcPieceCoverage.toFixed(3)} m²</strong></span>
                <span>📦 {t('calcPiecesPerBox')}: <strong>{calcPpb} pzas</strong></span>
              </div>
            )}

            {calcNeededPieces > 0 && selectedCalcProduct && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                padding: '0.85rem',
                background: 'var(--background-cream)',
                border: '1px solid var(--border-hover)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                  <div style={{ padding: '0.5rem 0.75rem', background: 'var(--background-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                    <small style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('calcPiecesNeeded')}</small>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>🧩 {calcNeededPieces} Pzas</strong>
                  </div>
                  <div style={{ padding: '0.5rem 0.75rem', background: 'var(--background-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                    <small style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('calcBoxesEquivalent')}</small>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>📦 ~{calcBoxesEq} Cjas</strong>
                  </div>
                  <div style={{ padding: '0.5rem 0.75rem', background: 'var(--background-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                    <small style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('calcRealCoverage')}</small>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>📐 {calcRealCoverage} m²</strong>
                  </div>
                  <div style={{ padding: '0.5rem 0.75rem', background: 'var(--background-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                    <small style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('calcEstimatedCost')}</small>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--success)' }}>{money.format(calcTotalCost)}</strong>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="pos-receipt-close"
                style={{ flex: 1 }}
                onClick={() => setIsCalculatorModalOpen(false)}
              >
                {t('cancel')}
              </button>
              {calcNeededPieces > 0 && selectedCalcProduct && (
                <button
                  type="button"
                  className="action-btn"
                  style={{ flex: 1.5 }}
                  onClick={() => {
                    addProductToCart(selectedCalcProduct, calcNeededPieces);
                    setIsCalculatorModalOpen(false);
                    setCalcTargetM2('');
                    setCalcHeight('');
                    setCalcWidth('');
                  }}
                >
                  🛒 {t('calcAddToCart', { count: calcNeededPieces, cost: money.format(calcTotalCost) })}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    )}

    {isBankRefAlertOpen && (
      <div className="pos-receipt-backdrop" onMouseDown={e => e.target === e.currentTarget && setIsBankRefAlertOpen(false)}>
        <div className="pos-customer-modal" style={{ width: 'min(440px, 95%)', textAlign: 'center', padding: '1.75rem' }} role="dialog" aria-modal="true">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--danger-main, #d93025)', marginBottom: '0.65rem' }}>
            {t('bankReferenceAlertTitle')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            {t('bankReferenceAlertDesc')}
          </p>
          <button
            type="button"
            className="action-btn"
            style={{ width: '100%', padding: '0.75rem 1rem' }}
            onClick={() => setIsBankRefAlertOpen(false)}
            autoFocus
          >
            Aceptar / 明白
          </button>
        </div>
      </div>
    )}
    {productDetailModal && (
      <div
        className="pos-receipt-backdrop"
        role="dialog"
        aria-modal="true"
        onMouseDown={e => e.target === e.currentTarget && setProductDetailModal(null)}
      >
        <div
          className="pos-customer-modal"
          style={{
            width: 'min(620px, 96%)',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '1.5rem',
            fontFamily: 'inherit'
          }}
          role="dialog"
          aria-modal="true"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                  {productDetailModal.categoryName || 'WPC Lambrín'}
                </span>
                <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--primary-main)', fontWeight: 700 }}>
                  SKU: {productDetailModal.sku}
                </span>
                {productDetailModal.barcode && (
                  <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    • Cód: {productDetailModal.barcode}
                  </span>
                )}
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', lineHeight: 1.35, wordBreak: 'break-word' }}>
                {productDetailModal.name}
              </h3>
            </div>
            <button
              type="button"
              className="pos-receipt-close"
              style={{ width: '32px', height: '32px', minWidth: '32px', padding: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem' }}
              onClick={() => setProductDetailModal(null)}
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {productDetailModal.imageUrl ? (
              <img
                src={resolveProductImageUrl(productDetailModal.imageUrl)}
                alt={productDetailModal.name}
                width={140}
                height={140}
                decoding="async"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
                style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: '#fff', flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: '140px', height: '140px', display: 'grid', placeItems: 'center', background: 'var(--background-container)', borderRadius: '8px', fontSize: '2.5rem', flexShrink: 0 }}>
                📷
              </div>
            )}

            <div style={{ flex: 1, minWidth: '240px', display: 'grid', gap: '0.45rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Material: </span>
                <strong style={{ color: 'var(--text-main)' }}>{productDetailModal.material || 'WPC Madera Plástica'}</strong>
              </div>
              {productDetailModal.color && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Color / Acabado: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{productDetailModal.color}</strong>
                </div>
              )}
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Dimensiones: </span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {productDetailModal.widthCm || (productDetailModal.widthMm ? productDetailModal.widthMm / 10 : 0)} × {productDetailModal.lengthCm || (productDetailModal.lengthMm ? productDetailModal.lengthMm / 10 : 0)} cm
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Cobertura por Pieza: </span>
                <strong style={{ color: 'var(--text-main)' }}>{productDetailModal.coveragePerUnitSqM} m²</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Presentación / Caja: </span>
                <strong style={{ color: 'var(--text-main)' }}>{productDetailModal.piecesPerBox || 1} piezas</strong>
                {productDetailModal.boxCoverageSqM ? <span> ({productDetailModal.boxCoverageSqM} m² / caja)</span> : null}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '1rem', padding: '0.85rem', background: 'var(--background-container)', borderRadius: '8px' }}>
            <div>
              <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Precio Menudeo</small>
              <strong style={{ fontSize: '1.25rem', color: 'var(--primary-main)' }}>{money.format(productDetailModal.unitPrice)}</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}> / Pza</span>
            </div>
            <div>
              <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Precio Mayoreo</small>
              {productDetailModal.wholesalePrice > 0 ? (
                <>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--success)' }}>{money.format(productDetailModal.wholesalePrice)}</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}> (Min. {productDetailModal.wholesaleMinQuantity} pzas)</span>
                </>
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No aplica mayoreo</span>
              )}
            </div>
          </div>

          <div style={{
            marginTop: '0.85rem',
            padding: '0.75rem 1rem',
            background: productDetailModal.availableQuantity > 0 ? 'var(--success-surface)' : 'var(--danger-surface)',
            border: `1px solid ${productDetailModal.availableQuantity > 0 ? 'var(--success-border)' : 'var(--danger-border)'}`,
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 700, color: productDetailModal.availableQuantity > 0 ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
              {productDetailModal.availableQuantity > 0 ? '🟢 Existencias Disponibles:' : '🔴 Agotado / Sin Existencias'}
            </span>
            <strong style={{ fontSize: '1.1rem', color: productDetailModal.availableQuantity > 0 ? 'var(--success)' : 'var(--danger)' }}>
              {productDetailModal.availableQuantity} Piezas ({Math.floor(productDetailModal.availableQuantity / ((productDetailModal.piecesPerBox && productDetailModal.piecesPerBox > 0) ? productDetailModal.piecesPerBox : 1))} Cajas)
            </strong>
          </div>

          {productDetailModal.description && (
            <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, background: 'var(--background-cream)', padding: '0.6rem 0.75rem', borderRadius: '6px' }}>
              <strong>Descripción:</strong> {productDetailModal.description}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="pos-receipt-close"
              style={{ flex: 1, padding: '0.6rem 1rem' }}
              onClick={() => setProductDetailModal(null)}
            >
              Cerrar
            </button>
            <button
              type="button"
              className="action-btn"
              disabled={productDetailModal.availableQuantity <= 0 || productDetailModal.isQuoteOnly}
              style={{ flex: 1.2, padding: '0.6rem 1rem' }}
              onClick={() => {
                addProductToCart(productDetailModal, 1);
                setProductDetailModal(null);
              }}
            >
              ➕ 1 Pieza ({money.format(productDetailModal.unitPrice)})
            </button>
            <button
              type="button"
              className="action-btn"
              disabled={productDetailModal.availableQuantity <= 0 || productDetailModal.isQuoteOnly}
              style={{ flex: 1.3, padding: '0.6rem 1rem' }}
              onClick={() => {
                const ppb = productDetailModal.piecesPerBox || 1;
                addProductToCart(productDetailModal, ppb);
                setProductDetailModal(null);
              }}
            >
              📦 1 Caja ({productDetailModal.piecesPerBox || 1} pzas)
            </button>
          </div>
        </div>
      </div>
    )}
  </section>;
};

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
export default PaginaPuntoVenta;
