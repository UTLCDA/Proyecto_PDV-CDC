import { Cliente, Producto } from './tiposCatalogo';

export interface QuoteItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  unitOfMeasure: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId?: string;
  customerDisplayName?: string;
  userId?: string;
  userUsername?: string;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  advanceAmount?: number;
  pendingBalance?: number;
  expirationDateUtc: string;
  status: 'Activa' | 'Procesando' | 'Convertida' | 'Expirada' | 'Cancelada';
  notes: string;
  createdAtUtc: string;
  items: QuoteItem[];
}

export interface QuoteOptions {
  products: Producto[];
  customers: Cliente[];
}

export interface CreateQuoteRequest {
  customerId?: string;
  discountAmount: number;
  validityDays: number;
  notes: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number; discountAmount: number }>;
}

export interface ConvertQuoteRequest {
  paymentType: 'FullPayment' | 'AdvanceDeposit' | 'MixedPayment';
  advanceAmount: number;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
}

export interface PaymentInstallment {
  id: string;
  saleId: string;
  idVenta: number;
  saleFolioNumber: string;
  receiptNumber: string;
  amountPaid: number;
  previousPendingBalance: number;
  newPendingBalance: number;
  paymentMethod: string;
  userUsername?: string;
  notes: string;
  createdAtUtc: string;
  isInitialPayment?: boolean;
  transactionType?: string;
}

export interface PaymentTransaction {
  id: string;
  saleId: string;
  idVenta: number;
  saleFolioNumber: string;
  customerDisplayName?: string;
  transactionType: string;
  referenceNumber: string;
  paymentMethod: string;
  amount: number;
  userUsername?: string;
  createdAtUtc: string;
}

export interface ReturnItem {
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  refundUnitPrice: number;
  totalRefundPrice: number;
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  saleId: string;
  idVenta: number;
  saleFolioNumber: string;
  totalRefundAmount: number;
  appliedToPendingBalance: number;
  refundedAmount: number;
  refundMethod: string;
  reason: string;
  status: string;
  createdAtUtc: string;
  items: ReturnItem[];
}

export interface CreateReturnRequest {
  idVenta: number;
  refundMethod: 'Cash' | 'Card' | 'Transfer' | 'StoreCredit';
  reason: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  category: string;
  templateContentHtml: string;
}

export interface SaveDocumentTemplateRequest {
  title: string;
  category: 'ContratoVenta' | 'ContratoApartado' | 'ReciboAbono';
  templateContent: string;
}
