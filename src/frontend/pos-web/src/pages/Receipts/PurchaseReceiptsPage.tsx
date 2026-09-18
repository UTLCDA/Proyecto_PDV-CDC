import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PurchaseReceipt } from '../../types/purchaseReceipt';
import { purchaseReceiptService } from '../../services/purchaseReceiptService';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { inventoryService } from '../../services/inventoryService';
import { Producto } from '../../types/tiposCatalogo';
import TablePagination from '../../components/common/TablePagination';
import { usePagination } from '../../hooks/usePagination';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableTh } from '../../components/common/SortableTh';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { loadAllPagesForExport } from '../../utils/pagedExport';
import './PurchaseReceiptsPage.css';

export const PurchaseReceiptsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  // Pagination & Sorting
  const pagination = usePagination({ initialPageSize: 25 });
  const { sortedData: sortedReceipts, sortKey, sortDirection, handleSort } = useTableSort(receipts, {
    valueExtractors: {
      folio: r => r.folio,
      fechacreacionutc: r => r.fechaCreacionUtc,
      idproducto: r => r.idProducto,
      nombreproducto: r => r.nombreProducto,
      sku: r => r.sku,
      preciocosto: r => r.precioCosto,
      cantidad: r => r.cantidad
    }
  });

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<PurchaseReceipt | null>(null);
  const [voucherReceipt, setVoucherReceipt] = useState<PurchaseReceipt | null>(null);

  // Form State
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [matchingProducts, setMatchingProducts] = useState<Producto[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [selectedProductStock, setSelectedProductStock] = useState<number>(0);
  const [formCantidad, setFormCantidad] = useState('');
  const [formPrecioCosto, setFormPrecioCosto] = useState('0');
  const [formNotas, setFormNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const isZh = i18n.language.startsWith('zh');
  const currencyFormatter = useMemo(() => new Intl.NumberFormat(isZh ? 'zh-CN' : 'es-MX', {
    style: 'currency',
    currency: 'MXN'
  }), [isZh]);

  const loadReceipts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await purchaseReceiptService.getReceipts(
        appliedSearch || undefined,
        { page: pagination.pageNumber, pageSize: pagination.pageSize },
        sortKey,
        sortDirection
      );
      setReceipts(res.items);
      pagination.setPaginationFromResult(res);
    } catch (err: any) {
      setError(err.message || t('errorLoadingReceipts'));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, pagination.pageNumber, pagination.pageSize, sortKey, sortDirection, t]);

  useEffect(() => {
    void loadReceipts();
  }, [loadReceipts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pagination.setPageNumber(1);
    setAppliedSearch(search.trim());
  };

  const handleClearFilters = () => {
    setSearch('');
    setAppliedSearch('');
    pagination.setPageNumber(1);
  };

  // Product Search inside Modal
  useEffect(() => {
    if (!productSearchTerm.trim() || selectedProduct) {
      setMatchingProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await servicioCatalogo.getProducts(productSearchTerm.trim(), undefined, { page: 1, pageSize: 20 });
        const items = Array.isArray(res) ? res : res.items;
        setMatchingProducts(items.filter(p => p.isActive));
      } catch {
        setMatchingProducts([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearchTerm, selectedProduct]);

  const handleSelectProduct = async (prod: Producto) => {
    setSelectedProduct(prod);
    setMatchingProducts([]);
    setProductSearchTerm(`${prod.sku} — ${prod.name}`);
    setFormPrecioCosto(prod.unitCost ? String(prod.unitCost) : '0');

    try {
      const stockInfo = await inventoryService.getStockByProductId(prod.id);
      setSelectedProductStock(stockInfo ? stockInfo.quantityOnHand : 0);
    } catch {
      setSelectedProductStock(0);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingReceipt(null);
    setSelectedProduct(null);
    setSelectedProductStock(0);
    setProductSearchTerm('');
    setFormCantidad('');
    setFormPrecioCosto('0');
    setFormNotas('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (receipt: PurchaseReceipt) => {
    setEditingReceipt(receipt);
    setSelectedProduct(null);
    setFormCantidad(String(receipt.cantidad));
    setFormPrecioCosto(String(receipt.precioCosto));
    setFormNotas(receipt.notas || '');
    setIsModalOpen(true);
  };

  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(formCantidad);
    if (!qty || qty <= 0) {
      setError(t('invalidQuantity'));
      return;
    }
    const cost = parseFloat(formPrecioCosto) || 0;

    try {
      setSaving(true);
      setError(null);
      if (editingReceipt) {
        await purchaseReceiptService.updateReceipt(editingReceipt.id, {
          cantidad: qty,
          precioCosto: cost,
          notas: formNotas.trim() || undefined
        });
        setNotice(t('receiptUpdatedSuccess', { folio: editingReceipt.folio }));
      } else {
        if (!selectedProduct) {
          setError(t('selectProductRequired'));
          setSaving(false);
          return;
        }
        const created = await purchaseReceiptService.createReceipt({
          productoId: selectedProduct.id,
          cantidad: qty,
          precioCosto: cost,
          notas: formNotas.trim() || undefined
        });
        setNotice(t('receiptCreatedSuccess', { folio: created.folio }));
      }
      setIsModalOpen(false);
      await loadReceipts();
    } catch (err: any) {
      setError(err.message || t('errorSavingReceipt'));
    } finally {
      setSaving(false);
    }
  };

  // Live resultant stock calculation
  const calculatedResultantStock = useMemo(() => {
    const qty = parseFloat(formCantidad) || 0;
    if (editingReceipt) {
      return editingReceipt.inventarioAnterior + qty;
    }
    return selectedProductStock + qty;
  }, [editingReceipt, selectedProductStock, formCantidad]);

  const exportConfig = useMemo<ExportReportConfig<PurchaseReceipt>>(() => ({
    moduleName: 'Recibos de Compra',
    title: 'Histórico de Recibos de Compra',
    fileName: 'Recibos_Compra',
    sheetName: 'Recibos',
    orientation: 'landscape',
    filters: [
      { label: 'Búsqueda', value: appliedSearch || 'Todos' }
    ],
    columns: [
      { key: 'folio', label: 'Folio / 单号', width: 1.2, value: r => r.folio },
      { key: 'fecha', label: 'Fecha / 日期', type: 'datetime', width: 1.2, value: r => r.fechaCreacionUtc },
      { key: 'idProducto', label: 'ID Prod. / 产品编号', type: 'number', width: 0.8, value: r => r.idProducto },
      { key: 'nombreProducto', label: 'Producto / 产品说明', width: 2, value: r => r.nombreProducto },
      { key: 'sku', label: 'SKU / 货号', width: 1.2, value: r => r.sku },
      { key: 'codigoBarras', label: 'Código Barras / 条形码', width: 1.2, value: r => r.codigoBarras },
      { key: 'precioCosto', label: 'Precio Costo / 成本价', type: 'currency', width: 1, value: r => r.precioCosto },
      { key: 'precioVenta', label: 'Precio Venta / 零售价', type: 'currency', width: 1, value: r => r.precioVenta },
      { key: 'inventarioAnterior', label: 'Stock Previo / 原库存', type: 'number', width: 1, value: r => r.inventarioAnterior },
      { key: 'cantidad', label: 'Cantidad / 进货数量', type: 'number', width: 1, value: r => r.cantidad },
      { key: 'inventarioResultante', label: 'Stock Resultante / 最终库存', type: 'number', width: 1, value: r => r.inventarioResultante },
      { key: 'notas', label: 'Notas / 备注', width: 2, value: r => r.notas || '' }
    ]
  }), [appliedSearch]);

  return (
    <section className="receipts-page">
      <header className="receipts-header">
        <div>
          <h1>📦 {t('purchaseReceiptsTitle')}</h1>
          <p>{t('purchaseReceiptsSubtitle')}</p>
        </div>
        <button className="action-btn receipts-create-btn" onClick={handleOpenCreateModal}>
          ➕ {t('createReceipt')}
        </button>
      </header>

      {notice && (
        <div className="receipts-notice receipts-notice--success" role="alert">
          {notice}
        </div>
      )}
      {error && (
        <div className="receipts-notice receipts-notice--error" role="alert">
          {error}
        </div>
      )}

      <div className="card receipts-card">
        <div className="receipts-toolbar">
          <form className="receipts-search-form" onSubmit={handleSearchSubmit}>
            <input
              type="search"
              placeholder={`🔍 ${t('searchReceiptsPlaceholder')}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field"
            />
            <button type="submit" className="lang-btn">
              🔎 {t('search')}
            </button>
            {appliedSearch && (
              <button type="button" className="lang-btn" onClick={handleClearFilters}>
                ✕ {t('clearFilters')}
              </button>
            )}
          </form>

          <ExportButtons
            data={receipts}
            config={exportConfig}
            onLoadAllData={kind =>
              loadAllPagesForExport(kind, paging =>
                purchaseReceiptService.getReceipts(
                  appliedSearch || undefined,
                  paging,
                  sortKey,
                  sortDirection
                )
              )
            }
          />
        </div>

        {loading ? (
          <div className="receipts-loading">⏳ {t('loadingReceipts')}...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="receipts-table">
                <thead>
                  <tr>
                    <SortableTh columnKey="folio" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
                      {t('receiptFolio')}
                    </SortableTh>
                    <SortableTh columnKey="fechacreacionutc" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
                      {t('receiptDate')}
                    </SortableTh>
                    <SortableTh columnKey="idproducto" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
                      {t('receiptProductId')}
                    </SortableTh>
                    <SortableTh columnKey="nombreproducto" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
                      {t('receiptProduct')}
                    </SortableTh>
                    <SortableTh columnKey="sku" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
                      {t('receiptSkuCode')}
                    </SortableTh>
                    <SortableTh columnKey="preciocosto" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
                      {t('receiptUnitCost')}
                    </SortableTh>
                    <th>{t('receiptUnitPrice')}</th>
                    <th>{t('receiptPrevStock')}</th>
                    <SortableTh columnKey="cantidad" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
                      {t('receiptQty')}
                    </SortableTh>
                    <th>{t('receiptNewStock')}</th>
                    <th>{t('receiptUser')}</th>
                    <th style={{ textAlign: 'center' }}>{t('receiptActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="receipts-empty">
                        {t('noReceiptsFound')}
                      </td>
                    </tr>
                  ) : (
                    sortedReceipts.map(r => (
                      <tr key={r.id}>
                        <td>
                          <strong className="receipts-folio-badge">{r.folio}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {new Date(r.fechaCreacionUtc).toLocaleString(isZh ? 'zh-CN' : 'es-MX', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-info">#{r.idProducto}</span>
                        </td>
                        <td>
                          <strong>{r.nombreProducto}</strong>
                        </td>
                        <td>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            <strong style={{ color: 'var(--primary-main)' }}>{r.sku}</strong>
                            {r.codigoBarras && (
                              <small style={{ display: 'block', color: 'var(--text-muted)' }}>
                                {r.codigoBarras}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-main)' }}>
                            {currencyFormatter.format(r.precioCosto)}
                          </strong>
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {currencyFormatter.format(r.precioVenta)}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {r.inventarioAnterior} Pzas
                          </span>
                        </td>
                        <td>
                          <span className="receipts-qty-badge">
                            +{r.cantidad} Pzas
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--success)' }}>
                            {r.inventarioResultante} Pzas
                          </strong>
                        </td>
                        <td>
                          <small style={{ color: 'var(--text-secondary)' }}>
                            {r.usuarioNombre || 'Sistema'}
                          </small>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="lang-btn receipts-icon-btn"
                              title={t('editReceipt')}
                              onClick={() => handleOpenEditModal(r)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="lang-btn receipts-icon-btn"
                              title={t('viewVoucher')}
                              onClick={() => setVoucherReceipt(r)}
                            >
                              📄
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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

      {/* MODAL CREAR / EDITAR RECIBO */}
      {isModalOpen && (
        <div
          className="receipts-modal-backdrop"
          onMouseDown={e => e.target === e.currentTarget && setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="receipts-modal-content">
            <header className="receipts-modal-header">
              <h2>
                {editingReceipt ? `✏️ ${t('editReceiptTitle')}: ${editingReceipt.folio}` : `➕ ${t('createReceiptTitle')}`}
              </h2>
              <button
                type="button"
                className="receipts-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </header>

            <form onSubmit={handleSaveReceipt} className="receipts-form">
              {/* Product Selection (only in create mode) */}
              {!editingReceipt && (
                <div className="receipts-form-group">
                  <label htmlFor="product-search-input">
                    {t('searchProductByCodeOrId')} *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="product-search-input"
                      type="text"
                      className="input-field"
                      placeholder={`🔍 ${t('searchBySkuBarcodeOrIdPlaceholder')}...`}
                      value={productSearchTerm}
                      onChange={e => {
                        setProductSearchTerm(e.target.value);
                        if (selectedProduct) setSelectedProduct(null);
                      }}
                      autoComplete="off"
                      required
                    />
                    {matchingProducts.length > 0 && (
                      <ul className="receipts-dropdown-results">
                        {matchingProducts.map(p => (
                          <li
                            key={p.id}
                            onClick={() => handleSelectProduct(p)}
                            className="receipts-dropdown-item"
                          >
                            <div>
                              <strong>{p.name}</strong>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {' '}(SKU: {p.sku}{p.barcode ? ` · Cód: ${p.barcode}` : ''}{p.idProducto ? ` · ID: #${p.idProducto}` : ''})
                              </span>
                            </div>
                            <span className="badge badge-info">{p.availableQuantity} pzas</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Product Card Details */}
              {(selectedProduct || editingReceipt) && (
                <div className="receipts-product-preview-card">
                  <div className="receipts-preview-row">
                    <div>
                      <small>{t('receiptProductId')}</small>
                      <strong>#{editingReceipt ? editingReceipt.idProducto : selectedProduct?.idProducto}</strong>
                    </div>
                    <div>
                      <small>{t('product')}</small>
                      <strong>{editingReceipt ? editingReceipt.nombreProducto : selectedProduct?.name}</strong>
                    </div>
                    <div>
                      <small>SKU</small>
                      <strong style={{ color: 'var(--primary-main)' }}>
                        {editingReceipt ? editingReceipt.sku : selectedProduct?.sku}
                      </strong>
                    </div>
                    <div>
                      <small>{t('barcode')}</small>
                      <span>{editingReceipt ? editingReceipt.codigoBarras : selectedProduct?.barcode || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="receipts-preview-row" style={{ marginTop: '0.5rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.5rem' }}>
                    <div>
                      <small>{t('receiptUnitPrice')}</small>
                      <strong>
                        {currencyFormatter.format(editingReceipt ? editingReceipt.precioVenta : selectedProduct?.unitPrice || 0)}
                      </strong>
                    </div>
                    <div>
                      <small>{t('receiptCurrentStock')}</small>
                      <span className="badge badge-warning">
                        {editingReceipt ? editingReceipt.inventarioAnterior : selectedProductStock} {t('pieces')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="receipts-form-grid">
                <div className="receipts-form-group">
                  <label htmlFor="receipt-unit-cost">
                    {t('receiptUnitCost')} ($ MXN)
                  </label>
                  <input
                    id="receipt-unit-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field"
                    value={formPrecioCosto}
                    onChange={e => setFormPrecioCosto(e.target.value)}
                    placeholder="0.00"
                  />
                  <small style={{ color: 'var(--text-muted)' }}>
                    {t('costOptionalHint')}
                  </small>
                </div>

                <div className="receipts-form-group">
                  <label htmlFor="receipt-quantity">
                    {t('receiptQuantityToStock')} *
                  </label>
                  <input
                    id="receipt-quantity"
                    type="number"
                    step="1"
                    min="1"
                    className="input-field"
                    value={formCantidad}
                    onChange={e => setFormCantidad(e.target.value)}
                    placeholder="Ej. 14"
                    required
                  />
                </div>
              </div>

              {/* Live Calculation */}
              {(selectedProduct || editingReceipt) && parseFloat(formCantidad) > 0 && (
                <div className="receipts-calc-box">
                  <div>
                    <span>{t('receiptPrevStock')}:</span>
                    <b>{editingReceipt ? editingReceipt.inventarioAnterior : selectedProductStock} Pzas</b>
                  </div>
                  <div>
                    <span>+ {t('receiptQty')}:</span>
                    <b style={{ color: 'var(--primary-main)' }}>+{parseFloat(formCantidad) || 0} Pzas</b>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                    <span>{t('receiptNewStockResult')}:</span>
                    <b style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{calculatedResultantStock} Pzas</b>
                  </div>
                </div>
              )}

              <div className="receipts-form-group">
                <label htmlFor="receipt-notes">{t('receiptNotes')}</label>
                <textarea
                  id="receipt-notes"
                  className="input-field"
                  rows={2}
                  maxLength={500}
                  value={formNotas}
                  onChange={e => setFormNotas(e.target.value)}
                  placeholder={t('receiptNotesPlaceholder')}
                />
              </div>

              <div className="receipts-modal-actions">
                <button
                  type="button"
                  className="lang-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="action-btn"
                  disabled={saving || (!selectedProduct && !editingReceipt)}
                >
                  {saving ? `⏳ ${t('saving')}...` : editingReceipt ? `💾 ${t('updateReceipt')}` : `💾 ${t('saveReceipt')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COMPROBANTE DE COMPRA A4 / PRINT VOUCHER */}
      {voucherReceipt && (
        <div
          className="receipts-modal-backdrop"
          onMouseDown={e => e.target === e.currentTarget && setVoucherReceipt(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="receipts-voucher-modal">
            <header className="receipts-modal-header">
              <h2>📄 {t('receiptVoucherTitle')}</h2>
              <button
                type="button"
                className="receipts-modal-close"
                onClick={() => setVoucherReceipt(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </header>

            <article className="receipts-voucher-document" id="receipt-printable-voucher">
              <div className="receipts-voucher-banner">
                <img src="/logo_wpc_bajio.jpeg" alt="WPC Bajío" className="receipts-voucher-logo" />
                <div style={{ textAlign: 'center' }}>
                  <h2>WPC BAJÍO — PANELES Y LAMBRÍN DECORATIVO</h2>
                  <p>COMPROBANTE OFICIAL DE ENTRADA DE ALMACÉN / 采购入库凭证</p>
                </div>
              </div>

              <div className="receipts-voucher-meta-grid">
                <div>
                  <span>Folio / 单号:</span>
                  <strong>{voucherReceipt.folio}</strong>
                </div>
                <div>
                  <span>Fecha / 日期:</span>
                  <strong>
                    {new Date(voucherReceipt.fechaCreacionUtc).toLocaleString(isZh ? 'zh-CN' : 'es-MX')}
                  </strong>
                </div>
                <div>
                  <span>Operador / 操作员:</span>
                  <strong>{voucherReceipt.usuarioNombre || 'Administrador'}</strong>
                </div>
                <div>
                  <span>ID Producto / 产品编号:</span>
                  <strong>#{voucherReceipt.idProducto}</strong>
                </div>
              </div>

              <table className="receipts-voucher-items-table">
                <thead>
                  <tr>
                    <th>SKU / 货号</th>
                    <th>Código Barras / 条形码</th>
                    <th>Descripción / 产品说明</th>
                    <th style={{ textAlign: 'right' }}>Cantidad Recibida / 进货数量</th>
                    <th style={{ textAlign: 'right' }}>Precio Costo / 成本价</th>
                    <th style={{ textAlign: 'right' }}>Precio Venta / 零售价</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{voucherReceipt.sku}</td>
                    <td style={{ fontFamily: 'monospace' }}>{voucherReceipt.codigoBarras || '—'}</td>
                    <td><strong>{voucherReceipt.nombreProducto}</strong></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>+{voucherReceipt.cantidad} Pzas</td>
                    <td style={{ textAlign: 'right' }}>{currencyFormatter.format(voucherReceipt.precioCosto)}</td>
                    <td style={{ textAlign: 'right' }}>{currencyFormatter.format(voucherReceipt.precioVenta)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="receipts-voucher-summary">
                <div className="receipts-voucher-stock-audit">
                  <div>
                    <span>Stock Previo:</span> <b>{voucherReceipt.inventarioAnterior} Pzas</b>
                  </div>
                  <div>
                    <span>+ Cantidad Recibida:</span> <b>+{voucherReceipt.cantidad} Pzas</b>
                  </div>
                  <div>
                    <span>= Stock Resultante:</span> <b style={{ color: 'var(--primary-main)' }}>{voucherReceipt.inventarioResultante} Pzas</b>
                  </div>
                </div>

                {voucherReceipt.notas && (
                  <div className="receipts-voucher-notes">
                    <strong>Notas / Observaciones:</strong>
                    <p>{voucherReceipt.notas}</p>
                  </div>
                )}
              </div>

              <footer className="receipts-voucher-signatures">
                <div>
                  <span className="signature-line">___________________________________</span>
                  <strong>Recibido por (Almacén / Cajero)</strong>
                  <small>{voucherReceipt.usuarioNombre || 'WPC Bajío'}</small>
                </div>
                <div>
                  <span className="signature-line">___________________________________</span>
                  <strong>Autorizado por (Administración)</strong>
                  <small>WPC Bajío Control de Inventarios</small>
                </div>
              </footer>
            </article>

            <div className="receipts-voucher-actions">
              <button
                type="button"
                className="action-btn"
                onClick={() => window.print()}
              >
                🖨️ {t('printVoucher')}
              </button>
              <button
                type="button"
                className="lang-btn"
                onClick={() => setVoucherReceipt(null)}
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PurchaseReceiptsPage;
