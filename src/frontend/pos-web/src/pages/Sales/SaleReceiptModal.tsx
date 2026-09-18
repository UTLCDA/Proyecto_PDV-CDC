import React, { useMemo } from 'react';
import { Venta } from '../../types/tiposVentas';
import { parseUtcDate } from '../../utils/dateUtils';
import '../Pos/PaginaPuntoVenta.css';

export const SaleReceiptModal: React.FC<{ sale: Venta; targetPaymentId?: string; cutoffDate?: string; onClose: () => void }> = ({ sale, targetPaymentId, cutoffDate, onClose }) => {
  // El comprobante térmico se emite estrictamente en español
  const money = useMemo(() => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }), []);
  const dateTime = useMemo(() => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }), []);

  const allPayments = useMemo(() => {
    const list = sale.payments ?? [];
    if (!targetPaymentId && !cutoffDate) return list;

    const sorted = [...list].sort((a, b) => {
      if (a.isInitialPayment && !b.isInitialPayment) return -1;
      if (!a.isInitialPayment && b.isInitialPayment) return 1;
      return parseUtcDate(a.createdAtUtc).getTime() - parseUtcDate(b.createdAtUtc).getTime();
    });

    if (targetPaymentId) {
      let idx = sorted.findIndex(p => p.id === targetPaymentId || p.id.includes(targetPaymentId) || targetPaymentId.includes(p.id));
      if (idx === -1) {
        const lowerId = targetPaymentId.toLowerCase();
        if (lowerId.includes('initial') || lowerId.includes('advance') || lowerId.includes('cash') || lowerId.includes('card') || lowerId.includes('transfer') || targetPaymentId === sale.id) {
          idx = sorted.findIndex(p => p.isInitialPayment);
        }
      }
      if (idx !== -1) {
        return sorted.slice(0, idx + 1);
      }
    }

    if (cutoffDate) {
      const targetTime = parseUtcDate(cutoffDate).getTime();
      const filtered = sorted.filter(p => parseUtcDate(p.createdAtUtc).getTime() <= targetTime + 500);
      if (filtered.length > 0) return filtered;
    }

    return sorted;
  }, [sale.payments, targetPaymentId, cutoffDate]);

  const totalPaidInSnapshot = useMemo(() => allPayments.reduce((sum, item) => sum + item.amount, 0), [allPayments]);
  const snapshotPendingBalance = (targetPaymentId || cutoffDate) ? Math.max(0, sale.totalAmount - totalPaidInSnapshot) : sale.pendingBalance;

  const isMultiPayment = sale.paymentType === 'MixedPayment' || sale.paymentType === 'AdvanceDeposit' || snapshotPendingBalance > 0 || allPayments.length > 1;
  const paymentTitle = isMultiPayment
    ? (sale.paymentType === 'MixedPayment' ? 'Desglose de Pago Mixto' : 'Historial de Pagos')
    : 'Forma de Pago';
  const receiptReference = allPayments[0]?.referenceNumber || sale.payments?.[0]?.referenceNumber;

  const paymentMethodLabel = (method: string) => {
    switch (method) {
      case 'Cash': return 'Efectivo';
      case 'Card': return 'Tarjeta';
      case 'Transfer': return 'Transferencia';
      default: return method;
    }
  };

  return (
    <div className="pos-receipt-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="pos-receipt" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
        <header>
          <img src="/logo_wpc_bajio.jpeg" alt="WPC Bajío" />
          <h2 id="receipt-title">WPC BAJÍO</h2>
          <p>COMPROBANTE OFICIAL DE VENTA</p>
          <strong>Venta #{sale.idVenta}</strong>
          {receiptReference && <span>Referencia: {receiptReference}</span>}
          <small>{dateTime.format(parseUtcDate(sale.createdAtUtc))}</small>
        </header>

        {(sale.status === 'Cancelada' || sale.status === 'Cancelled') && (
          <div style={{ background: '#fff5f5', border: '2px solid var(--danger)', color: 'var(--danger)', padding: '0.6rem 1rem', borderRadius: '6px', textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', margin: '0.5rem 0' }}>
            🚫 VENTA CANCELADA
          </div>
        )}

        <div className="pos-receipt__customer">
          Cliente: <strong>{sale.customerDisplayName || 'Público General'}</strong>
        </div>

        <div className="pos-receipt__items">
          {sale.items.map(item => (
            <div key={item.id}>
              <span>
                {item.quantity} × {item.productName}
                <small>{money.format(item.unitPrice)} / {item.unitOfMeasure}</small>
              </span>
              <b>{money.format(item.totalPrice)}</b>
            </div>
          ))}
        </div>

        <div className="pos-receipt__totals">
          <span>Subtotal:<b>{money.format(sale.subTotal)}</b></span>
          {sale.discountAmount > 0 && <span>Descuento:<b>-{money.format(sale.discountAmount)}</b></span>}
          {sale.taxAmount > 0 && <span>IVA (16%):<b>{money.format(sale.taxAmount)}</b></span>}
          <span className="receipt-total">Total:<b>{money.format(sale.totalAmount)}</b></span>
        </div>

        <div className="pos-receipt__payment">
          <strong>{paymentTitle}</strong>
          {!isMultiPayment ? (
            <span>
              • {sale.cashAmount > 0 ? `Efectivo: ${money.format(sale.cashAmount)}` :
                 sale.cardAmount > 0 ? `Tarjeta: ${money.format(sale.cardAmount)}` :
                 sale.transferAmount > 0 ? `Transferencia: ${money.format(sale.transferAmount)}` :
                 money.format(sale.totalAmount)} · (Pagado en su totalidad)
            </span>
          ) : (
            allPayments.map(payment => (
              <span key={payment.id}>
                • {paymentMethodLabel(payment.paymentMethod)}: {money.format(payment.amount)} · {dateTime.format(parseUtcDate(payment.createdAtUtc))}
                {payment.isInitialPayment && sale.paymentType === 'AdvanceDeposit' ? ' (Anticipo Inicial)' : ''}
              </span>
            ))
          )}
          {snapshotPendingBalance > 0 ? (
            <span><strong>Saldo Pendiente: {money.format(snapshotPendingBalance)}</strong></span>
          ) : (
            <span style={{ color: '#2b8a3e', fontWeight: 600 }}>• Venta liquidada en su totalidad</span>
          )}
        </div>

        <div className="pos-receipt__footer-info">
          <div className="receipt-thankyou">
            <strong className="company-tag">WPC BAJÍO</strong>
            <h4 className="thankyou-title">¡GRACIAS POR SU COMPRA!</h4>
            <p className="thankyou-subtitle">Agradecemos su preferencia.<br />Esperamos atenderle nuevamente muy pronto.</p>
          </div>

          <div className="receipt-info-block">
            <span className="info-label">ATENCIÓN A CLIENTES</span>
            <span className="info-value">Tel. / WhatsApp: <strong>477 807 2768</strong></span>
          </div>

          <div className="receipt-info-block">
            <span className="info-label">DIRECCIÓN</span>
            <span className="info-value">Blvd. Adolfo López Mateos 2826</span>
            <span className="info-subtext">El Rosario, C.P. 37125</span>
            <span className="info-subtext">León de los Aldama, Gto.</span>
          </div>

          <div className="receipt-info-block website-block">
            <span className="info-url">www.wpcbajio.com</span>
          </div>
        </div>

        <footer>
          <button className="action-btn" onClick={() => window.print()}>🖨️ Imprimir Ticket</button>
          <button className="pos-receipt-close" onClick={onClose}>Cerrar</button>
        </footer>
      </div>
    </div>
  );
};

export default SaleReceiptModal;
