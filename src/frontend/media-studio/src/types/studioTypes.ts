export interface StudioProduct {
  id: string;
  idProducto?: number;
  sku: string;
  nombre: string;
  categoriaId?: string;
  categoriaNombre?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  precioUnitario?: number;
  precioMayoreo?: number;
  estaActivo?: boolean;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ProductImageUploadResult {
  thumbnailUrl: string;
  posUrl: string;
  previewUrl: string;
}

export interface MigrateBase64Result {
  totalScanned: number;
  converted: number;
  failed: number;
  message: string;
}

export interface AuthState {
  token: string | null;
  user: {
    username: string;
    email: string;
    roles: string[];
  } | null;
}

export type ImageFilterStatus = 'all' | 'webp' | 'missing' | 'base64';
