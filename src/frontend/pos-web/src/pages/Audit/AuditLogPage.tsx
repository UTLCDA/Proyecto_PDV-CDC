import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reportsService } from '../../services/reportsService';
import { AuditLog } from '../../types/reports';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { getOperationalDateInputValue, toOperationalUtcBoundary } from '../../utils/operationalDate';
import { loadAllPagesForExport } from '../../utils/pagedExport';
import { mapAuditEvent, MODULE_ICONS } from '../../utils/auditMapper';
import '../Reports/ReportsDashboardPage.css';
import './AuditLogPage.css';

const today = getOperationalDateInputValue;

const AVAILABLE_MODULES = [
  'Todos',
  'Ventas',
  'Clientes',
  'Productos',
  'Inventario',
  'Caja',
  'Pagos',
  'Cotizaciones',
  'Devoluciones',
  'Usuarios',
  'Roles',
  'Seguridad',
  'Configuracion',
  'Sistema'
];

const AVAILABLE_RESULTS = [
  { value: 'Todos', label: 'Todos los resultados' },
  { value: 'SUCCESS', label: 'Correcto' },
  { value: 'WARNING', label: 'Advertencia / No completado' },
  { value: 'ERROR', label: 'Error del sistema' }
];

export const AuditLogPage: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [user, setUser] = useState('');
  const [action, setAction] = useState('');
  const [module, setModule] = useState('Todos');
  const [resultStatus, setResultStatus] = useState('Todos');
  const [idVenta, setIdVenta] = useState('');
  const [correlationId, setCorrelationId] = useState('');

  const [appliedFilters, setAppliedFilters] = useState(() => ({
    startDate: today(),
    endDate: today(),
    user: '',
    action: '',
    module: 'Todos',
    resultStatus: 'Todos',
    idVenta: '',
    correlationId: ''
  }));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      setError(t('invalidReportDateRange'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      setLogs(
        await reportsService.getAuditLogs({
          startDate: toOperationalUtcBoundary(startDate),
          endDate: toOperationalUtcBoundary(endDate, true),
          user: user.trim() || undefined,
          action: action.trim() || undefined,
          module: module !== 'Todos' ? module : undefined,
          resultStatus: resultStatus !== 'Todos' ? resultStatus : undefined,
          idVenta: idVenta.trim() || undefined,
          correlationId: correlationId.trim() || undefined
        })
      );
      setAppliedFilters({
        startDate,
        endDate,
        user: user.trim(),
        action: action.trim(),
        module,
        resultStatus,
        idVenta: idVenta.trim(),
        correlationId: correlationId.trim()
      });
    } catch (loadError) {
      setLogs([]);
      setError(loadError instanceof Error ? loadError.message : t('reportsLoadError'));
    } finally {
      setLoading(false);
    }
  }, [action, correlationId, endDate, idVenta, module, resultStatus, startDate, t, user]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const exportConfig = useMemo<ExportReportConfig<AuditLog>>(
    () => ({
      moduleName: t('auditTrailExplorer'),
      title: 'Historial de Actividad y Auditoría Central del Sistema',
      fileName: 'Bitacora_Actividades',
      sheetName: 'Bitacora',
      orientation: 'landscape',
      dateRange: { startDate: appliedFilters.startDate, endDate: appliedFilters.endDate },
      filters: [
        {
          label: 'Periodo',
          value:
            appliedFilters.startDate && appliedFilters.endDate
              ? `${appliedFilters.startDate} al ${appliedFilters.endDate}`
              : appliedFilters.startDate || appliedFilters.endDate
        },
        { label: 'Usuario', value: appliedFilters.user },
        { label: 'Módulo', value: appliedFilters.module !== 'Todos' ? appliedFilters.module : '' },
        { label: 'Resultado', value: appliedFilters.resultStatus !== 'Todos' ? appliedFilters.resultStatus : '' },
        { label: 'Filtro por IdVenta', value: appliedFilters.idVenta }
      ],
      columns: [
        { key: 'date', label: 'Fecha y Hora', type: 'datetime', width: 1.2, value: log => log.createdAtUtc },
        { key: 'user', label: 'Usuario', width: 1, value: log => log.userUsername || t('systemUser') },
        { key: 'module', label: 'Módulo', width: 1, value: log => mapAuditEvent(log).module },
        { key: 'activity', label: 'Actividad', width: 1.8, value: log => mapAuditEvent(log).title },
        { key: 'description', label: 'Descripción', width: 2.5, value: log => mapAuditEvent(log).description },
        { key: 'result', label: 'Resultado', width: 1, value: log => mapAuditEvent(log).statusText }
      ]
    }),
    [appliedFilters, t]
  );

  const selectedMapped = useMemo(() => (selectedLog ? mapAuditEvent(selectedLog) : null), [selectedLog]);

  return (
    <section className="reports-page audit-log-page">
      <article className="card reports-header-card">
        <div>
          <h2>🔍 {t('auditTrailExplorer')}</h2>
          <p>{t('auditExplorerHint')}</p>
        </div>
        <form
          className="reports-filter-form audit-filter-grid"
          onSubmit={event => {
            event.preventDefault();
            void loadLogs();
          }}
        >
          <label>
            <span>{t('startDate')}</span>
            <input
              className="input-field"
              type="date"
              max={endDate || undefined}
              value={startDate}
              onChange={event => setStartDate(event.target.value)}
            />
          </label>
          <label>
            <span>{t('endDate')}</span>
            <input
              className="input-field"
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={event => setEndDate(event.target.value)}
            />
          </label>
          <label>
            <span>{t('auditModule')}</span>
            <select className="input-field" value={module} onChange={event => setModule(event.target.value)}>
              {AVAILABLE_MODULES.map(m => (
                <option key={m} value={m}>
                  {m === 'Todos' ? t('auditFilterModule') : `${MODULE_ICONS[m] || ''} ${m}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('auditResultStatus')}</span>
            <select className="input-field" value={resultStatus} onChange={event => setResultStatus(event.target.value)}>
              {AVAILABLE_RESULTS.map(res => (
                <option key={res.value} value={res.value}>
                  {res.label}
                </option>
              ))}
            </select>
          </label>
          <input
            className="input-field"
            value={user}
            onChange={event => setUser(event.target.value)}
            placeholder={t('filterByUser')}
          />
          <input
            className="input-field"
            value={action}
            onChange={event => setAction(event.target.value)}
            placeholder={t('auditSearchPlaceholder')}
          />
          <input
            className="input-field"
            type="number"
            min="1"
            step="1"
            value={idVenta}
            onChange={event => setIdVenta(event.target.value)}
            placeholder={t('filterBySaleFolio')}
          />
          <button className="action-btn">🔎 {t('search')}</button>
        </form>

        <ExportButtons
          data={logs}
          config={exportConfig}
          onLoadAllData={kind =>
            loadAllPagesForExport(kind, paging =>
              reportsService.getAuditLogs(
                {
                  startDate: toOperationalUtcBoundary(appliedFilters.startDate),
                  endDate: toOperationalUtcBoundary(appliedFilters.endDate, true),
                  user: appliedFilters.user || undefined,
                  action: appliedFilters.action || undefined,
                  module: appliedFilters.module !== 'Todos' ? appliedFilters.module : undefined,
                  resultStatus: appliedFilters.resultStatus !== 'Todos' ? appliedFilters.resultStatus : undefined,
                  idVenta: appliedFilters.idVenta || undefined,
                  correlationId: appliedFilters.correlationId || undefined
                },
                paging
              )
            )
          }
        />
      </article>

      {error && <div className="reports-notice reports-notice-error" role="alert">{error}</div>}

      <article className="card">
        {loading ? (
          <p className="reports-empty">{t('loading')}</p>
        ) : logs.length === 0 ? (
          <p className="reports-empty">{t('noAuditRecords')}</p>
        ) : (
          <div className="reports-table-wrap">
            <table className="reports-table reports-audit-table">
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{t('user')}</th>
                  <th>{t('auditModule')}</th>
                  <th>{t('auditActivity')}</th>
                  <th>{t('auditResultStatus')}</th>
                  <th>{t('details')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const mapped = mapAuditEvent(log);
                  return (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAtUtc).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td>
                        <strong>{log.userUsername || t('systemUser')}</strong>
                      </td>
                      <td>
                        <span className="audit-module-badge">
                          <span>{mapped.icon}</span> {mapped.module}
                        </span>
                      </td>
                      <td>
                        <div className="audit-activity-cell">
                          <span className="audit-activity-title">{mapped.title}</span>
                          <span className="audit-activity-desc">{mapped.description}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`audit-status-badge ${mapped.statusClass}`}>
                          {mapped.statusText}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="pos-link-btn"
                          onClick={() => setSelectedLog(log)}
                        >
                          👁️ {t('view')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {selectedLog && selectedMapped && (
        <div
          className="customers-modal-backdrop"
          onMouseDown={event => event.target === event.currentTarget && setSelectedLog(null)}
        >
          <div className="customers-modal audit-modal-wide" role="dialog" aria-modal="true">
            <header>
              <h2>
                {selectedMapped.icon} {selectedMapped.title}
              </h2>
              <button onClick={() => setSelectedLog(null)}>×</button>
            </header>

            <div className="audit-modal-body">
              {/* Sección 1: Información de Actividad */}
              <div className="audit-section-card">
                <h3 className="audit-section-title">📋 {t('auditTabActivity')}</h3>
                <div className="audit-info-grid">
                  <div className="audit-info-item">
                    <span className="audit-info-label">{t('user')}</span>
                    <span className="audit-info-val">{selectedLog.userUsername || t('systemUser')}</span>
                  </div>
                  <div className="audit-info-item">
                    <span className="audit-info-label">{t('date')}</span>
                    <span className="audit-info-val">
                      {new Date(selectedLog.createdAtUtc).toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="audit-info-item">
                    <span className="audit-info-label">{t('auditModule')}</span>
                    <span className="audit-info-val">
                      {selectedMapped.icon} {selectedMapped.module}
                    </span>
                  </div>
                  <div className="audit-info-item">
                    <span className="audit-info-label">{t('entity')}</span>
                    <span className="audit-info-val">{selectedMapped.entityDisplay}</span>
                  </div>
                  <div className="audit-info-item">
                    <span className="audit-info-label">{t('auditResultStatus')}</span>
                    <span className="audit-info-val">
                      <span className={`audit-status-badge ${selectedMapped.statusClass}`}>
                        {selectedMapped.statusText}
                      </span>
                    </span>
                  </div>
                  <div className="audit-info-item">
                    <span className="audit-info-label">IP Address</span>
                    <span className="audit-info-val"><code>{selectedLog.ipAddress}</code></span>
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <span className="audit-info-label">Descripción</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontStyle: 'italic' }}>
                    {selectedMapped.description}
                  </p>
                </div>
              </div>

              {/* Sección 2: Cambios Realizados */}
              {selectedMapped.changes.length > 0 && (
                <div className="audit-section-card">
                  <h3 className="audit-section-title">🔄 {t('auditTabChanges')}</h3>
                  <table className="audit-diff-table">
                    <thead>
                      <tr>
                        <th>{t('auditFieldChanged')}</th>
                        <th>{t('auditPreviousValue')}</th>
                        <th>{t('auditNewValue')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMapped.changes.map((ch, idx) => (
                        <tr key={idx}>
                          <td><strong>{ch.field}</strong></td>
                          <td><span className="audit-val-old">{ch.oldValue}</span></td>
                          <td><span className="audit-val-new">{ch.newValue}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sección 3: Detalles Técnicos (Accordion contraído por default) */}
              <details className="audit-tech-accordion">
                <summary className="audit-tech-summary">🛠️ {t('auditTabTechnical')}</summary>
                <div className="audit-tech-content">
                  <div>
                    <strong>Correlation ID:</strong> <code>{selectedLog.correlationId}</code>
                  </div>
                  <div>
                    <strong>Acción Técnica:</strong> <code>{selectedLog.action}</code>
                  </div>
                  <div>
                    <strong>Entidad Backend:</strong> <code>{selectedLog.entityName}</code> (ID: {selectedLog.entityId || 'N/A'})
                  </div>
                  {selectedMapped.rawOldJson && (
                    <div>
                      <strong>Valores Anteriores (JSON):</strong>
                      <pre className="audit-json-box">
                        {tryFormatJson(selectedMapped.rawOldJson)}
                      </pre>
                    </div>
                  )}
                  {selectedMapped.rawNewJson && (
                    <div>
                      <strong>Valores Nuevos (JSON Payload):</strong>
                      <pre className="audit-json-box">
                        {tryFormatJson(selectedMapped.rawNewJson)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

function tryFormatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

export default AuditLogPage;
