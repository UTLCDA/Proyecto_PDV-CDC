export interface CartItem {
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  unitOfMeasure: string;
  unitPrice: number;
  wholesalePrice: number;
  wholesaleMinQuantity: number;
  quantity: number;
  discountAmount: number;
}

export interface CreateSaleItemRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}

export interface CreateSaleRequest {
  customerId?: string;
  paymentType: 'FullPayment' | 'AdvanceDeposit';
  discountAmount: number;
  advanceAmount: number;
  notes: string;
  items: CreateSaleItemRequest[];
}

export interface SaleItem {
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

export interface Sale {
  id: string;
  folioNumber: string;
  customerId?: string;
  customerDisplayName?: string;
  userId?: string;
  userUsername?: string;
  paymentType: string;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  advanceAmount: number;
  pendingBalance: number;
  status: string;
  notes: string;
  createdAtUtc: string;
  items: SaleItem[];
}
