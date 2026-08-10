import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Venta } from '../../types/tiposVentas';
import '../Pos/PaginaPuntoVenta.css';

export const SaleReceiptModal: React.FC<{ sale: Venta; onClose: () => void }> = ({ sale, onClose }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }), [locale]);
  const dateTime = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }), [locale]);

  const isMultiPayment = sale.paymentType === 'MixedPayment' || sale.paymentType === 'AdvanceDeposit' || sale.pendingBalance > 0 || (sale.payments ?? []).length > 1;
  const paymentTitle = isMultiPayment
    ? (sale.paymentType === 'MixedPayment' ? t('mixedPaymentBreakdown') || 'Desglose de Pago Mixto' : t('paymentHistory'))
    : t('paymentMethodTitle') || 'Forma de Pago';

  return <div className="pos-receipt-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div className="pos-receipt" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
      <header><img src="/logo_wpc_bajio.jpeg" alt="WPC Bajío" /><h2 id="receipt-title">WPC BAJÍO</h2><p>{t('receiptSubtitle')}</p><strong>{sale.folioNumber}</strong><small>{dateTime.format(new Date(sale.createdAtUtc))}</small></header>
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
          (sale.payments ?? []).map(payment => (
            <span key={payment.id}>
              • {t(paymentMethodKey(payment.paymentMethod))}: {money.format(payment.amount)} · {dateTime.format(new Date(payment.createdAtUtc))}
              {payment.isInitialPayment && sale.paymentType === 'AdvanceDeposit' ? ` (${t('initialPayment')})` : ''}
            </span>
          ))
        )}
        {sale.pendingBalance > 0 && <span><strong>{t('pendingBalance')}: {money.format(sale.pendingBalance)}</strong></span>}
      </div>
      <footer><button className="action-btn" onClick={() => window.print()}>🖨️ {t('printReceipt')}</button><button className="pos-receipt-close" onClick={onClose}>{t('closeReceipt')}</button></footer>
    </div>
  </div>;
};

const paymentTypeKey = (type: string) => ({ FullPayment: 'cashFullPayment', MixedPayment: 'mixedPayment', AdvanceDeposit: 'advanceDeposit' } as Record<string, string>)[type] ?? type;
const paymentMethodKey = (method: string) => ({ Cash: 'cash', Card: 'card', Transfer: 'bankTransfer' } as Record<string, string>)[method] ?? method;

export default SaleReceiptModal;
