import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Stock } from '../../types/inventory';
import { inventoryService } from '../../services/inventoryService';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useAuth } from '../../context/AuthContext';
import { permissionCodes } from '../../security/accessControl';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableTh } from '../../components/common/SortableTh';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../../components/common/TablePagination';
import { loadAllPagesForExport } from '../../utils/pagedExport';
import MovementCaptureModal from './MovementCaptureModal';
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
    setIsModalOpen(true);
  };

  return (
    <div className="inventory-page-container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>🏭 {t('inventoryControlTitle')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('inventoryControlSubtitle')}
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

      <MovementCaptureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => void loadData()}
      />

    </div>
  );
};

export default InventoryListPage;
