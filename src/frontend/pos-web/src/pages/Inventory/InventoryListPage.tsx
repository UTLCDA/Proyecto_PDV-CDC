import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Stock, InventoryMovement } from '../../types/inventory';
import { inventoryService } from '../../services/inventoryService';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import './InventoryListPage.css';

const DEFAULT_WAREHOUSE_LOCATION = 'Bodega Adolfo Lopez Mateos';
const MAX_EVIDENCE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const getMovementTranslationKey = (movementType: string) => {
  switch (movementType.trim().toLowerCase()) {
    case 'entry':
    case 'entrada':
    case 'entradas':
      return 'movementEntry';
    case 'exit':
    case 'salida':
    case 'salidas':
      return 'movementExit';
    case 'adjustment':
    case 'ajuste':
      return 'movementAdjustment';
    case 'sale':
    case 'venta':
      return 'movementSale';
    case 'return':
    case 'devolucion':
    case 'devolución':
      return 'movementReturn';
    default:
      return null;
  }
};

const getMovementBadgeClass = (movementType: string) => {
  const normalizedType = movementType.trim().toLowerCase();
  if (['entry', 'entrada', 'entradas', 'return', 'devolucion', 'devolución'].includes(normalizedType)) {
    return 'badge-success';
  }
  if (['exit', 'salida', 'salidas'].includes(normalizedType)) {
    return 'badge-danger';
  }
  if (['adjustment', 'ajuste'].includes(normalizedType)) {
    return 'badge-info';
  }
  return 'badge-warning';
};

export const InventoryListPage: React.FC = () => {
  const { t } = useTranslation();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [search, setSearch] = useState('');
  const [isLowStockOnly, setIsLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal State for Stock Movement Entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementType, setMovementType] = useState<'Entry' | 'Exit' | 'Adjustment'>('Entry');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [referenceDoc, setReferenceDoc] = useState('');
  const [location, setLocation] = useState(DEFAULT_WAREHOUSE_LOCATION);
  const [evidenceImageUrl, setEvidenceImageUrl] = useState('');
  const [selectedEvidenceImageUrl, setSelectedEvidenceImageUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [isLowStockOnly]);

  useEffect(() => {
    if (!selectedEvidenceImageUrl) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedEvidenceImageUrl(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEvidenceImageUrl]);

  const loadData = async (searchTerm = search) => {
    setLoading(true);
    try {
      const stockData = await inventoryService.getStockLevels(searchTerm, isLowStockOnly);
      const movementData = await inventoryService.getMovements();
      setStocks(stockData);
      setMovements(movementData);
    } catch {
      setStocks([
        {
          id: 'st-1',
          productId: 'p-1',
          productSku: 'LAM-INT-TEKA',
          productName: 'Lambrín Interior WPC Tono Teka',
          categoryName: 'Lambrín Interior WPC',
          quantityOnHand: 150,
          minimumAlertThreshold: 20,
          reorderQuantity: 100,
          unitOfMeasure: 'Pza',
          location: 'Nave A - Pasillo 3',
          isLowStock: false,
          isOutOfStock: false
        },
        {
          id: 'st-2',
          productId: 'p-2',
          productSku: 'LAM-EXT-ROBLE',
          productName: 'Lambrín Exterior Co-Extrusión Roble Oscuro',
          categoryName: 'Lambrín Exterior Co-Extrusión',
          quantityOnHand: 8,
          minimumAlertThreshold: 15,
          reorderQuantity: 50,
          unitOfMeasure: 'Pza',
          location: 'Nave B - Pasillo 1',
          isLowStock: true,
          isOutOfStock: false
        }
      ]);
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

            <button className="action-btn" onClick={handleOpenMovementModal}>
              ➕ {t('captureMovement')}
            </button>
          </div>
        </div>

        {loading ? (
          <div>{t('loading')}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem', width: '70px' }}>{t('productImage')}</th>
                  <th style={{ padding: '0.75rem' }}>SKU / {t('productCatalog')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('location')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('stockOnHand')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('minThreshold')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('stockStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
                      <div style={{ fontWeight: 600, color: '#fff' }}>{s.productName}</div>
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
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
                          🔴 {t('outOfStock')}
                        </span>
                      ) : s.isLowStock ? (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)' }}>
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

      {/* Histórico de Movimientos */}
      {movements.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>📋 {t('recentMovementsLog')}</h3>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem' }}>{t('date')}</th>
                  <th style={{ padding: '0.5rem' }}>{t('productCatalog')}</th>
                  <th style={{ padding: '0.5rem' }}>{t('type')}</th>
                  <th style={{ padding: '0.5rem' }}>{t('quantity')}</th>
                  <th style={{ padding: '0.5rem' }}>{t('previousQuantity')}</th>
                  <th style={{ padding: '0.5rem' }}>{t('newQuantity')}</th>
                  <th style={{ padding: '0.5rem' }}>{t('physicalEvidence')}</th>
                  <th style={{ padding: '0.5rem' }}>{t('reason')}</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const movementTranslationKey = getMovementTranslationKey(m.movementType);
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                        {new Date(m.createdAtUtc).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.5rem' }}>{m.productName || m.productSku}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span className={`badge ${getMovementBadgeClass(m.movementType)}`}>
                          {movementTranslationKey ? t(movementTranslationKey) : m.movementType}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>{m.quantity}</td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{m.previousQuantity}</td>
                      <td style={{ padding: '0.5rem', fontWeight: 700 }}>{m.newQuantity}</td>
                      <td style={{ padding: '0.5rem' }}>
                        {m.evidenceImageUrl ? (
                          <button
                            type="button"
                            className="inventory-evidence-thumbnail-button"
                            onClick={() => setSelectedEvidenceImageUrl(m.evidenceImageUrl ?? null)}
                            aria-label={t('viewPhysicalEvidence')}
                          >
                            <img
                              src={m.evidenceImageUrl}
                              alt={t('physicalEvidence')}
                              className="inventory-evidence-thumbnail"
                            />
                          </button>
                        ) : (
                          <span className="inventory-no-evidence">—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{m.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  onChange={(e) => setLocation(e.target.value)}
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

      {selectedEvidenceImageUrl && (
        <div
          className="inventory-evidence-modal-overlay"
          role="presentation"
          onClick={() => setSelectedEvidenceImageUrl(null)}
        >
          <div
            className="inventory-evidence-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-evidence-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-evidence-modal-header">
              <h3 id="inventory-evidence-modal-title">{t('physicalEvidenceDialogTitle')}</h3>
              <button
                type="button"
                className="inventory-evidence-close-button"
                onClick={() => setSelectedEvidenceImageUrl(null)}
                aria-label={t('closeEvidence')}
              >
                ×
              </button>
            </div>
            <img
              src={selectedEvidenceImageUrl}
              alt={t('physicalEvidence')}
              className="inventory-evidence-modal-image"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryListPage;
