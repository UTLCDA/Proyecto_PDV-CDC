export interface Stock {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  productImageUrl?: string | null;
  categoryName: string;
  quantityOnHand: number;
  minimumAlertThreshold: number;
  reorderQuantity: number;
  unitOfMeasure: string;
  location: string;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export interface InventoryMovement {
  id: string;
  idVenta?: number | null;
  productId: string;
  productSku: string;
  productName: string;
  movementType: 'Entry' | 'Exit' | 'Adjustment' | 'Sale' | 'Return';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost?: number;
  unitPrice?: number;
  totalAmount?: number;
  taxAmount?: number;
  netCost?: number;
  profit?: number;
  reason: string;
  referenceNumber: string;
  evidenceImageUrl?: string | null;
  userUsername?: string;
  createdAtUtc: string;
}

export interface RegisterMovementRequest {
  productId: string;
  movementType: string;
  quantity: number;
  reason: string;
  referenceNumber: string;
  location: string;
  evidenceImageUrl?: string;
}
