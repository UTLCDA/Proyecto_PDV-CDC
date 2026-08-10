import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Stock } from '../../types/inventory';
import { inventoryService } from '../../services/inventoryService';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useAuth } from '../../context/AuthContext';
import { permissionCodes } from '../../security/accessControl';
import './InventoryListPage.css';

const DEFAULT_WAREHOUSE_LOCATION = 'Bodega Adolfo Lopez Mateos';
const MAX_EVIDENCE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export const InventoryListPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canCaptureMovements = user?.permissions.some(
    permission => permission.toLowerCase() === permissionCodes.inventoryMovements.toLowerCase()
  ) ?? false;
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [search, setSearch] = useState('');
  const [isLowStockOnly, setIsLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State for Stock Movement Entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementType, setMovementType] = useState<'Entry' | 'Exit' | 'Adjustment'>('Entry');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [referenceDoc, setReferenceDoc] = useState('');
  const [location, setLocation] = useState(DEFAULT_WAREHOUSE_LOCATION);
  const [evidenceImageUrl, setEvidenceImageUrl] = useState('');

  useEffect(() => {
    loadData();
  }, [isLowStockOnly]);

  const loadData = async (searchTerm = search) => {
    setLoading(true);
    setError('');
    try {
      const stockData = await inventoryService.getStockLevels(searchTerm, isLowStockOnly);
      setStocks(stockData);
    } catch (loadError) {
      setStocks([]);
      setError(loadError instanceof Error ? loadError.message : t('inventoryLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();
    e.stopPropagation();
    const scannedCode = e.currentTarget.value.trim();
    setSearch(scannedCode);
    void loadData(scannedCode);
  };

  useBarcodeScanner({
    onScan: (scannedCode: string) => {
      setSearch(scannedCode);
      void loadData(scannedCode);
    }
  });

  const handleOpenMovementModal = () => {
    setSelectedProductId('');
    setMovementType('Entry');
    setQuantity('');
    setReason('');
    setReferenceDoc('');
    setLocation(DEFAULT_WAREHOUSE_LOCATION);
    setEvidenceImageUrl('');
    setIsModalOpen(true);
  };

  const handleEvidenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(t('invalidEvidenceImageType'));
      e.target.value = '';
      return;
    }

    if (file.size > MAX_EVIDENCE_IMAGE_SIZE_BYTES) {
      alert(t('evidenceImageTooLarge'));
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setEvidenceImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRegisterMovement = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      alert(t('invalidMovementQuantity'));
      return;
    }

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
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar el movimiento de inventario.');
    }
  };

  return (
    <div className="inventory-page-container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>🏭 Control de Inventarios WPC Bajío</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Gestión de existencias en almacén, alertas de reorden y captura de movimientos
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="inventory-search-field">
                <input
                  type="text"
                  className="form-control"
                  placeholder={t('searchInventoryPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  data-barcode-input="true"
                  style={{ minWidth: '220px' }}
                />
                <small className="inventory-scanner-hint">▤ {t('barcodeScannerActive')}</small>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isLowStockOnly}
                  onChange={(e) => setIsLowStockOnly(e.target.checked)}
                />
                ⚠️ {t('lowStockOnly')}
              </label>
            </form>

            {canCaptureMovements && (
              <button className="action-btn" onClick={handleOpenMovementModal}>
                ➕ {t('captureMovement')}
              </button>
            )}
          </div>
        </div>

        {error && <div className="inventory-error-notice" role="alert">{error}</div>}

        {loading ? (
          <div>{t('loading')}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-main)', background: 'var(--background-container)' }}>
                  <th style={{ padding: '0.75rem', width: '70px' }}>{t('productImage')}</th>
                  <th style={{ padding: '0.75rem' }}>SKU / {t('productCatalog')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('location')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('stockOnHand')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('minThreshold')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('stockStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {stocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="inventory-empty-state">{t('noInventoryRecords')}</td>
                  </tr>
                )}
                {stocks.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      {s.productImageUrl ? (
                        <img
                          src={s.productImageUrl}
                          alt={s.productName}
                          className="inventory-product-thumbnail"
                        />
                      ) : (
                        <div className="inventory-product-thumbnail-placeholder" aria-label={t('productWithoutImage')}>
                          📷
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.productName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {s.productSku} &bull; {s.categoryName}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{s.location}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, fontSize: '1rem' }}>
                      {s.quantityOnHand} {s.unitOfMeasure}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {s.minimumAlertThreshold} {s.unitOfMeasure}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {s.isOutOfStock ? (
                        <span className="badge badge-danger">
                          🔴 {t('outOfStock')}
                        </span>
                      ) : s.isLowStock ? (
                        <span className="badge badge-warning">
                          ⚠️ {t('lowStockAlert')}
                        </span>
                      ) : (
                        <span className="badge badge-success">
                          🟢 {t('stockOk')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Captura Movimiento de Inventario */}
      {isModalOpen && (
        <div className="inventory-modal-overlay">
          <div className="card inventory-movement-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-movement-modal-title">
            <h3 id="inventory-movement-modal-title">➕ {t('captureStockMovement')}</h3>
            <form onSubmit={handleRegisterMovement} className="inventory-movement-form">
              <div>
                <label className="inventory-field-label" htmlFor="inventory-product">{t('selectProduct')} *</label>
                <select
                  id="inventory-product"
                  className="input-field"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                >
                  <option value="" disabled>{t('selectProductPlaceholder')}</option>
                  {stocks.map(s => (
                    <option key={s.productId} value={s.productId}>{s.productName} ({s.productSku})</option>
                  ))}
                </select>
                {selectedProductId && (() => {
                  const selectedStock = stocks.find(stock => stock.productId === selectedProductId);
                  return selectedStock ? (
                    <div className="inventory-current-stock" role="status">
                      <span>{t('currentStock')}</span>
                      <strong>{selectedStock.quantityOnHand} {selectedStock.unitOfMeasure}</strong>
                    </div>
                  ) : null;
                })()}
              </div>

              <div>
                <label className="inventory-field-label" htmlFor="inventory-movement-type">{t('movementType')} *</label>
                <select
                  id="inventory-movement-type"
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
                <label className="inventory-field-label" htmlFor="inventory-quantity">{t('quantityPieces')} *</label>
                <input
                  id="inventory-quantity"
                  type="number"
                  required
                  min="1"
                  step="1"
                  className="input-field"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div>
                <label className="inventory-field-label" htmlFor="inventory-reason">{t('reasonObservation')} *</label>
                <textarea
                  id="inventory-reason"
                  required
                  rows={4}
                  className="input-field inventory-reason-textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div>
                <label className="inventory-field-label" htmlFor="inventory-reference">{t('referenceDocument')}</label>
                <input
                  id="inventory-reference"
                  type="text"
                  className="input-field"
                  value={referenceDoc}
                  onChange={(e) => setReferenceDoc(e.target.value)}
                />
              </div>

              <div>
                <label className="inventory-field-label" htmlFor="inventory-location">{t('location')} *</label>
                <input
                  id="inventory-location"
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
                <label className="inventory-field-label" htmlFor="inventory-evidence">{t('physicalEvidencePhoto')}</label>
                <input
                  id="inventory-evidence"
                  type="file"
                  accept="image/*"
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
                <button type="submit" className="action-btn">💾 {t('registerMovement')}</button>
                <button type="button" className="lang-btn" onClick={() => setIsModalOpen(false)}>{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryListPage;
