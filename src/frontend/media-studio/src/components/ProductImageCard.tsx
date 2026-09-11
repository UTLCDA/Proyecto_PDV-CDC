import React, { useState, useRef } from 'react';
import { StudioProduct } from '../types/studioTypes';
import { isProductionApi, mediaApi } from '../api/mediaApi';

interface ProductImageCardProps {
  product: StudioProduct;
  onInspect: (product: StudioProduct) => void;
  onImageUpdated: () => void;
  showToast: (msg: string) => void;
}

export const ProductImageCard: React.FC<ProductImageCardProps> = ({
  product,
  onInspect,
  onImageUpdated,
  showToast
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProd = isProductionApi();
  const isWebp = product.imageUrl && product.imageUrl.startsWith('/products');
  const isBase64 = product.imageUrl && product.imageUrl.startsWith('data:image');
  const hasImage = Boolean(product.imageUrl);

  const displayUrl = mediaApi.resolveImageUrl(product.imageUrl);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processUpload(file);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processUpload(file);
      e.target.value = '';
    }
  };

  const processUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPEG, PNG, WebP).');
      return;
    }

    try {
      setIsUploading(true);
      await mediaApi.uploadProductImage(product.id, file);
      showToast(`¡Imagen de ${product.sku} cargada y generada en ${isProd ? 'PR (Producción)' : 'DEV'}!`);
      onImageUpdated();
    } catch (err: any) {
      alert(`Error al subir imagen: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    const targetText = isProd ? 'EL SERVIDOR DE PRODUCCIÓN (PR)' : 'tu entorno local';
    if (!window.confirm(`¿Eliminar la imagen física y referencia de ${product.sku} en ${targetText}?`)) {
      return;
    }

    try {
      await mediaApi.deleteProductImage(product.id);
      showToast(`Imagen de ${product.sku} eliminada.`);
      onImageUpdated();
    } catch (err: any) {
      alert(`Error al eliminar imagen: ${err.message}`);
    }
  };

  return (
    <div
      className={`product-card ${isDragOver ? 'is-dragover' : ''}`}
      style={!hasImage ? { borderColor: 'rgba(244, 63, 94, 0.25)' } : {}}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
      />

      <div className="product-preview-zone">
        {hasImage ? (
          <img
            src={displayUrl || ''}
            alt={product.nombre}
            className="product-img"
            loading="lazy"
          />
        ) : (
          <div className="product-no-img">
            <span>📷</span>
            <p style={{ color: '#fb7185', fontWeight: 600 }}>Pendiente de Carga</p>
            <small style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>Suelta archivo aquí</small>
          </div>
        )}

        <div className="card-badges">
          {isWebp && <span className="badge badge-webp">✅ WebP en {isProd ? 'PR' : 'DEV'}</span>}
          {isBase64 && <span className="badge badge-base64">🔄 Base64 Legacy</span>}
          {!hasImage && <span className="badge badge-missing">⚠️ Sin Imagen</span>}
        </div>

        {(isDragOver || isUploading) && (
          <div className="drop-overlay">
            <span>📤</span>
            <p>{isUploading ? `Generando WebP en ${isProd ? 'PR' : 'DEV'}...` : 'Suelta para subir'}</p>
          </div>
        )}
      </div>

      <div className="product-body">
        <div className="product-header-info">
          <div>
            <span className="product-sku">{product.sku}</span>
            <h4 className="product-name" title={product.nombre}>{product.nombre}</h4>
          </div>
          {product.idProducto && (
            <span className="product-id-tag">#{product.idProducto}</span>
          )}
        </div>

        <div className="product-path-preview" title={displayUrl || 'Sin imagen asignada'}>
          {displayUrl || '⚠️ Sin ruta asignada'}
        </div>

        <div className="card-actions">
          <button
            className="btn-upload-trigger"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title={`Cargar o reemplazar imagen en ${isProd ? 'PR' : 'DEV'}`}
          >
            <span>📁</span>
            <span>{hasImage ? 'Reemplazar' : 'Cargar Foto'}</span>
          </button>

          <button
            className="btn-action-icon"
            onClick={() => onInspect(product)}
            title="Inspeccionar las 3 variantes WebP (peso, resolución, URLs)"
          >
            🔍
          </button>

          {hasImage && displayUrl && (
            <a
              href={displayUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-action-icon"
              title="Abrir imagen directamente en el navegador"
            >
              🔗
            </a>
          )}

          {hasImage && (
            <button
              className="btn-action-icon danger"
              onClick={handleDelete}
              title="Eliminar imagen"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
