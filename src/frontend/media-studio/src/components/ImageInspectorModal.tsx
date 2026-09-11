import React, { useState, useEffect, useRef } from 'react';
import { StudioProduct } from '../types/studioTypes';
import { mediaApi } from '../api/mediaApi';

interface ImageInspectorModalProps {
  product: StudioProduct | null;
  onClose: () => void;
  onUpdated: () => void;
  showToast: (msg: string) => void;
}

interface VariantInfo {
  name: string;
  filename: string;
  url: string;
  sizeKb: string;
  dimensions: string;
  purpose: string;
  status: 'loading' | 'ok' | 'not-found';
}

export const ImageInspectorModal: React.FC<ImageInspectorModalProps> = ({
  product,
  onClose,
  onUpdated,
  showToast
}) => {
  const [variants, setVariants] = useState<VariantInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!product) return;

    const baseFolder = `/products/${product.id}`;
    const initialVariants: VariantInfo[] = [
      {
        name: 'Thumbnail',
        filename: 'thumbnail.webp',
        url: mediaApi.resolveImageUrl(`${baseFolder}/thumbnail.webp`) || '',
        sizeKb: 'Calculando...',
        dimensions: '128 × 128 px (Máx)',
        purpose: 'Tablas, listados compactos e inventario',
        status: 'loading'
      },
      {
        name: 'Punto de Venta',
        filename: 'pos.webp',
        url: mediaApi.resolveImageUrl(`${baseFolder}/pos.webp`) || '',
        sizeKb: 'Calculando...',
        dimensions: '256 × 256 px (Máx)',
        purpose: 'Tarjetas del POS y carrito de compra',
        status: 'loading'
      },
      {
        name: 'Preview',
        filename: 'preview.webp',
        url: mediaApi.resolveImageUrl(`${baseFolder}/preview.webp`) || '',
        sizeKb: 'Calculando...',
        dimensions: '512 × 512 px (Máx)',
        purpose: 'Modales de detalle e inspección visual',
        status: 'loading'
      }
    ];

    setVariants(initialVariants);

    // Fetch HEAD for each variant to check HTTP status and Content-Length
    initialVariants.forEach((v, index) => {
      fetch(v.url, { method: 'HEAD' })
        .then(res => {
          if (res.ok) {
            const length = res.headers.get('content-length');
            const bytes = length ? parseInt(length, 10) : 0;
            const sizeKb = bytes > 0 ? `${(bytes / 1024).toFixed(2)} KB (${bytes.toLocaleString()} bytes)` : '0 KB';
            setVariants(prev => prev.map((item, i) => i === index ? { ...item, sizeKb, status: 'ok' } : item));
          } else {
            setVariants(prev => prev.map((item, i) => i === index ? { ...item, sizeKb: 'No existe en disco', status: 'not-found' } : item));
          }
        })
        .catch(() => {
          setVariants(prev => prev.map((item, i) => i === index ? { ...item, sizeKb: 'No disponible', status: 'not-found' } : item));
        });
    });
  }, [product?.id]);

  if (!product) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        await mediaApi.uploadProductImage(product.id, file);
        showToast(`Variantes regeneradas con éxito para ${product.sku}`);
        onUpdated();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const isLegacyBase64 = product.imageUrl?.startsWith('data:image');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <span>🔍</span>
            <span>Inspector de Variantes: {product.sku}</span>
          </h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{product.nombre}</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                GUID: {product.id} {product.idProducto ? `| ID Secuencial: #${product.idProducto}` : ''}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
              />
              <button
                className="btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Subiendo...' : '📤 Cargar Nueva Imagen'}
              </button>
            </div>
          </div>

          {isLegacyBase64 && (
            <div className="alert-error" style={{ marginBottom: '1rem' }}>
              ⚠️ Este producto contiene una imagen almacenada como Base64 en la base de datos.
              Carga un archivo o pulsa &quot;Migrar Base64 a WebP&quot; para convertirlo a archivos físicos optimizados.
            </div>
          )}

          <h4 style={{ fontSize: '0.84rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Variantes Físicas Generadas en Servidor
          </h4>

          <div className="variants-grid">
            {variants.map(v => (
              <div key={v.name} className="variant-card">
                <div className="variant-title">
                  <span>{v.name}</span>
                  <small style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#fb923c' }}>{v.filename}</small>
                </div>

                <div className="variant-preview-box">
                  {v.status === 'ok' ? (
                    <img src={`${v.url}?t=${Date.now()}`} alt={v.name} />
                  ) : v.status === 'loading' ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>⏳ Verificando...</span>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>❌ No generado</span>
                  )}
                </div>

                <div className="variant-meta">
                  <span>Resolución: <strong>{v.dimensions}</strong></span>
                  <span>Peso en disco: <strong>{v.sizeKb}</strong></span>
                  <p style={{ marginTop: '0.3rem', color: 'var(--text-dim)' }}>{v.purpose}</p>
                </div>

                {v.status === 'ok' && (
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', textAlign: 'center', justifyContent: 'center', marginTop: 'auto' }}
                  >
                    🔗 Abrir original WebP
                  </a>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <h5 style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              Ruta en Disco Servidor (Configurable)
            </h5>
            <code style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              C:\WPCBajioData\Products\{product.id}\*.webp
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
