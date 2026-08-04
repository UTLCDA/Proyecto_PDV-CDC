export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentCategoryId?: string;
  subCategories: Category[];
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  unitPrice: number;
  wholesalePrice: number;
  wholesaleMinQuantity: number;
  unitOfMeasure: string;
  coveragePerUnitSqM: number;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  material: string;
  isQuoteOnly: boolean;
  isTopSellerVisible: boolean;
  imageUrls: string[];
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  customerType: 'Regular' | 'Wholesale';
  specialDiscountPercentage: number;
  notes: string;
  displayName: string;
}
