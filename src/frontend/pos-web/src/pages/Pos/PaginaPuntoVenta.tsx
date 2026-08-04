import React, { useState, useEffect } from 'react';
import { Producto, Cliente } from '../../types/tiposCatalogo';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { servicioVentas, ElementoCarrito } from '../../services/servicioVentas';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

export const PaginaPuntoVenta: React.FC = () => {
  const [products, setProducts] = useState<Producto[]>([]);
  const [customers, setCustomers] = useState<Cliente[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cart, setCart] = useState<ElementoCarrito[]>([]);

  // Tipo de Pago y Montos Mixtos (Solicitud del Usuario)
  const [paymentType, setPaymentType] = useState<'FullPayment' | 'AdvanceDeposit' | 'MixedPayment'>('FullPayment');
  const [cashAmount, setCashAmount] = useState<string>('0');
  const [cardAmount, setCardAmount] = useState<string>('0');
  const [transferAmount, setTransferAmount] = useState<string>('0');
  const [discountAmount, setDiscountAmount] = useState<string>('0');

  const [manualCode, setManualCode] = useState('');
  const [lastSaleReceipt, setLastSaleReceipt] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCatalogAndCustomers();
  }, []);

  const loadCatalogAndCustomers = async () => {
    try {
      const [prodsData, custsData] = await Promise.all([
        servicioCatalogo.getProducts(),
        servicioCatalogo.getCustomers()
      ]);
      setProducts(prodsData);
      setCustomers(custsData);
    } catch {
      setErrorMsg('Error al conectar con la API de WPC Bajío.');
    }
  };

  // Integración con Escáner de Código de Barras USB
  useBarcodeScanner({
    onScan: (scannedCode: string) => {
      findAndAddProduct(scannedCode);
    }
  });

  const findAndAddProduct = (code: string) => {
    const term = code.trim().toLowerCase();
    const found = products.find(p => p.barcode.toLowerCase() === term || p.sku.toLowerCase() === term);
    if (found) {
      addProductToCart(found);
      setErrorMsg('');
    } else {
      setErrorMsg(`Producto con código/SKU "${code}" no encontrado.`);
    }
  };

  const addProductToCart = (product: Producto) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [...prevCart, {
        product,
        quantity: 1,
        unitPrice: product.unitPrice,
        discountAmount: 0
      }];
    });
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeCartItem(index);
      return;
    }
    setCart(prev => {
      const updated = [...prev];
      updated[index].quantity = quantity;
      return updated;
    });
  };

  const removeCartItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode) {
      findAndAddProduct(manualCode);
      setManualCode('');
    }
  };

  // Cálculos de Totales y Metros Cuadrados ($m^2$)
  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const totalDiscount = parseFloat(discountAmount) || 0;
  const totalCoverageSqM = cart.reduce((acc, item) => acc + (item.quantity * (item.product.coveragePerUnitSqM || 0)), 0);
  const grandTotal = Math.max(0, subtotal - totalDiscount);

  // Formateador sin Ceros a la Izquierda para Dinero (1.8)
  const handleNumericInput = (setter: React.Dispatch<React.SetStateAction<string>>, val: string) => {
    if (val === '') {
      setter('');
      return;
    }
    const cleaned = val.replace(/^0+(?=\d)/, '');
    setter(cleaned);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('El carrito de compras está vacío.');
      return;
    }

    const cash = parseFloat(cashAmount) || 0;
    const card = parseFloat(cardAmount) || 0;
    const transfer = parseFloat(transferAmount) || 0;

    if (paymentType === 'MixedPayment') {
      const sum = cash + card + transfer;
      if (Math.abs(sum - grandTotal) > 0.05) {
        alert(`En Pago Mixto, la suma de Efectivo ($${cash}), Tarjeta ($${card}) y Transferencia ($${transfer}) debe sumar el total de $${grandTotal.toFixed(2)}.`);
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const result = await servicioVentas.procesarVenta({
        customerId: selectedCustomerId || undefined,
        paymentType,
        discountAmount: totalDiscount,
        advanceAmount: paymentType === 'AdvanceDeposit' ? cash : grandTotal,
        cashAmount: paymentType === 'MixedPayment' ? cash : (paymentType === 'FullPayment' ? grandTotal : cash),
        cardAmount: paymentType === 'MixedPayment' ? card : 0,
        transferAmount: paymentType === 'MixedPayment' ? transfer : 0,
        notes: `Venta Mostrador WPC Bajío (${totalCoverageSqM.toFixed(2)} m²)`,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount
        }))
      });

      setLastSaleReceipt(result);
      setCart([]);
      setCashAmount('0');
      setCardAmount('0');
      setTransferAmount('0');
      setDiscountAmount('0');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la venta.');
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
        {/* Catálogo Rápido de Productos con Imágenes (1.7) */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>📦 Catálogo de Lambrín WPC</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', maxHeight: '540px', overflowY: 'auto' }}>
            {products.map(prod => (
              <div
                key={prod.id}
                onClick={() => addProductToCart(prod)}
                style={{
                  padding: '0.85rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, border-color 0.15s',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center'
                }}
              >
                {/* Imagen del Producto en Catálogo PDV (1.7) */}
                {prod.imageUrl ? (
                  <img src={prod.imageUrl} alt={prod.name} style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)' }} />
                ) : (
                  <div style={{ width: '55px', height: '55px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📷</div>
                )}

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{prod.sku}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', margin: '0.15rem 0', color: '#fff' }}>{prod.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {prod.coveragePerUnitSqM} $m^2$/pza &bull; {prod.piecesPerBox || 1} pzas/caja
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '0.25rem' }}>${prod.unitPrice.toFixed(2)} MXN</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen de Cobro y Carrito con Pago Mixto e Imágenes (1.7) */}
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

          {/* Tabla de Carrito con Miniaturas de Imagen (1.7) */}
          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px' }}>
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
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {item.product.imageUrl ? (
                          <img src={item.product.imageUrl} alt={item.product.name} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : null}
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                          <small style={{ color: 'var(--text-muted)' }}>${item.unitPrice.toFixed(2)} &bull; {(item.quantity * item.product.coveragePerUnitSqM).toFixed(2)} $m^2$</small>
                        </div>
                      </div>
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

          {/* Cómputo de Totales y $m^2$ */}
          <div style={{ background: 'rgba(15,23,42,0.4)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Subtotal:</span> <span>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--accent-primary)' }}>
              <span>Área Total de Muros:</span> <strong>{totalCoverageSqM.toFixed(2)} $m^2$</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', color: 'var(--accent-gold)' }}>
              <span>Total a Cobrar:</span> <span>${grandTotal.toFixed(2)} MXN</span>
            </div>
          </div>

          {/* Configuración de Método de Pago y Pago Mixto */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Método de Pago:</label>
            <select
              className="input-field"
              value={paymentType}
              onChange={e => setPaymentType(e.target.value as any)}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              <option value="FullPayment">💵 Pago De Contado (Efectivo)</option>
              <option value="MixedPayment">💳 Pago Mixto (Efectivo + Tarjeta + Transferencia)</option>
              <option value="AdvanceDeposit">📌 Plan de Apartado / Anticipo</option>
            </select>
          </div>

          {paymentType === 'MixedPayment' && (
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '0.75rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>Desglose de Pago Mixto:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem' }}>Efectivo $</label>
                  <input
                    type="number"
                    className="input-field"
                    style={{ padding: '0.25rem' }}
                    value={cashAmount}
                    onChange={e => handleNumericInput(setCashAmount, e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem' }}>Tarjeta $</label>
                  <input
                    type="number"
                    className="input-field"
                    style={{ padding: '0.25rem' }}
                    value={cardAmount}
                    onChange={e => handleNumericInput(setCardAmount, e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem' }}>Transf. $</label>
                  <input
                    type="number"
                    className="input-field"
                    style={{ padding: '0.25rem' }}
                    value={transferAmount}
                    onChange={e => handleNumericInput(setTransferAmount, e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <button
            className="action-btn"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 'bold' }}
            onClick={handleCompleteSale}
            disabled={isLoading || cart.length === 0}
          >
            {isLoading ? 'Procesando...' : '✅ Confirmar y Procesar Venta'}
          </button>
        </div>
      </div>

      {/* Ticket / Comprobante de Venta Imprimible WPC Bajío */}
      {lastSaleReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '380px', background: '#fff', color: '#000', fontFamily: 'monospace', padding: '1.5rem' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <img src="/logo_wpc_bajio.jpeg" alt="Logo" style={{ height: '40px', marginBottom: '0.25rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>WPC BAJÍO</h3>
              <p style={{ margin: 0, fontSize: '0.75rem' }}>Venta de Lambrín y Revestimientos</p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', fontWeight: 'bold' }}>Folio: {lastSaleReceipt.folioNumber}</p>
              <small>{new Date(lastSaleReceipt.createdAtUtc).toLocaleString()}</small>
            </div>

            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
              {lastSaleReceipt.items.map((it: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>{it.quantity}x {it.productName}</span>
                  <span>${it.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '0.85rem', borderBottom: '1px dashed #000', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span> <span>${lastSaleReceipt.subTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', marginTop: '0.25rem' }}>
                <span>TOTAL:</span> <span>${lastSaleReceipt.totalAmount.toFixed(2)} MXN</span>
              </div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#444' }}>
                Tipo Pago: {lastSaleReceipt.paymentType}
                {lastSaleReceipt.cashAmount > 0 && ` | Efec: $${lastSaleReceipt.cashAmount}`}
                {lastSaleReceipt.cardAmount > 0 && ` | Tarj: $${lastSaleReceipt.cardAmount}`}
                {lastSaleReceipt.transferAmount > 0 && ` | Trans: $${lastSaleReceipt.transferAmount}`}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                className="action-btn"
                onClick={() => window.print()}
                style={{ width: '100%', marginBottom: '0.5rem' }}
              >
                🖨️ Imprimir Ticket
              </button>
              <button
                className="lang-btn"
                onClick={() => setLastSaleReceipt(null)}
                style={{ width: '100%', color: '#000', borderColor: '#888' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginaPuntoVenta;
