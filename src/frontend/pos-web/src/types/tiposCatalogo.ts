export interface Categoria {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentCategoryId?: string;
  subCategories: Categoria[];
}

export interface Producto {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  unitPrice: number;
  unitCost: number;
  wholesalePrice: number;
  wholesaleMinQuantity: number;
  unitOfMeasure: string;
  coveragePerUnitSqM: number;
  imageUrl?: string;
  piecesPerBox?: number;
  boxCoverageSqM?: number;
  lengthCm?: number;
  heightCm?: number;
  widthCm?: number;
  initialInventoryQuantity?: number;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  material: string;
  color?: string;
  isQuoteOnly: boolean;
  isTopSellerVisible: boolean;
  isActive: boolean;
  imageUrls: string[];
  availableQuantity: number;
}

export interface PeticionCrearProducto {
  sku: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string;
  unitPrice: number;
  unitCost?: number;
  wholesalePrice: number;
  wholesaleMinQuantity: number;
  unitOfMeasure: string;
  coveragePerUnitSqM: number;
  imageUrl?: string;
  piecesPerBox?: number;
  lengthCm?: number;
  heightCm?: number;
  widthCm?: number;
  initialInventoryQuantity?: number;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  material: string;
  color?: string;
  isQuoteOnly: boolean;
  isTopSellerVisible: boolean;
}

export interface PeticionActualizarProducto {
  name: string;
  description: string;
  categoryId: string;
  unitPrice: number;
  unitCost?: number;
  wholesalePrice: number;
  wholesaleMinQuantity: number;
  unitOfMeasure: string;
  coveragePerUnitSqM: number;
  imageUrl?: string;
  piecesPerBox?: number;
  lengthCm?: number;
  heightCm?: number;
  widthCm?: number;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  material: string;
  color?: string;
  isQuoteOnly: boolean;
  isTopSellerVisible: boolean;
  isActive: boolean;
}

export interface Cliente {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  displayName: string;
  taxId?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  customerType: string;
  specialDiscountPercentage: number;
  dailyBoxLimit: number;
  notes: string;
  isActive: boolean;
}

export interface PeticionCrearCliente {
  firstName: string;
  lastName: string;
  companyName?: string;
  taxId?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  customerType: string;
  specialDiscountPercentage: number;
  dailyBoxLimit: number;
  notes: string;
}

export interface PeticionActualizarCliente extends PeticionCrearCliente {
  isActive: boolean;
}
