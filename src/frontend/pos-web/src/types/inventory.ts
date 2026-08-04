export interface Stock {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
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
  productId: string;
  productSku: string;
  productName: string;
  movementType: 'Entry' | 'Exit' | 'Adjustment' | 'Sale' | 'Return';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  referenceNumber: string;
  userUsername?: string;
  createdAtUtc: string;
}

export interface RegisterMovementRequest {
  productId: string;
  movementType: string;
  quantity: number;
  reason: string;
  referenceNumber: string;
}
