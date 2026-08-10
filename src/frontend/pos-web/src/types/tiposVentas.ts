export interface PartidaVenta {
  id: string;
  idVenta?: number;
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
  idVenta?: number;
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
  payments?: PagoVenta[];
}

export interface PagoVenta {
  id: string;
  reference: string;
  amount: number;
  paymentMethod: string;
  userUsername?: string;
  isInitialPayment: boolean;
  createdAtUtc: string;
}

export interface ResumenVentas {
  salesCount: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  totalPaid?: number;
  pendingBalance?: number;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
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
