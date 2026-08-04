import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { servicioVentas } from '../../services/servicioVentas';
import { Producto, Cliente } from '../../types/tiposCatalogo';
import { Venta } from '../../types/tiposVentas';
import { usarEscanerCodigoBarras } from '../../hooks/usarEscanerCodigoBarras';

interface CartItem {
  product: Producto;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}

export const PaginaPuntoVenta: React.FC = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Producto[]>([]);
  const [customers, setCustomers] = useState<Cliente[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);

  // Payment Breakdown
  const [paymentType, setPaymentType] = useState<'FullPayment' | 'AdvanceDeposit' | 'MixedPayment'>('FullPayment');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState<number>(0);

  const [notes, setNotes] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [completedSale, setCompletedSale] = useState<Venta | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    loadCatalogData();
  }, []);

  const loadCatalogData = async () => {
    try {
      const [prods, custs] = await Promise.all([
        servicioCatalogo.getProducts(),
        servicioCatalogo.getCustomers()
      ]);
      setProducts(prods);
      setCustomers(custs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar catálogo de productos WPC Bajío');
    }
  };

  const addProductToCart = (prod: Producto) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === prod.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [...prev, { product: prod, quantity: 1, unitPrice: prod.unitPrice, discountAmount: 0 }];
    });
  };

  const handleBarcodeScanned = async (code: string) => {
    try {
      const prod = await servicioCatalogo.getProductByCode(code);
      if (prod) {
        addProductToCart(prod);
        setErrorMsg(null);
      }
    } catch (err) {
      setErrorMsg(`Código de barras '${code}' no encontrado en el catálogo.`);
    }
  };

  usarEscanerCodigoBarras({
    onScan: handleBarcodeScanned,
    minLength: 4
  });

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeScanned(manualCode.trim());
    setManualCode('');
  };

  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((_, i) => i !== index));
      return;
    }
    const updated = [...cart];
    updated[index].quantity = qty;
    setCart(updated);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice - item.discountAmount), 0);
  const taxAmount = Math.round(Math.max(0, subtotal - discountAmount) * 0.16 * 100) / 100;
  const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);
  const sumMixed = cashAmount + cardAmount + transferAmount;
  const remainingMixed = Math.max(0, totalAmount - sumMixed);

  const handleProcessSale = async () => {
    if (cart.length === 0) {
      setErrorMsg('El carrito se encuentra vacío.');
      return;
    }

    if (paymentType === 'MixedPayment' && Math.abs(sumMixed - totalAmount) > 0.05) {
      setErrorMsg(`En Pago Mixto, la suma de los montos ($${sumMixed.toFixed(2)}) debe coincidir con el Total ($${totalAmount.toFixed(2)}). Faltan: $${remainingMixed.toFixed(2)}`);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        customerId: selectedCustomerId || undefined,
        paymentType,
        discountAmount,
        advanceAmount: paymentType === 'AdvanceDeposit' ? advanceAmount : totalAmount,
        cashAmount: paymentType === 'MixedPayment' ? cashAmount : (paymentType === 'FullPayment' ? totalAmount : 0),
        cardAmount: paymentType === 'MixedPayment' ? cardAmount : 0,
        transferAmount: paymentType === 'MixedPayment' ? transferAmount : 0,
        notes,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount
        }))
      };

      const sale = await servicioVentas.processSale(payload);
      setCompletedSale(sale);
      setCart([]);
      setDiscountAmount(0);
      setAdvanceAmount(0);
      setCashAmount(0);
      setCardAmount(0);
      setTransferAmount(0);
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al procesar la venta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Branding Header WPC Bajío */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.9))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/logo_wpc_bajio.jpeg" alt="WPC Bajío Logo" style={{ height: '48px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }} />
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#f8fafc', margin: 0 }}>WPC Bajío — Punto de Venta</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Sistema Integral de Lambrín Decorativo y Revestimientos</p>
          </div>
        </div>

        <form onSubmit={handleManualCodeSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            className="input-field"
            placeholder="🔍 Escanear o ingresar SKU/Código..."
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            style={{ width: '280px' }}
          />
          <button type="submit" className="action-btn">Buscar</button>
        </form>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '8px', color: '#fca5a5' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '1.5rem' }}>
        {/* Catálogo Rápido de Productos */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>📦 Catálogo de Lambrín</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', maxHeight: '520px', overflowY: 'auto' }}>
            {products.map(prod => (
              <div
                key={prod.id}
                onClick={() => addProductToCart(prod)}
                style={{
                  padding: '1rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, border-color 0.15s'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{prod.sku}</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', margin: '0.25rem 0' }}>{prod.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>M2: {prod.coveragePerUnitSqM} m² / {prod.unitOfMeasure}</div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '0.5rem' }}>${prod.unitPrice.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen de Cobro y Carrito con Pago Mixto */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3>🛒 Carrito de Compras</h3>

          {/* Selector de Cliente */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cliente (Opcional):</label>
            <select
              className="input-field"
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              <option value="">-- Cliente General Mostrador --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.displayName} ({c.customerType})</option>
              ))}
            </select>
          </div>

          {/* Tabla de Carrito */}
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px' }}>
            <table style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15,23,42,0.8)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Producto</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem' }}>Cant</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <div>{item.product.name}</div>
                      <small style={{ color: 'var(--text-muted)' }}>${item.unitPrice.toFixed(2)}</small>
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                      <input
                        type="number"
                        min="1"
                        style={{ width: '45px', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                        value={item.quantity}
                        onChange={e => updateQuantity(idx, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 'bold' }}>
                      ${(item.quantity * item.unitPrice - item.discountAmount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cómputo de Totales */}
          <div style={{ background: 'rgba(15,23,42,0.4)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Subtotal:</span> <span>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>IVA (16%):</span> <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span>TOTAL:</span> <span>${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Formato de Cobro con Pago Mixto */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Forma de Cobro:</label>
            <select
              className="input-field"
              value={paymentType}
              onChange={e => setPaymentType(e.target.value as any)}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              <option value="FullPayment">💵 Pago de Contado (Efectivo)</option>
              <option value="AdvanceDeposit">📌 Venta de Apartado (Anticipo)</option>
              <option value="MixedPayment">💳 Pago Mixto (Efectivo + Tarjeta + Transferencia)</option>
            </select>

            {paymentType === 'MixedPayment' && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.3)', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>Desglose de Pago Mixto:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label>💵 Efectivo:</label>
                    <input
                      type="number"
                      className="input-field"
                      style={{ width: '100%', marginTop: '0.2m' }}
                      value={cashAmount}
                      onChange={e => setCashAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label>💳 Tarjeta:</label>
                    <input
                      type="number"
                      className="input-field"
                      style={{ width: '100%', marginTop: '0.2m' }}
                      value={cardAmount}
                      onChange={e => setCardAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label>🏦 Transferencia:</label>
                    <input
                      type="number"
                      className="input-field"
                      style={{ width: '100%', marginTop: '0.2m' }}
                      value={transferAmount}
                      onChange={e => setTransferAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontWeight: 'bold', color: remainingMixed === 0 ? '#4ade80' : '#fca5a5' }}>
                  <span>Suma Ingresada: ${sumMixed.toFixed(2)}</span>
                  <span>{remainingMixed === 0 ? '✓ Monto Completo' : `Faltan: $${remainingMixed.toFixed(2)}`}</span>
                </div>
              </div>
            )}
          </div>

          <button
            className="action-btn"
            onClick={handleProcessSale}
            disabled={isLoading || cart.length === 0}
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 'bold' }}
          >
            {isLoading ? 'Procesando Venta...' : '✅ Confirmar y Procesar Venta'}
          </button>
        </div>
      </div>

      {/* Ticket Modal al finalizar venta */}
      {completedSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '420px', textAlign: 'center' }}>
            <img src="/logo_wpc_bajio.jpeg" alt="Logo Ticket" style={{ height: '50px', marginBottom: '0.5rem' }} />
            <h3>WPC BAJÍO — COMPROBANTE</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Folio: <strong>{completedSale.folioNumber}</strong></p>
            <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', margin: '1rem 0', fontSize: '0.85rem' }}>
              <p><strong>Fecha:</strong> {new Date(completedSale.createdAtUtc).toLocaleString()}</p>
              <p><strong>Tipo Pago:</strong> {completedSale.paymentType}</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '0.5rem' }}>TOTAL COBRADO: ${completedSale.totalAmount.toFixed(2)}</p>
            </div>
            <button className="action-btn" onClick={() => setCompletedSale(null)}>Cerrar Comprobante</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginaPuntoVenta;
