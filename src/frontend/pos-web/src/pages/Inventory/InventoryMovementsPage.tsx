import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import { InventoryMovement } from '../../types/inventory';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { getOperationalDateInputValue, toOperationalUtcBoundary } from '../../utils/operationalDate';
import { loadAllPagesForExport } from '../../utils/pagedExport';
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
  const { t } = useTranslation();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [appliedFilters, setAppliedFilters] = useState(() => ({ search: '', movementType: '', startDate: today(), endDate: today() }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);

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
      { key: 'date', label: 'Fecha', type: 'datetime', width: 1.15, value: movement => movement.createdAtUtc },
      { key: 'sku', label: 'SKU', width: 0.8, value: movement => movement.productSku },
      { key: 'product', label: 'Producto', width: 1.6, value: movement => movement.productName },
      { key: 'type', label: 'Tipo', width: 0.9, value: movement => { const key = movementLabelKey(movement.movementType); return key ? t(key) : movement.movementType; } },
      { key: 'quantity', label: 'Cantidad', type: 'number', width: 0.7, value: movement => movement.quantity },
      { key: 'previous', label: 'Cantidad Anterior', type: 'number', width: 0.9, value: movement => movement.previousQuantity },
      { key: 'new', label: 'Cantidad Nueva', type: 'number', width: 0.9, value: movement => movement.newQuantity },
      { key: 'reason', label: 'Motivo', width: 1.7, value: movement => movement.reason },
      { key: 'reference', label: 'Referencia', width: 1.1, value: movement => movement.idVenta ? `Venta #${movement.idVenta}` : movement.referenceNumber || '—' },
      { key: 'user', label: 'Usuario', width: 0.9, value: movement => movement.userUsername || '—' }
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
            <th>{t('date')}</th><th>{t('productCatalog')}</th><th>{t('type')}</th><th>{t('quantity')}</th>
            <th>{t('previousQuantity')}</th><th>{t('newQuantity')}</th><th>{t('physicalEvidence')}</th><th>{t('reason')}</th><th>{t('reference')}</th><th>{t('user')}</th>
          </tr></thead>
          <tbody>
            {movements.length === 0 && <tr><td colSpan={10} className="inventory-empty-state">{t('noInventoryMovements')}</td></tr>}
            {movements.map(movement => {
              const labelKey = movementLabelKey(movement.movementType);
              return <tr key={movement.id}>
                <td>{new Date(movement.createdAtUtc).toLocaleString()}</td>
                <td><strong>{movement.productName}</strong><small>{movement.productSku}</small></td>
                <td><span className={`badge ${movementBadge(movement.movementType)}`}>{labelKey ? t(labelKey) : movement.movementType}</span></td>
                <td>{movement.quantity}</td><td>{movement.previousQuantity}</td><td><strong>{movement.newQuantity}</strong></td>
                <td>{movement.evidenceImageUrl ? <button className="inventory-evidence-thumbnail-button" type="button" onClick={() => setEvidenceImage(movement.evidenceImageUrl ?? null)} aria-label={t('viewPhysicalEvidence')}><img className="inventory-evidence-thumbnail" src={movement.evidenceImageUrl} alt={t('physicalEvidence')} /></button> : '—'}</td>
                <td>{movement.reason}</td><td>{movement.idVenta ? <strong>{t('saleNumber', { idVenta: movement.idVenta })}</strong> : movement.referenceNumber || '—'}</td><td>{movement.userUsername || '—'}</td>
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
