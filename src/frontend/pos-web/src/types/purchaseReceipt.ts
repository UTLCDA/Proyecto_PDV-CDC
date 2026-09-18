export interface PurchaseReceipt {
  id: string;
  folio: string;
  productoId: string;
  idProducto: number;
  nombreProducto: string;
  sku: string;
  codigoBarras: string;
  precioCosto: number;
  precioVenta: number;
  inventarioAnterior: number;
  cantidad: number;
  inventarioResultante: number;
  notas?: string | null;
  usuarioId?: string | null;
  usuarioNombre?: string | null;
  fechaCreacionUtc: string;
  fechaModificacionUtc?: string | null;
}

export interface CreatePurchaseReceiptRequest {
  productoId: string;
  cantidad: number;
  precioCosto: number;
  notas?: string;
}

export interface UpdatePurchaseReceiptRequest {
  cantidad: number;
  precioCosto: number;
  notas?: string;
}
