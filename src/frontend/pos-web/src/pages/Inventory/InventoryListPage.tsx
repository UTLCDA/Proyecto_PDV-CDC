import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Stock } from '../../types/inventory';
import { inventoryService } from '../../services/inventoryService';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { Producto } from '../../types/tiposCatalogo';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useAuth } from '../../context/AuthContext';
import { permissionCodes } from '../../security/accessControl';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { processAndCompressImage, isImageFile } from '../../utils/imageProcessor';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableTh } from '../../components/common/SortableTh';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../../components/common/TablePagination';
import { loadAllPagesForExport } from '../../utils/pagedExport';
import './InventoryListPage.css';

const DEFAULT_WAREHOUSE_LOCATION = 'Bodega Adolfo Lopez Mateos';

export const InventoryListPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canCaptureMovements = user?.permissions.some(
    permission => permission.toLowerCase() === permissionCodes.inventoryMovements.toLowerCase()
  ) ?? false;
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [search, setSearch] = useState('');
  const [isLowStockOnly, setIsLowStockOnly] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({ search: '', isLowStockOnly: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pagination = usePagination({ initialPageSize: 25 });

  const { sortedData: sortedStocks, sortKey, sortDirection, handleSort } = useTableSort(stocks, {
    valueExtractors: {
      product: s => `${s.productName} ${s.productSku}`,
      location: s => s.location,
      quantityOnHand: s => s.quantityOnHand,
      minimumAlertThreshold: s => s.minimumAlertThreshold,
      status: s => (s.isOutOfStock ? 0 : s.isLowStock ? 1 : 2)
    }
  });

  const exportConfig = useMemo<ExportReportConfig<Stock>>(() => ({
    moduleName: 'Control de Inventarios WPC Bajío',
    title: 'Existencias de Inventario',
    fileName: 'Inventario',
    sheetName: 'Inventario',
    orientation: 'landscape',
    filters: [
      { label: 'Búsqueda', value: appliedFilters.search },
      { label: 'Stock', value: appliedFilters.isLowStockOnly ? 'Sólo stock bajo' : 'Todas las existencias' }
    ],
    columns: [
      { key: 'sku', label: 'SKU / 编号', width: 0.9, value: stock => stock.productSku },
      { key: 'product', label: 'Producto / 产品', width: 1.8, value: stock => stock.productName },
      { key: 'category', label: 'Categoría / 类别', width: 1.1, value: stock => stock.categoryName },
      { key: 'location', label: 'Ubicación / 仓库位置', width: 1.4, value: stock => stock.location },
      { key: 'stock', label: 'Piezas / 现货件数', type: 'number', width: 1, value: stock => stock.quantityOnHand },
      { key: 'unit', label: 'Unidad / 单位', width: 0.7, value: () => 'Piezas' },
      { key: 'minimum', label: 'Mínimo (Piezas) / 最低预警', type: 'number', width: 0.9, value: stock => stock.minimumAlertThreshold },
      { key: 'reorder', label: 'Reorden Sugerido / 建议补货', type: 'number', width: 1.1, value: stock => stock.reorderQuantity },
      { key: 'status', label: 'Estado / 状态', width: 0.9, value: stock => stock.isOutOfStock ? t('outOfStock') : stock.isLowStock ? t('lowStockAlert') : t('stockOk') }
    ]
  }), [appliedFilters, t]);

  // Modal State for Stock Movement Entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [modalProductSearch, setModalProductSearch] = useState('');
  const [modalMatchingProducts, setModalMatchingProducts] = useState<Producto[]>([]);
  const [selectedProductInfo, setSelectedProductInfo] = useState<Producto | null>(null);
  const [selectedProductCurrentStock, setSelectedProductCurrentStock] = useState<number | null>(null);
  const [movementType, setMovementType] = useState<'Entry' | 'Exit' | 'Adjustment'>('Entry');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [referenceDoc, setReferenceDoc] = useState('');
  const [location, setLocation] = useState(DEFAULT_WAREHOUSE_LOCATION);
  const [evidenceImageUrl, setEvidenceImageUrl] = useState('');

  const normalizeCode = (str: string) =>
    str.toLowerCase().trim().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFF0D\uFE63]/g, '-');

  useEffect(() => {
    if (!modalProductSearch.trim() || selectedProductInfo) {
      setModalMatchingProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const term = normalizeCode(modalProductSearch);
        const res = await servicioCatalogo.getProducts(term, undefined, { page: 1, pageSize: 20 });
        const items = Array.isArray(res) ? res : res.items;
        const cleanTerm = term.replace(/-/g, '');
        const filtered = items.filter(p => {
          if (!p.isActive) return false;
          const sku = normalizeCode(p.sku);
          const bar = normalizeCode(p.barcode || '');
          return sku.includes(term) || bar.includes(term) || sku.replace(/-/g, '').includes(cleanTerm) || bar.replace(/-/g, '').includes(cleanTerm);
        });
        setModalMatchingProducts(filtered);
      } catch {
        setModalMatchingProducts([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [modalProductSearch, selectedProductInfo]);

  const handleSelectModalProduct = async (prod: Producto) => {
    setSelectedProductId(prod.id);
    setSelectedProductInfo(prod);
    setModalMatchingProducts([]);
    setModalProductSearch(`${prod.sku} — ${prod.name}`);
    try {
      const stock = await inventoryService.getStockByProductId(prod.id);
      setSelectedProductCurrentStock(stock ? stock.quantityOnHand : 0);
    } catch {
      setSelectedProductCurrentStock(0);
    }
  };

  const loadData = async (searchTerm = search) => {
    setLoading(true);
    setError('');
    try {
      const stockData = await inventoryService.getStockLevels(
        searchTerm.trim() || undefined,
        isLowStockOnly,
        { page: pagination.pageNumber, pageSize: pagination.pageSize },
        sortKey,
        sortDirection
      );
      const items = Array.isArray(stockData) ? stockData : stockData.items;
      setStocks(items);
      if (!Array.isArray(stockData)) pagination.setPaginationFromResult(stockData);
      setAppliedFilters({ search: searchTerm.trim(), isLowStockOnly });
    } catch (loadError) {
      setStocks([]);
      setError(loadError instanceof Error ? loadError.message : t('inventoryLoadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isLowStockOnly, pagination.pageNumber, pagination.pageSize, sortKey, sortDirection]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pagination.resetPage();
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
    setSelectedProductInfo(null);
    setSelectedProductCurrentStock(null);
    setModalProductSearch('');
    setModalMatchingProducts([]);
    setMovementType('Entry');
    setQuantity('');
    setReason('');
    setReferenceDoc('');
    setLocation(DEFAULT_WAREHOUSE_LOCATION);
    setEvidenceImageUrl('');
    setIsModalOpen(true);
  };

  const handleEvidenceImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      alert(t('invalidEvidenceImageType') || 'Seleccione un archivo de imagen válido (JPG, PNG, WEBP, HEIC).');
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
      alert(err.message || t('inventoryMovementError'));
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
            <ExportButtons
              data={stocks}
              config={exportConfig}
              onLoadAllData={kind => loadAllPagesForExport(kind, paging => inventoryService.getStockLevels(appliedFilters.search || undefined, appliedFilters.isLowStockOnly, paging, sortKey, sortDirection))}
            />
          </div>
        </div>

        {error && <div className="inventory-error-notice" role="alert">{error}</div>}

        {loading ? (
          <div>{t('loading')}</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-main)', background: 'var(--background-container)' }}>
                  <th style={{ padding: '0.75rem', width: '70px' }}>{t('productImage')}</th>
                  <SortableTh columnKey="product" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} style={{ padding: '0.75rem' }}>
                    {t('skuProduct')}
                  </SortableTh>
                  <SortableTh columnKey="location" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} style={{ padding: '0.75rem' }}>
                    {t('location')}
                  </SortableTh>
                  <SortableTh columnKey="quantityOnHand" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} style={{ padding: '0.75rem' }}>
                    {t('stockOnHand')}
                  </SortableTh>
                  <SortableTh columnKey="minimumAlertThreshold" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} style={{ padding: '0.75rem' }}>
                    {t('minThreshold')}
                  </SortableTh>
                  <SortableTh columnKey="status" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} style={{ padding: '0.75rem' }}>
                    {t('stockStatus')}
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sortedStocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="inventory-empty-state">{t('noInventoryRecords')}</td>
                  </tr>
                )}
                {sortedStocks.map((s) => (
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
                      {s.quantityOnHand} Piezas
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {s.minimumAlertThreshold} Piezas
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
          <TablePagination
            pageNumber={pagination.pageNumber}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPageNumber}
            onPageSizeChange={pagination.setPageSize}
            disabled={loading}
          />
        </>
      )}
      </div>

      {/* Modal Captura Movimiento de Inventario */}
      {isModalOpen && (
        <div className="inventory-modal-overlay">
          <div className="card inventory-movement-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-movement-modal-title">
            <h3 id="inventory-movement-modal-title">➕ {t('captureStockMovement')}</h3>
            <form onSubmit={handleRegisterMovement} className="inventory-movement-form">
              <div>
                <label className="inventory-field-label" htmlFor="inventory-product-search">
                  🔍 Buscar Producto (SKU / Código de barras / 货号 / 条形码) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="inventory-product-search"
                    type="text"
                    className="input-field"
                    placeholder="🔍 Escanear o escribir SKU / Código de barras..."
                    value={modalProductSearch}
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
                  {modalMatchingProducts.length > 0 && (
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
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000
                    }}>
                      {modalMatchingProducts.map(p => (
                        <li
                          key={p.id}
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
                          <span className="badge badge-info">{p.availableQuantity} pzas</span>
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
                      <span>{t('currentStock')}: </span>
                      <strong style={{ color: 'var(--primary-main)' }}>{selectedProductCurrentStock ?? selectedProductInfo.availableQuantity} Piezas</strong>
                    </div>
                  </div>
                )}
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
