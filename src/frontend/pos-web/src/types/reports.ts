export interface CashTransaction {
  id: string;
  transactionType: string;
  amount: number;
  reason: string;
  userUsername?: string;
  createdAtUtc: string;
}

export interface CashGeneralMovement {
  id: string;
  idVenta?: number | null;
  category: string;
  reference: string;
  paymentMethod: string;
  amount: number;
  userUsername?: string;
  createdAtUtc: string;
}

export interface CashShift {
  id: string;
  shiftNumber: string;
  userId: string;
  userUsername: string;
  openingAmount: number;
  totalSalesCash: number;
  totalSalesCard: number;
  totalSalesTransfer: number;
  totalCashDeposits?: number;
  totalEntradas?: number;
  totalWithdrawals: number;
  expectedClosingAmount: number;
  actualClosingAmount: number;
  differenceAmount: number;
  status: 'Abierto' | 'Cerrado';
  openedAtUtc: string;
  closedAtUtc?: string;
  notes: string;
  transactions: CashTransaction[];
}

export interface SalesSummaryReport {
  totalSalesCount: number;
  totalSalesAmount: number;
  totalReturnedAmount: number;
  netSalesAmount: number;
  totalTaxAmount: number;
  totalDiscountAmount: number;
  averageTicketAmount: number;
  totalCashIncome: number;
  totalCardIncome: number;
  totalTransferIncome: number;
}

export interface TopProductReport {
  productId: string;
  sku: string;
  productName: string;
  categoryName: string;
  totalQuantitySold: number;
  totalQuantityReturned: number;
  netQuantitySold: number;
  totalRevenue: number;
  totalReturnedAmount: number;
  netRevenue: number;
}

export interface InventorySummaryReport {
  totalProducts: number;
  totalUnitsOnHand: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  inventoryRetailValue: number;
  suggestedReorderUnits: number;
  lowStockProductList: LowStockProductReport[];
}

export interface LowStockProductReport {
  productId: string;
  sku: string;
  productName: string;
  quantityOnHand: number;
  minimumAlertThreshold: number;
  suggestedReorderQuantity: number;
  unitOfMeasure: string;
  isOutOfStock: boolean;
}

export interface AuditLog {
  id: string;
  idVenta?: number | null;
  correlationId: string;
  userUsername?: string;
  action: string;
  entityName: string;
  entityId?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress: string;
  notes: string;
  createdAtUtc: string;
}
