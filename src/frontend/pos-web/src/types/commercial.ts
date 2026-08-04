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
  expirationDateUtc: string;
  status: 'Active' | 'Converted' | 'Expired' | 'Cancelled';
  notes: string;
  createdAtUtc: string;
  items: QuoteItem[];
}

export interface PaymentInstallment {
  id: string;
  saleId: string;
  saleFolioNumber: string;
  receiptNumber: string;
  amountPaid: number;
  previousPendingBalance: number;
  newPendingBalance: number;
  paymentMethod: string;
  userUsername?: string;
  notes: string;
  createdAtUtc: string;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  category: string;
  templateContentHtml: string;
}
