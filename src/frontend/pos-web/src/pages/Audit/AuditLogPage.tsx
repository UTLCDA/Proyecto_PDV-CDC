import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reportsService } from '../../services/reportsService';
import { AuditLog } from '../../types/reports';
import '../Reports/ReportsDashboardPage.css';

const today = () => new Date().toISOString().slice(0, 10);
const utcBoundary = (date: string, end = false) => date ? new Date(`${date}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString() : undefined;

export const AuditLogPage: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [user, setUser] = useState('');
  const [action, setAction] = useState('');
  const [correlationId, setCorrelationId] = useState('');
  const [idVenta, setIdVenta] = useState('');
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
      setLogs(await reportsService.getAuditLogs({
        startDate: utcBoundary(startDate), endDate: utcBoundary(endDate, true),
        user: user.trim() || undefined, action: action.trim() || undefined,
        correlationId: correlationId.trim() || undefined,
        idVenta: idVenta.trim() || undefined
      }));
    } catch (loadError) {
      setLogs([]);
      setError(loadError instanceof Error ? loadError.message : t('reportsLoadError'));
    } finally {
      setLoading(false);
    }
  }, [action, correlationId, endDate, idVenta, startDate, t, user]);

  useEffect(() => { void loadLogs(); }, [loadLogs]);

  return <section className="reports-page">
    <article className="card reports-header-card">
      <div><h2>🔍 {t('auditTrailExplorer')}</h2><p>{t('auditExplorerHint')}</p></div>
      <form className="reports-filter-form" onSubmit={event => { event.preventDefault(); void loadLogs(); }}>
        <label><span>{t('startDate')}</span><input className="input-field" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
        <label><span>{t('endDate')}</span><input className="input-field" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
        <input className="input-field" value={user} onChange={event => setUser(event.target.value)} placeholder={t('filterByUser')} />
        <input className="input-field" value={action} onChange={event => setAction(event.target.value)} placeholder={t('filterByAction')} />
        <input className="input-field" type="number" min="1" step="1" value={idVenta} onChange={event => setIdVenta(event.target.value)} placeholder={t('filterBySaleFolio')} />
        <input className="input-field" value={correlationId} onChange={event => setCorrelationId(event.target.value)} placeholder="Correlation ID" />
        <button className="action-btn">🔎 {t('search')}</button>
      </form>
    </article>
    {error && <div className="reports-notice reports-notice-error" role="alert">{error}</div>}
    <article className="card">
      {loading ? <p className="reports-empty">{t('loading')}</p> : logs.length === 0 ? <p className="reports-empty">{t('noAuditRecords')}</p> : <div className="reports-table-wrap">
        <table className="reports-table reports-audit-table"><thead><tr><th>{t('date')}</th><th>Correlation ID</th><th>{t('user')}</th><th>{t('action')}</th><th>{t('entity')}</th><th>{t('reason')}</th><th>{t('details')}</th></tr></thead>
          <tbody>{logs.map(log => <tr key={log.id}>
            <td>{new Date(log.createdAtUtc).toLocaleString()}</td><td><code>{log.correlationId}</code></td><td>{log.userUsername || t('systemUser')}</td>
            <td><span className="badge badge-info">{log.action}</span></td><td>{log.entityName}{log.idVenta ? ` · ${t('saleNumber', { idVenta: log.idVenta })}` : log.entityId ? ` · ${log.entityId}` : ''}</td><td>{formatAuditNotes(log, t('saleNumber', { idVenta: log.idVenta }))}</td>
            <td><button type="button" className="pos-link-btn" onClick={() => setSelectedLog(log)}>👁️ {t('view')}</button></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </article>
    {selectedLog && <div className="customers-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setSelectedLog(null)}>
      <div className="customers-modal" role="dialog" aria-modal="true"><header><h2>{t('auditDetail')}</h2><button onClick={() => setSelectedLog(null)}>×</button></header>
        <div className="audit-detail-grid">{selectedLog.idVenta && <><strong>{t('folio')}</strong><span>{t('saleNumber', { idVenta: selectedLog.idVenta })}</span></>}<strong>{t('previousValues')}</strong><pre>{selectedLog.oldValues || '—'}</pre><strong>{t('newValues')}</strong><pre>{selectedLog.newValues || '—'}</pre><strong>IP</strong><code>{selectedLog.ipAddress}</code></div>
      </div>
    </div>}
  </section>;
};

const formatAuditNotes = (log: AuditLog, saleLabel: string) => {
  if (!log.notes) return '—';
  return log.idVenta ? log.notes.replace(/VENTA-[A-Z0-9-]+/gi, saleLabel) : log.notes;
};

export default AuditLogPage;
