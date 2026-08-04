export interface PartidaVenta {
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

export interface Venta {
  id: string;
  folioNumber: string;
  customerId?: string;
  customerDisplayName?: string;
  userId?: string;
  userUsername?: string;
  paymentType: 'FullPayment' | 'AdvanceDeposit' | 'MixedPayment';
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
  advanceAmount: number;
  pendingBalance: number;
  status: string;
  notes: string;
  createdAtUtc: string;
  items: PartidaVenta[];
}

export interface PeticionCrearVenta {
  customerId?: string;
  paymentType: 'FullPayment' | 'AdvanceDeposit' | 'MixedPayment';
  discountAmount: number;
  advanceAmount: number;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
  notes: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
  }[];
}
