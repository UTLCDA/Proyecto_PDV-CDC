import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Venta } from '../../types/tiposVentas';
import { parseUtcDate } from '../../utils/dateUtils';
import '../Pos/PaginaPuntoVenta.css';

export const SaleReceiptModal: React.FC<{ sale: Venta; targetPaymentId?: string; cutoffDate?: string; onClose: () => void }> = ({ sale, targetPaymentId, cutoffDate, onClose }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }), [locale]);
  const dateTime = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }), [locale]);

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
    ? (sale.paymentType === 'MixedPayment' ? t('mixedPaymentBreakdown') || 'Desglose de Pago Mixto' : t('paymentHistory'))
    : t('paymentMethodTitle') || 'Forma de Pago';
  const receiptReference = allPayments[0]?.referenceNumber || sale.payments?.[0]?.referenceNumber;

  return <div className="pos-receipt-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div className="pos-receipt" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
      <header><img src="/logo_wpc_bajio.jpeg" alt="WPC Bajío" /><h2 id="receipt-title">WPC BAJÍO</h2><p>{t('receiptSubtitle')}</p><strong>{t('saleNumber', { idVenta: sale.idVenta })}</strong>{receiptReference && <span>{t('reference')}: {receiptReference}</span>}<small>{dateTime.format(parseUtcDate(sale.createdAtUtc))}</small></header>
      <div className="pos-receipt__customer">{t('customer')}: <strong>{sale.customerDisplayName || t('generalPublic')}</strong></div>
      <div className="pos-receipt__items">{sale.items.map(item => <div key={item.id}><span>{item.quantity} × {item.productName}<small>{money.format(item.unitPrice)} / {item.unitOfMeasure}</small></span><b>{money.format(item.totalPrice)}</b></div>)}</div>
      <div className="pos-receipt__totals"><span>{t('subtotal')}<b>{money.format(sale.subTotal)}</b></span>{sale.discountAmount > 0 && <span>{t('discount')}<b>-{money.format(sale.discountAmount)}</b></span>}<span>{t('tax')}<b>{money.format(sale.taxAmount)}</b></span><span className="receipt-total">{t('total')}<b>{money.format(sale.totalAmount)}</b></span></div>
      <div className="pos-receipt__payment">
        <strong>{paymentTitle}</strong>
        {!isMultiPayment ? (
          <span>
            • {sale.cashAmount > 0 ? `${t('cash')}: ${money.format(sale.cashAmount)}` :
               sale.cardAmount > 0 ? `${t('card')}: ${money.format(sale.cardAmount)}` :
               sale.transferAmount > 0 ? `${t('transfer')}: ${money.format(sale.transferAmount)}` :
               money.format(sale.totalAmount)} · {t('fullPaymentConfirmed') || '(Pagado en su totalidad)'}
          </span>
        ) : (
          allPayments.map(payment => (
            <span key={payment.id}>
              • {t(paymentMethodKey(payment.paymentMethod))}: {money.format(payment.amount)} · {dateTime.format(parseUtcDate(payment.createdAtUtc))}
              {payment.isInitialPayment && sale.paymentType === 'AdvanceDeposit' ? ` (${t('initialPayment')})` : ''}
            </span>
          ))
        )}
        {snapshotPendingBalance > 0 ? (
          <span><strong>{t('pendingBalance')}: {money.format(snapshotPendingBalance)}</strong></span>
        ) : (
          <span style={{ color: '#2b8a3e', fontWeight: 600 }}>• {t('fullPaymentConfirmed') || 'Venta liquidada en su totalidad'}</span>
        )}
      </div>
      <footer><button className="action-btn" onClick={() => window.print()}>🖨️ {t('printReceipt')}</button><button className="pos-receipt-close" onClick={onClose}>{t('closeReceipt')}</button></footer>
    </div>
  </div>;
};

const paymentTypeKey = (type: string) => ({ FullPayment: 'cashFullPayment', MixedPayment: 'mixedPayment', AdvanceDeposit: 'advanceDeposit' } as Record<string, string>)[type] ?? type;
const paymentMethodKey = (method: string) => ({ Cash: 'cash', Card: 'card', Transfer: 'bankTransfer' } as Record<string, string>)[method] ?? method;

export default SaleReceiptModal;
