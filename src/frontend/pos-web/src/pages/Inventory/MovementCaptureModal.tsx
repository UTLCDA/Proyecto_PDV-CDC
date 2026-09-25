import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { Producto } from '../../types/tiposCatalogo';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { processAndCompressImage, isImageFile } from '../../utils/imageProcessor';

const DEFAULT_WAREHOUSE_LOCATION = 'Bodega Adolfo Lopez Mateos';

interface MovementCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProductId?: string;
}

export const MovementCaptureModal: React.FC<MovementCaptureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProductId
}) => {
  const { t } = useTranslation();
  const [selectedProductId, setSelectedProductId] = useState(initialProductId || '');
  const [modalProductSearch, setModalProductSearch] = useState('');
  const [modalMatchingProducts, setModalMatchingProducts] = useState<Producto[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedProductInfo, setSelectedProductInfo] = useState<Producto | null>(null);
  const [selectedProductCurrentStock, setSelectedProductCurrentStock] = useState<number | null>(null);
  const [movementType, setMovementType] = useState<'Entry' | 'Exit' | 'Adjustment'>('Entry');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [referenceDoc, setReferenceDoc] = useState('');
  const [location] = useState(DEFAULT_WAREHOUSE_LOCATION);
  const [evidenceImageUrl, setEvidenceImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  const normalizeCode = (str: string) =>
    (str || '').toLowerCase().trim().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFF0D\uFE63]/g, '-');

  // Load product if initialProductId was provided
  useEffect(() => {
    if (!isOpen) return;
    if (initialProductId && !selectedProductInfo) {
      void (async () => {
        try {
          const res = await servicioCatalogo.getProducts(undefined, undefined, { page: 1, pageSize: 100 });
          const items = Array.isArray(res) ? res : res.items;
          const found = items.find(p => p.id === initialProductId);
          if (found) {
            handleSelectModalProduct(found);
          }
        } catch {
          // ignore
        }
      })();
    }
  }, [isOpen, initialProductId]);

  // Reset form when modal closes/opens without initialProductId
  useEffect(() => {
    if (!isOpen) {
      setSelectedProductId('');
      setSelectedProductInfo(null);
      setSelectedProductCurrentStock(null);
      setModalProductSearch('');
      setModalMatchingProducts([]);
      setIsSearchFocused(false);
      setMovementType('Entry');
      setQuantity('');
      setReason('');
      setReferenceDoc('');
      setEvidenceImageUrl('');
      setErrorNotice('');
      setSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || selectedProductInfo) {
      setModalMatchingProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const rawTerm = modalProductSearch.trim();
        const term = normalizeCode(rawTerm);
        // Request at least 100 items so at least 30+ items appear in the dropdown
        const res = await servicioCatalogo.getProducts(rawTerm || undefined, undefined, { page: 1, pageSize: 100 });
        const items = Array.isArray(res) ? res : res.items;
        if (!term) {
          // Show active items (at least 30) when search is empty or focused
          setModalMatchingProducts(items.filter(p => p.isActive).slice(0, 50));
          return;
        }
        const cleanTerm = term.replace(/-/g, '').replace(/\s+/g, '');
        const filtered = items.filter(p => {
          if (!p.isActive) return false;
          const sku = normalizeCode(p.sku || '');
          const bar = normalizeCode(p.barcode || '');
          const name = (p.name || '').toLowerCase();
          const cleanSku = sku.replace(/-/g, '').replace(/\s+/g, '');
          const cleanBar = bar.replace(/-/g, '').replace(/\s+/g, '');
          const cleanName = name.replace(/-/g, '').replace(/\s+/g, '');
          return (
            sku.includes(term) ||
            bar.includes(term) ||
            name.includes(term) ||
            (cleanTerm !== '' && (cleanSku.includes(cleanTerm) || cleanBar.includes(cleanTerm) || cleanName.includes(cleanTerm)))
          );
        });
        setModalMatchingProducts(filtered.slice(0, 50));
      } catch {
        setModalMatchingProducts([]);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [modalProductSearch, selectedProductInfo, isOpen]);

  useBarcodeScanner({
    onScan: (scannedCode: string) => {
      if (!isOpen) return;
      setModalProductSearch(scannedCode);
      setSelectedProductInfo(null);
      setSelectedProductId('');
      setSelectedProductCurrentStock(null);
      setIsSearchFocused(true);
    }
  });

  const handleSelectModalProduct = async (prod: Producto) => {
    setSelectedProductId(prod.id);
    setSelectedProductInfo(prod);
    setModalMatchingProducts([]);
    setIsSearchFocused(false);
    setModalProductSearch(`${prod.sku} — ${prod.name}`);
    setErrorNotice('');
    const initialQty = typeof prod.availableQuantity === 'number' ? prod.availableQuantity : 0;
    setSelectedProductCurrentStock(initialQty);
    try {
      const stock = await inventoryService.getStockByProductId(prod.id);
      if (stock != null && typeof stock.quantityOnHand === 'number') {
        setSelectedProductCurrentStock(stock.quantityOnHand);
      }
    } catch {
      // keep initialQty
    }
  };

  const handleEvidenceImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      alert(t('invalidEvidenceImageType'));
      e.target.value = '';
      return;
    }

    try {
      const compressedBase64 = await processAndCompressImage(file, {
        maxDimension: 1200,
        quality: 0.82
      });
      setEvidenceImageUrl(compressedBase64);
    } catch (err: any) {
      console.error('Error al procesar evidencia:', err);
      alert(err.message || t('evidenceProcessError'));
    } finally {
      e.target.value = '';
    }
  };

  // Live stock calculation preview
  const currentStock = selectedProductCurrentStock ?? 0;
  const parsedQuantity = Number(quantity);
  const isValidQuantity = Number.isFinite(parsedQuantity) && parsedQuantity >= 0;

  const stockCalculation = useMemo(() => {
    if (!selectedProductInfo || !isValidQuantity || quantity.trim() === '') {
      return null;
    }

    if (movementType === 'Adjustment') {
      const diff = parsedQuantity - currentStock;
      return {
        previousStock: currentStock,
        movementText: `${parsedQuantity} pzas`,
        diff,
        newStock: parsedQuantity,
        isWarning: false
      };
    } else if (movementType === 'Entry') {
      const newStock = currentStock + parsedQuantity;
      return {
        previousStock: currentStock,
        movementText: `+${parsedQuantity} pzas`,
        diff: parsedQuantity,
        newStock,
        isWarning: false
      };
    } else {
      // Exit
      const newStock = currentStock - parsedQuantity;
      return {
        previousStock: currentStock,
        movementText: `-${parsedQuantity} pzas`,
        diff: -parsedQuantity,
        newStock,
        isWarning: newStock < 0
      };
    }
  }, [currentStock, isValidQuantity, movementType, parsedQuantity, quantity, selectedProductInfo]);

  const handleRegisterMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice('');

    if (!selectedProductId) {
      setErrorNotice(t('selectProduct'));
      return;
    }

    if (!Number.isFinite(parsedQuantity) || (movementType !== 'Adjustment' && parsedQuantity <= 0) || (movementType === 'Adjustment' && parsedQuantity < 0)) {
      setErrorNotice(t('invalidMovementQuantity'));
      return;
    }

    if (movementType === 'Exit' && currentStock < parsedQuantity) {
      setErrorNotice(t('insufficientStockWarning'));
      return;
    }

    setSubmitting(true);
    try {
      await inventoryService.registerMovement({
        productId: selectedProductId,
        movementType,
        quantity: parsedQuantity,
        reason: reason.trim(),
        referenceNumber: referenceDoc.trim(),
        location: location.trim(),
        evidenceImageUrl
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorNotice(err.message || t('inventoryMovementError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="inventory-modal-overlay">
      <div className="card inventory-movement-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-movement-modal-title">
        <h3 id="inventory-movement-modal-title">➕ {t('captureStockMovement')}</h3>

        {errorNotice && (
          <div className="inventory-error-notice" role="alert" style={{ margin: '0.75rem 0' }}>
            {errorNotice}
          </div>
        )}

        <form onSubmit={handleRegisterMovement} className="inventory-movement-form">
          <div>
            <label className="inventory-field-label" htmlFor="inventory-product-search">
              🔍 {t('searchProductWithCodeModal')} *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="inventory-product-search"
                type="text"
                className="input-field"
                placeholder={t('scanOrTypeSkuPlaceholder')}
                value={modalProductSearch}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={(e) => {
                  setModalProductSearch(e.target.value);
                  if (selectedProductInfo) {
                    setSelectedProductInfo(null);
                    setSelectedProductId('');
                    setSelectedProductCurrentStock(null);
                  }
                }}
                autoComplete="off"
                required
              />
              {(isSearchFocused || modalProductSearch.trim().length > 0) && modalMatchingProducts.length > 0 && !selectedProductInfo && (
                <ul style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--background-surface)',
                  border: '1px solid var(--border-hover)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-card)',
                  listStyle: 'none',
                  padding: 0,
                  margin: '0.25rem 0 0',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  zIndex: 1000
                }}>
                  {modalMatchingProducts.map(p => (
                    <li
                      key={p.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectModalProduct(p);
                      }}
                      onClick={() => handleSelectModalProduct(p)}
                      style={{
                        padding: '0.6rem 0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-subtle)'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--primary-main)' }}>{p.sku}</strong> — {p.name}
                        {p.barcode && <small style={{ display: 'block', color: 'var(--text-muted)' }}>Cód: {p.barcode}</small>}
                      </div>
                      <span className="badge badge-info">{p.availableQuantity ?? 0} pzas</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedProductInfo && (
              <div className="inventory-current-stock" style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{selectedProductInfo.sku}</strong> — {selectedProductInfo.name}
                </div>
                <div>
                  <span>{t('previousQuantity')}: </span>
                  <strong style={{ color: 'var(--primary-main)', fontSize: '1.05rem' }}>
                    {selectedProductCurrentStock ?? selectedProductInfo.availableQuantity ?? 0} Piezas
                  </strong>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="inventory-field-label" htmlFor="inventory-modal-movement-type">{t('movementType')} *</label>
            <select
              id="inventory-modal-movement-type"
              className="input-field"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as 'Entry' | 'Exit' | 'Adjustment')}
            >
              <option value="Entry">📥 {t('movementEntryOption')}</option>
              <option value="Exit">📤 {t('movementExitOption')}</option>
              <option value="Adjustment">⚖️ {t('movementAdjustmentOption')}</option>
            </select>
          </div>

          <div>
            <label className="inventory-field-label" htmlFor="inventory-modal-quantity">
              {movementType === 'Adjustment'
                ? `⚖️ ${t('adjustmentTargetPieces')} *`
                : `${t('quantityPieces')} *`}
            </label>
            <input
              id="inventory-modal-quantity"
              type="number"
              required
              min={movementType === 'Adjustment' ? '0' : '1'}
              step="1"
              className="input-field"
              placeholder={movementType === 'Adjustment' ? 'Ej. 25 (conteo físico exacto)' : 'Ej. 10'}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          {/* Detailed Live Stock Preview: Cantidad Anterior -> Ajuste/Cambio -> Stock Resultante */}
          {stockCalculation && (
            <div className="inventory-stock-calculation-box">
              <span className="inventory-stock-calculation-title">
                📊 {t('movementPreview')}
              </span>
              <div className="inventory-stock-calculation-grid">
                <div className="inventory-stock-calculation-item">
                  <span className="item-label">{t('previousQuantity')}</span>
                  <span className="item-value">{stockCalculation.previousStock} pzas</span>
                </div>
                <div className="inventory-stock-calculation-item">
                  <span className="item-label">
                    {movementType === 'Adjustment' ? t('movementAdjustment') : movementType === 'Entry' ? t('movementEntry') : t('movementExit')}
                  </span>
                  <span className="item-value" style={{
                    color: movementType === 'Entry' ? 'var(--success)' : movementType === 'Exit' ? 'var(--danger)' : 'inherit'
                  }}>
                    {stockCalculation.movementText}
                  </span>
                  {movementType === 'Adjustment' && (
                    <span className={`inventory-stock-diff-badge ${
                      stockCalculation.diff > 0 ? 'positive' : stockCalculation.diff < 0 ? 'negative' : 'neutral'
                    }`}>
                      {stockCalculation.diff > 0 ? `+${stockCalculation.diff}` : stockCalculation.diff} dif
                    </span>
                  )}
                </div>
                <div className="inventory-stock-calculation-item">
                  <span className="item-label">{t('newQuantity')}</span>
                  <span className="item-value" style={{
                    color: stockCalculation.isWarning ? 'var(--danger)' : 'var(--primary-main)',
                    fontWeight: 800
                  }}>
                    {stockCalculation.newStock} pzas
                  </span>
                </div>
              </div>
              {stockCalculation.isWarning && (
                <small style={{ color: 'var(--danger)', fontWeight: 600, display: 'block', textAlign: 'center' }}>
                  ⚠️ {t('insufficientStockWarning')}
                </small>
              )}
            </div>
          )}

          <div>
            <label className="inventory-field-label" htmlFor="inventory-modal-reason">{t('reasonObservation')} *</label>
            <textarea
              id="inventory-modal-reason"
              required
              rows={3}
              className="input-field inventory-reason-textarea"
              placeholder={movementType === 'Adjustment' ? 'Ej. Ajuste por conteo físico en bodega mensual' : ''}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div>
            <label className="inventory-field-label" htmlFor="inventory-modal-reference">{t('referenceDocument')}</label>
            <input
              id="inventory-modal-reference"
              type="text"
              className="input-field"
              placeholder="Ej. ACTA-INV-001 o FAC-10492"
              value={referenceDoc}
              onChange={(e) => setReferenceDoc(e.target.value)}
            />
          </div>

          <div>
            <label className="inventory-field-label" htmlFor="inventory-modal-location">{t('location')} *</label>
            <input
              id="inventory-modal-location"
              type="text"
              required
              maxLength={200}
              className="input-field"
              value={location}
              readOnly
            />
            <small className="inventory-field-hint">{t('temporaryDefaultWarehouse')}</small>
          </div>

          <div>
            <label className="inventory-field-label" htmlFor="inventory-modal-evidence">{t('physicalEvidencePhoto')}</label>
            <input
              id="inventory-modal-evidence"
              type="file"
              accept="image/*,.heic,.heif,.HEIC,.HEIF"
              className="input-field inventory-file-input"
              onChange={handleEvidenceImageChange}
            />
            <small className="inventory-field-hint">{t('physicalEvidenceHint')}</small>
            {evidenceImageUrl && (
              <div className="inventory-evidence-preview-container">
                <img src={evidenceImageUrl} alt={t('physicalEvidencePreview')} className="inventory-evidence-preview" />
                <button type="button" className="lang-btn" onClick={() => setEvidenceImageUrl('')}>
                  {t('removeEvidenceImage')}
                </button>
              </div>
            )}
          </div>

          <div className="inventory-modal-actions">
            <button type="submit" className="action-btn" disabled={submitting}>
              {submitting ? '...' : `💾 ${t('registerMovement')}`}
            </button>
            <button type="button" className="lang-btn" onClick={onClose} disabled={submitting}>
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default MovementCaptureModal;
