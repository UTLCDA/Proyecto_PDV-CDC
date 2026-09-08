import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import { InventoryMovement } from '../../types/inventory';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { getOperationalDateInputValue, toOperationalUtcBoundary } from '../../utils/operationalDate';
import { loadAllPagesForExport } from '../../utils/pagedExport';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableTh } from '../../components/common/SortableTh';
import './InventoryListPage.css';

const today = getOperationalDateInputValue;

const movementLabelKey = (movementType: string) => {
  switch (movementType.trim().toLowerCase()) {
    case 'entry': case 'entrada': case 'entradas': return 'movementEntry';
    case 'exit': case 'salida': case 'salidas': return 'movementExit';
    case 'adjustment': case 'ajuste': return 'movementAdjustment';
    case 'sale': case 'venta': return 'movementSale';
    case 'return': case 'devolucion': case 'devolución': return 'movementReturn';
    default: return '';
  }
};

const movementBadge = (movementType: string) => {
  const type = movementType.trim().toLowerCase();
  if (['entry', 'entrada', 'entradas', 'return', 'devolucion', 'devolución'].includes(type)) return 'badge-success';
  if (['exit', 'salida', 'salidas'].includes(type)) return 'badge-danger';
  if (['adjustment', 'ajuste'].includes(type)) return 'badge-info';
  return 'badge-warning';
};

export const InventoryMovementsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [appliedFilters, setAppliedFilters] = useState(() => ({ search: '', movementType: '', startDate: today(), endDate: today() }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);

  const { sortedData: sortedMovements, sortKey, sortDirection, handleSort } = useTableSort(movements, {
    valueExtractors: {
      createdAtUtc: m => m.createdAtUtc,
      product: m => `${m.productName} ${m.productSku}`,
      movementType: m => m.movementType,
      quantity: m => m.quantity,
      unitCost: m => m.unitCost ?? 0,
      unitPrice: m => m.unitPrice ?? 0,
      totalAmount: m => m.totalAmount ?? (m.quantity * (m.unitPrice ?? 0)),
      taxAmount: m => m.taxAmount ?? 0,
      netCost: m => m.netCost ?? (m.quantity * (m.unitCost ?? 0)),
      profit: m => m.profit ?? ((m.totalAmount ?? (m.quantity * (m.unitPrice ?? 0))) - (m.netCost ?? (m.quantity * (m.unitCost ?? 0)))),
      reason: m => m.idVenta && (m.reason?.startsWith('Venta folio:') || m.reason?.startsWith('VENTA-')) ? `Venta #${m.idVenta}` : (m.reason || ''),
      referenceNumber: m => m.idVenta ? `Venta #${m.idVenta}` : (m.referenceNumber || ''),
      userUsername: m => m.userUsername || ''
    }
  });

  const loadMovements = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      setError(t('invalidReportDateRange'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const startUtc = toOperationalUtcBoundary(startDate);
      const endUtc = toOperationalUtcBoundary(endDate, true);
      setMovements(await inventoryService.getMovements({
        search: search.trim() || undefined,
        movementType: movementType || undefined,
        startDateUtc: startUtc,
        endDateUtc: endUtc
      }));
      setAppliedFilters({ search: search.trim(), movementType, startDate, endDate });
    } catch (loadError) {
      setMovements([]);
      setError(loadError instanceof Error ? loadError.message : t('inventoryLoadError'));
    } finally {
      setLoading(false);
    }
  }, [endDate, movementType, search, startDate, t]);

  useEffect(() => { void loadMovements(); }, [loadMovements]);

  useEffect(() => {
    if (!evidenceImage) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setEvidenceImage(null);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [evidenceImage]);

  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }), [locale]);

  const exportConfig = useMemo<ExportReportConfig<InventoryMovement>>(() => ({
    moduleName: t('inventoryMovementsTitle'),
    title: 'Movimientos de Inventario',
    fileName: 'Movimientos_Inventario',
    sheetName: 'Movimientos',
    orientation: 'landscape',
    dateRange: { startDate: appliedFilters.startDate, endDate: appliedFilters.endDate },
    filters: [
      { label: 'Periodo', value: appliedFilters.startDate && appliedFilters.endDate ? `${appliedFilters.startDate} al ${appliedFilters.endDate}` : appliedFilters.startDate || appliedFilters.endDate },
      { label: 'Búsqueda', value: appliedFilters.search },
      { label: 'Tipo de movimiento', value: appliedFilters.movementType ? t(movementLabelKey(appliedFilters.movementType)) : 'Todos' }
    ],
    columns: [
      { key: 'date', label: 'Fecha / 日期', type: 'datetime', width: 1.15, value: movement => movement.createdAtUtc },
      { key: 'sku', label: 'SKU / 编号', width: 0.8, value: movement => movement.productSku },
      { key: 'product', label: 'Producto / 产品', width: 1.5, value: movement => movement.productName },
      { key: 'type', label: 'Tipo / 类型', width: 0.9, value: movement => { const key = movementLabelKey(movement.movementType); return key ? t(key) : movement.movementType; } },
      { key: 'quantity', label: 'Cantidad / 数量', type: 'number', width: 0.7, value: movement => movement.quantity },
      { key: 'unitCost', label: 'Costo Actual / 成本单价', type: 'currency', width: 0.9, value: movement => movement.unitCost ?? 0 },
      { key: 'unitPrice', label: 'Precio Venta / 销售单价', type: 'currency', width: 0.9, value: movement => movement.unitPrice ?? 0 },
      { key: 'totalAmount', label: 'Monto Total / 总付款', type: 'currency', width: 1, value: movement => movement.totalAmount ?? 0 },
      { key: 'taxAmount', label: 'Impuesto / 税额', type: 'currency', width: 1, value: movement => movement.taxAmount ?? 0 },
      { key: 'netCost', label: 'Costo Neto / 净成本', type: 'currency', width: 0.9, value: movement => movement.netCost ?? 0 },
      { key: 'profit', label: 'Ganancia / 利润', type: 'currency', width: 0.9, value: movement => movement.profit ?? 0 },
      { key: 'reason', label: 'Motivo / 原因', width: 1.4, value: movement => movement.idVenta && (movement.reason?.startsWith('Venta folio:') || movement.reason?.startsWith('VENTA-')) ? `Venta #${movement.idVenta}` : movement.reason },
      { key: 'reference', label: 'Referencia / 参考', width: 1, value: movement => movement.idVenta ? `Venta #${movement.idVenta}` : movement.referenceNumber || '—' },
      { key: 'user', label: 'Usuario / 操作员', width: 0.9, value: movement => movement.userUsername || '—' }
    ]
  }), [appliedFilters, t]);

  return <section className="inventory-page-container">
    <article className="card">
      <header className="inventory-history-header">
        <div className="inventory-history-header__top">
          <div><h2>📋 {t('inventoryMovementsTitle')}</h2><p>{t('inventoryMovementsSubtitle')}</p></div>
          <ExportButtons data={movements} config={exportConfig} onLoadAllData={kind => loadAllPagesForExport(kind, paging => inventoryService.getMovements({
            search: appliedFilters.search || undefined,
            movementType: appliedFilters.movementType || undefined,
            startDateUtc: toOperationalUtcBoundary(appliedFilters.startDate),
            endDateUtc: toOperationalUtcBoundary(appliedFilters.endDate, true)
          }, paging))} />
        </div>
        <form className="inventory-history-filters" onSubmit={event => { event.preventDefault(); void loadMovements(); }}>
          <input className="form-control" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('searchInventoryMovements')} />
          <select className="form-control" value={movementType} onChange={event => setMovementType(event.target.value)} aria-label={t('movementType')}>
            <option value="">{t('allMovementTypes')}</option>
            <option value="Entry">{t('movementEntry')}</option>
            <option value="Exit">{t('movementExit')}</option>
            <option value="Adjustment">{t('movementAdjustment')}</option>
            <option value="Sale">{t('movementSale')}</option>
            <option value="Return">{t('movementReturn')}</option>
          </select>
          <div className="inventory-date-range" role="group" aria-labelledby="inventory-date-range-title">
            <span id="inventory-date-range-title" className="inventory-date-range__title">📅 {t('movementDateRange')}</span>
            <label><span>{t('startDate')}</span><input className="form-control" type="date" max={endDate || undefined} value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
            <label><span>{t('endDate')}</span><input className="form-control" type="date" min={startDate || undefined} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
          </div>
          <button className="action-btn">🔎 {t('search')}</button>
          <button type="button" className="lang-btn" onClick={() => { const operationalToday = today(); setSearch(''); setMovementType(''); setStartDate(operationalToday); setEndDate(operationalToday); }}>{t('clearFilters')}</button>
        </form>
      </header>

      {error && <div className="inventory-error-notice" role="alert">{error}</div>}
      {loading ? <div className="inventory-empty-state">{t('loading')}</div> : <div className="inventory-table-wrap">
        <table className="inventory-history-table">
          <thead><tr>
            <SortableTh columnKey="createdAtUtc" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Fecha / 日期
            </SortableTh>
            <SortableTh columnKey="product" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Producto / 产品
            </SortableTh>
            <SortableTh columnKey="movementType" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Tipo / 类型
            </SortableTh>
            <SortableTh columnKey="quantity" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Cantidad / 数量
            </SortableTh>
            <SortableTh columnKey="unitCost" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Costo Actual / 成本单价
            </SortableTh>
            <SortableTh columnKey="unitPrice" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Precio Venta / 销售单价
            </SortableTh>
            <SortableTh columnKey="totalAmount" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Monto Total / 总付款
            </SortableTh>
            <SortableTh columnKey="taxAmount" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Impuesto / 税额
            </SortableTh>
            <SortableTh columnKey="netCost" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Costo Neto / 净成本
            </SortableTh>
            <SortableTh columnKey="profit" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Ganancia / 利润
            </SortableTh>
            <th>{t('physicalEvidence')}</th>
            <SortableTh columnKey="reason" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Motivo / 原因
            </SortableTh>
            <SortableTh columnKey="referenceNumber" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Referencia / 参考
            </SortableTh>
            <SortableTh columnKey="userUsername" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
              Usuario / 操作员
            </SortableTh>
          </tr></thead>
          <tbody>
            {sortedMovements.length === 0 && <tr><td colSpan={14} className="inventory-empty-state">{t('noInventoryMovements')}</td></tr>}
            {sortedMovements.map(movement => {
              const labelKey = movementLabelKey(movement.movementType);
              const uCost = movement.unitCost ?? 0;
              const uPrice = movement.unitPrice ?? 0;
              const tot = movement.totalAmount ?? (movement.quantity * uPrice);
              const tax = movement.taxAmount ?? 0;
              const net = movement.netCost ?? (movement.quantity * uCost);
              const profit = movement.profit ?? (tot - net);
              const displayReason = movement.idVenta && (movement.reason?.startsWith('Venta folio:') || movement.reason?.startsWith('VENTA-')) ? `Venta #${movement.idVenta}` : movement.reason;

              return <tr key={movement.id}>
                <td>{new Date(movement.createdAtUtc).toLocaleString()}</td>
                <td><strong>{movement.productName}</strong><small>{movement.productSku}</small></td>
                <td><span className={`badge ${movementBadge(movement.movementType)}`}>{labelKey ? t(labelKey) : movement.movementType}</span></td>
                <td><strong>{movement.quantity}</strong></td>
                <td>{money.format(uCost)}</td>
                <td>{money.format(uPrice)}</td>
                <td><strong>{money.format(tot)}</strong></td>
                <td>{money.format(tax)}</td>
                <td>{money.format(net)}</td>
                <td style={{ color: profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                  {money.format(profit)}
                </td>
                <td>{movement.evidenceImageUrl ? <button className="inventory-evidence-thumbnail-button" type="button" onClick={() => setEvidenceImage(movement.evidenceImageUrl ?? null)} aria-label={t('viewPhysicalEvidence')}><img className="inventory-evidence-thumbnail" src={movement.evidenceImageUrl} alt={t('physicalEvidence')} /></button> : '—'}</td>
                <td>{displayReason}</td>
                <td>{movement.idVenta ? <strong>{t('saleNumber', { idVenta: movement.idVenta })}</strong> : movement.referenceNumber || '—'}</td>
                <td>{movement.userUsername || '—'}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>}
    </article>

    {evidenceImage && <div className="inventory-evidence-modal-overlay" role="presentation" onClick={() => setEvidenceImage(null)}>
      <div className="inventory-evidence-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-evidence-title" onClick={event => event.stopPropagation()}>
        <div className="inventory-evidence-modal-header"><h3 id="inventory-evidence-title">{t('physicalEvidenceDialogTitle')}</h3><button type="button" onClick={() => setEvidenceImage(null)} aria-label={t('closeEvidence')}>×</button></div>
        <img src={evidenceImage} alt={t('physicalEvidence')} className="inventory-evidence-modal-image" />
      </div>
    </div>}
  </section>;
};

export default InventoryMovementsPage;
