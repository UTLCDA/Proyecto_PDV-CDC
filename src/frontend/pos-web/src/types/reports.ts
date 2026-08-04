export interface CashTransaction {
  id: string;
  transactionType: string;
  amount: number;
  reason: string;
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
  totalWithdrawals: number;
  expectedClosingAmount: number;
  actualClosingAmount: number;
  differenceAmount: number;
  status: 'Open' | 'Closed';
  openedAtUtc: string;
  closedAtUtc?: string;
  notes: string;
  transactions: CashTransaction[];
}

export interface SalesSummaryReport {
  totalSalesCount: number;
  totalSalesAmount: number;
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
  totalRevenue: number;
}

export interface AuditLog {
  id: string;
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
