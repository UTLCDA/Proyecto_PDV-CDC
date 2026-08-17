export interface PaymentReceiptSource {
  idVenta: number;
  id: string;
  createdAtUtc: string;
}

export const paymentReceiptArguments = (
  payment: PaymentReceiptSource
): readonly [idVenta: number, targetPaymentId: string, cutoffDate: string] => [
  payment.idVenta,
  payment.id,
  payment.createdAtUtc
];
