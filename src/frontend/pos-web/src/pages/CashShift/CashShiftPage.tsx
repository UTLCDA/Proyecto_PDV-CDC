import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { cashShiftService } from '../../services/cashShiftService';
import { CashGeneralMovement, CashShift, CashTransaction } from '../../types/reports';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { loadAllPagesForExport } from '../../utils/pagedExport';
import './CashShiftPage.css';

type Notice = { type: 'success' | 'error'; text: string } | null;

export const CashShiftPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const [currentShift, setCurrentShift] = useState<CashShift | null>(null);
  const [history, setHistory] = useState<CashShift[]>([]);
  const [generalMovements, setGeneralMovements] = useState<CashGeneralMovement[]>([]);
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositReason, setDepositReason] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showWithdrawalWarning, setShowWithdrawalWarning] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const SHOW_FORCE_CORTE_Z = false;
  const canOpen = hasPermission('caja', 'aperturar');
  const canWithdraw = hasPermission('caja', 'sangria');
  const canClose = hasPermission('caja', 'cerrar');
  const canReport = hasPermission('caja', 'corte_z');

  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'es-MX';
  const moneyFormatter = useMemo(() => new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }), [locale]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }), [locale]);
  const directTransactions = useMemo(() => {
    const allowedTypes = ['Apertura', 'EntradaManual', 'RetiroManual', 'Cierre', 'Opening', 'ManualDeposit', 'ManualWithdrawal', 'Closing'];
    return (Array.isArray(currentShift?.transactions) ? currentShift.transactions : [])
      .filter(transaction => transaction && allowedTypes.includes(transaction.transactionType));
  }, [currentShift]);

  const currentMovementsExportConfig = useMemo<ExportReportConfig<CashTransaction>>(() => ({
    moduleName: t('cashShiftTitle'),
    title: `Movimientos del turno ${currentShift?.shiftNumber || ''}`.trim(),
    fileName: 'Movimientos_Caja',
    sheetName: 'MovimientosCaja',
    orientation: 'landscape',
    filters: [
      { label: 'Turno', value: currentShift?.shiftNumber || '—' },
      { label: 'Cajero', value: currentShift?.userUsername || '—' },
      { label: 'Estado', value: currentShift?.status || '—' }
    ],
    columns: [
      { key: 'date', label: 'Fecha', type: 'datetime', width: 1.15, value: item => item.createdAtUtc },
      { key: 'type', label: 'Tipo', width: 1, value: item => t(transactionTypeKey(item.transactionType)) },
      { key: 'reason', label: 'Motivo', width: 1.6, value: item => item.reason || '—' },
      { key: 'user', label: 'Usuario', width: 0.9, value: item => item.userUsername || currentShift?.userUsername || '—' },
      { key: 'amount', label: 'Monto', type: 'currency', width: 0.85, value: item => item.amount }
    ]
  }), [currentShift, t]);

  const generalMovementsExportConfig = useMemo<ExportReportConfig<CashGeneralMovement>>(() => ({
    moduleName: t('generalMovementsTitle'),
    title: 'Movimientos Generales de Caja',
    fileName: 'Movimientos_Generales_Caja',
    sheetName: 'Movimientos',
    orientation: 'landscape',
    columns: [
      { key: 'date', label: 'Fecha', type: 'datetime', width: 1.1, value: item => item.createdAtUtc },
      { key: 'category', label: 'Categoría', width: 1, value: item => formatMovementCategory(item.category) },
      { key: 'idVenta', label: 'Id Venta', type: 'number', width: 0.7, value: item => item.idVenta },
      { key: 'movement', label: 'Tipo de movimiento', width: 1, value: item => formatMovementType(item.paymentMethod).replace(/^\S+\s/, '') },
      { key: 'description', label: 'Descripción', width: 1.5, value: item => formatMovementDescription(item) },
      { key: 'user', label: 'Usuario', width: 0.85, value: item => item.userUsername || '—' },
      { key: 'amount', label: 'Monto', type: 'currency', width: 0.85, value: item => item.amount }
    ]
  }), [t]);

  const historyExportConfig = useMemo<ExportReportConfig<CashShift>>(() => ({
    moduleName: t('cashShiftHistory'),
    title: 'Histórico de Cortes de Caja',
    fileName: 'Cortes_Caja',
    sheetName: 'CortesCaja',
    orientation: 'landscape',
    columns: [
      { key: 'shift', label: 'Núm. Turno', width: 0.85, value: shift => shift.shiftNumber },
      { key: 'user', label: 'Usuario', width: 0.8, value: shift => shift.userUsername || '—' },
      { key: 'opened', label: 'Apertura', type: 'datetime', width: 1.1, value: shift => shift.openedAtUtc },
      { key: 'closed', label: 'Cierre', type: 'datetime', width: 1.1, value: shift => shift.closedAtUtc },
      { key: 'openingAmount', label: 'Fondo inicial', type: 'currency', width: 0.8, value: shift => shift.openingAmount },
      { key: 'expected', label: 'Cierre esperado', type: 'currency', width: 0.9, value: shift => shift.expectedClosingAmount },
      { key: 'actual', label: 'Cierre real', type: 'currency', width: 0.85, value: shift => shift.status === 'Cerrado' ? shift.actualClosingAmount : null },
      { key: 'difference', label: 'Diferencia', type: 'currency', width: 0.8, value: shift => shift.status === 'Cerrado' ? shift.differenceAmount : null },
      { key: 'status', label: 'Estado', width: 0.7, value: shift => shift.status }
    ]
  }), [t]);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setNotice(null);
      const currentPromise = cashShiftService.getCurrentShift();
      const historyPromise = canReport ? cashShiftService.getShiftHistory() : Promise.resolve([]);
      const generalPromise = cashShiftService.getGeneralMovements().catch(() => []);
      const [current, shiftHistory, general] = await Promise.all([currentPromise, historyPromise, generalPromise]);
      setCurrentShift(current);
      setHistory(shiftHistory);
      setGeneralMovements(general);
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('cashLoadError')) });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [canReport]);

  useEffect(() => {
    if (!showCloseDialog && !showWithdrawalWarning && !showDepositDialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        setShowCloseDialog(false);
        setShowWithdrawalWarning(false);
        setShowDepositDialog(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [showCloseDialog, showWithdrawalWarning, showDepositDialog, saving]);

  const handleOpenShift = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(openingAmount);
    if (openingAmount === '' || !Number.isFinite(amount) || amount < 0) {
      setNotice({ type: 'error', text: t('invalidOpeningAmount') });
      return;
    }
    await runAction(async () => {
      try {
        const shift = await cashShiftService.openShift(amount, openingNotes);
        setCurrentShift(shift);
        setOpeningAmount('');
        setOpeningNotes('');
        setNotice({ type: 'success', text: t('shiftOpenedSuccess') });
        await refreshHistory();
      } catch (error) {
        const recoveredShift = await cashShiftService.getCurrentShift().catch(() => null);
        if (recoveredShift) {
          setCurrentShift(recoveredShift);
          setNotice({ type: 'error', text: errorMessage(error, t('cashOperationError')) });
        } else {
          await loadData(false);
          throw error;
        }
      }
    });
  };

  const submitWithdrawalForm = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(withdrawalAmount);
    if (withdrawalAmount === '' || !Number.isFinite(amount) || amount <= 0 || withdrawalReason.trim().length < 3) {
      setNotice({ type: 'error', text: t('invalidWithdrawal') });
      return;
    }
    if (currentShift && amount > currentShift.expectedClosingAmount) {
      setShowWithdrawalWarning(true);
      return;
    }
    void executeWithdrawal();
  };

  const executeWithdrawal = async () => {
    const amount = Number(withdrawalAmount);
    setShowWithdrawalWarning(false);
    await runAction(async () => {
      const shift = await cashShiftService.registerWithdrawal(amount, withdrawalReason);
      setCurrentShift(shift);
      setWithdrawalAmount('');
      setWithdrawalReason('');
      setNotice({ type: 'success', text: t('withdrawalSuccess') });
      await loadData(false);
    });
  };

  const handleDeposit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(depositAmount);
    if (depositAmount === '' || !Number.isFinite(amount) || amount <= 0 || depositReason.trim().length < 3) {
      setNotice({ type: 'error', text: t('invalidDeposit') });
      return;
    }
    await runAction(async () => {
      const shift = await cashShiftService.registerDeposit(amount, depositReason);
      setCurrentShift(shift);
      setDepositAmount('');
      setDepositReason('');
      setShowDepositDialog(false);
      setNotice({ type: 'success', text: t('depositSuccess') });
      await loadData(false);
    });
  };

  const handleXReport = async () => {
    await runAction(async () => {
      const shift = await cashShiftService.generateXReport();
      setCurrentShift(shift);
      setNotice({ type: 'success', text: t('xReportSuccess') });
    });
  };

  const openCloseDialog = async () => {
    setClosingAmount('');
    setClosingNotes('');
    setNotice(null);
    let targetShift = currentShift;
    if (!targetShift) {
      targetShift = await cashShiftService.getCurrentShift().catch(() => null);
      if (targetShift) {
        setCurrentShift(targetShift);
      }
    }
    if (!targetShift) {
      setNotice({ type: 'error', text: t('noOpenShiftToClose') });
      return;
    }
    setShowCloseDialog(true);
  };

  const handleCloseShift = async (event: React.FormEvent) => {
    event.preventDefault();
    let targetShift = currentShift;
    if (!targetShift) {
      targetShift = await cashShiftService.getCurrentShift().catch(() => null);
    }
    if (!targetShift) {
      setNotice({ type: 'error', text: t('noOpenShiftToClose') });
      setShowCloseDialog(false);
      return;
    }
    const expected = targetShift.expectedClosingAmount ?? 0;
    const amount = Number(closingAmount);
    const difference = amount - expected;
    if (closingAmount === '' || !Number.isFinite(amount) || amount < 0) {
      setNotice({ type: 'error', text: t('invalidClosingAmount') });
      return;
    }
    if (Math.abs(difference) > 0.01 && closingNotes.trim().length < 3) {
      setNotice({ type: 'error', text: t('closingJustificationRequired') });
      return;
    }

    await runAction(async () => {
      const closed = await cashShiftService.closeShift(amount, closingNotes);
      setShowCloseDialog(false);
      setCurrentShift(null);
      setNotice({
        type: 'success',
        text: t('shiftClosedWithDifference', { difference: moneyFormatter.format(closed.differenceAmount) })
      });
      await loadData(false);
    });
  };

  const runAction = async (action: () => Promise<void>) => {
    try {
      setSaving(true);
      setNotice(null);
      await action();
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('cashOperationError')) });
    } finally {
      setSaving(false);
    }
  };

  const refreshHistory = async () => {
    if (canReport) setHistory(await cashShiftService.getShiftHistory());
  };

  const closeDifference = closingAmount !== ''
    ? Number(closingAmount) - (currentShift?.expectedClosingAmount ?? 0)
    : null;

  if (loading) return <div className="cash-loading">{t('loading')}</div>;

  return (
    <section className="cash-page">
      <header className="cash-page__header">
        <div>
          <h1>💵 {t('cashShiftTitle')}</h1>
          <p>{t('cashShiftSubtitle')}</p>
        </div>
        <div className="cash-page__header-actions">
          {currentShift && <button className="cash-secondary-btn" disabled={saving} onClick={() => setShowDepositDialog(true)}>📥 {t('registerDeposit')}</button>}
          {currentShift && canReport && <button className="cash-secondary-btn" disabled={saving} onClick={() => void handleXReport()}>📄 {t('generateXReport')}</button>}
          <button className="cash-secondary-btn" disabled={saving} onClick={() => void loadData(false)}>↻ {t('refresh')}</button>
        </div>
      </header>

      {notice && <div className={`cash-notice cash-notice--${notice.type}`} role="alert">{notice.text}</div>}

      {!currentShift ? (
        <article className="cash-card cash-open-card">
          <div className="cash-card__heading">
            <div><h2>🔓 {t('openShift')}</h2><p>{t('openShiftHint')}</p></div>
            <span className="cash-status cash-status--closed">{t('noOpenShift')}</span>
          </div>
          {canOpen ? (
            <form className="cash-form" onSubmit={handleOpenShift}>
              <label>{t('openingFloatAmount')} *
                <input type="number" min="0" max="1000000" step="0.01" value={openingAmount} onChange={event => setOpeningAmount(event.target.value)} placeholder="0.00" required />
              </label>
              <label>{t('notes')}
                <textarea rows={3} maxLength={500} value={openingNotes} onChange={event => setOpeningNotes(event.target.value)} placeholder={t('openingNotesPlaceholder')} />
              </label>
              <button className="action-btn" type="submit" disabled={saving}>{saving ? t('saving') : t('openShift')}</button>
            </form>
          ) : <p className="cash-muted">{t('noOpenPermission')}</p>}
          {SHOW_FORCE_CORTE_Z && (canClose || canReport) && (
            <div style={{ marginTop: '16px', padding: '14px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffe79a' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 600, color: '#856404' }}>
                ⚠️ Si existe un turno activo previo que impide la apertura, puedes recuperar o forzar el Corte Z para cerrar el turno y liberar la caja:
              </p>
              <button type="button" className="cash-danger-btn" onClick={() => void openCloseDialog()}>
                🔒 Ejecutar Corte Z y Cerrar Turno Activo
              </button>
            </div>
          )}
        </article>
      ) : (
        <>
          <article className="cash-card">
            <div className="cash-card__heading">
              <div>
                <h2>{currentShift.shiftNumber}</h2>
                <p>{t('cashierAndOpening', { user: currentShift.userUsername || '—', date: safeDate(currentShift.openedAtUtc, dateFormatter) })}</p>
              </div>
              <span className="cash-status cash-status--open">● {t('shiftStatusOpen')}</span>
            </div>
            <div className="cash-metrics">
              <CashMetric icon="💵" label={t('openingFloatAmount')} value={moneyFormatter.format(currentShift.openingAmount)} />
              <CashMetric icon="💵" label={t('totalSalesCash')} value={moneyFormatter.format(currentShift.totalSalesCash)} />
              <CashMetric icon="💳" label={t('totalSalesCard')} value={moneyFormatter.format(currentShift.totalSalesCard)} />
              <CashMetric icon="🏦" label={t('totalSalesTransfer')} value={moneyFormatter.format(currentShift.totalSalesTransfer)} />
              <CashMetric icon="📥" label="Ingreso / Ajuste Cambio" value={safeMoney(currentShift.totalCashDeposits ?? currentShift.totalEntradas, moneyFormatter)} tone="accent" />
              <CashMetric icon="💸" label={t('totalWithdrawals')} value={moneyFormatter.format(currentShift.totalWithdrawals)} tone="danger" />
              <CashMetric icon="📊" label="Esperado en Caja ($)" value={moneyFormatter.format(currentShift.expectedClosingAmount)} tone="accent" subtitle="Fondo + Ingresos + Ventas/Abonos Efectivo - Retiros" />
            </div>
          </article>

          <div className="cash-actions-grid">
            {canWithdraw && <article className="cash-card">
              <h2>📤 {t('registerWithdrawal')}</h2>
              <p className="cash-muted">{t('withdrawalHint')}</p>
              <form className="cash-form" onSubmit={submitWithdrawalForm}>
                <label>{t('withdrawalAmount')} *<input type="number" min="0.01" max="1000000" step="0.01" value={withdrawalAmount} onChange={event => setWithdrawalAmount(event.target.value)} placeholder="0.00" required /></label>
                <label>{t('withdrawalReason')} *<textarea rows={3} minLength={3} maxLength={250} value={withdrawalReason} onChange={event => setWithdrawalReason(event.target.value)} placeholder={t('withdrawalReasonPlaceholder')} required /></label>
                <button className="cash-danger-btn" type="submit" disabled={saving}>{saving ? t('saving') : t('registerWithdrawal')}</button>
              </form>
            </article>}

            {canClose && <article className="cash-card cash-close-card">
              <h2>🔒 {t('zReportTitle')}</h2>
              <p>{t('zReportHint')}</p>
              <div className="cash-close-card__amount"><span>Esperado en Caja ($)</span><strong>{moneyFormatter.format(currentShift.expectedClosingAmount)}</strong></div>
              <div className="cash-close-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', margin: '0.75rem 0', padding: '0.65rem 0.85rem', background: 'rgba(255, 255, 255, 0.75)', borderRadius: '6px', fontSize: '0.82rem', color: '#1e293b' }}>
                <div>💵 <strong>Fondo:</strong> <span className={currentShift.openingAmount > 0 ? 'cash-positive' : ''}>+{moneyFormatter.format(currentShift.openingAmount)}</span></div>
                <div>📥 <strong>Ingresos:</strong> <span className={(currentShift.totalCashDeposits ?? currentShift.totalEntradas ?? 0) > 0 ? 'cash-positive' : ''}>+{moneyFormatter.format(currentShift.totalCashDeposits ?? currentShift.totalEntradas ?? 0)}</span></div>
                <div>💰 <strong>Ventas/Abonos Efec.:</strong> <span className={currentShift.totalSalesCash > 0 ? 'cash-positive' : ''}>+{moneyFormatter.format(currentShift.totalSalesCash)}</span></div>
                <div>💸 <strong>Retiros:</strong> <span className={currentShift.totalWithdrawals > 0 ? 'cash-negative' : ''}>-{moneyFormatter.format(currentShift.totalWithdrawals)}</span></div>
              </div>
              <button className="cash-danger-btn" disabled={saving} onClick={openCloseDialog}>{t('startZReport')}</button>
            </article>}
          </div>

          <article className="cash-card">
                <div className="cash-card__heading"><div><h2>📋 {t('cashMovements')} ({t('shiftStatusOpen')})</h2><p>{t('cashMovementsHint')}</p></div><div className="cash-export-heading"><strong>{directTransactions.length}</strong><ExportButtons data={directTransactions} config={currentMovementsExportConfig} /></div></div>
                <div className="cash-table-wrapper">
                  <table className="cash-table">
                    <thead><tr><th>{t('date')}</th><th>{t('type')}</th><th>{t('reason')}</th><th>{t('user')}</th><th>{t('amount')}</th></tr></thead>
                    <tbody>{directTransactions.map(transaction => <tr key={transaction.id || Math.random()}>
                      <td>{safeDate(transaction.createdAtUtc, dateFormatter)}</td>
                      <td><span className="cash-transaction-badge">{t(transactionTypeKey(transaction.transactionType))}</span></td>
                      <td>{transaction.reason || '—'}</td>
                      <td>{transaction.userUsername || currentShift.userUsername || '—'}</td>
                      <td>{safeMoney(transaction.amount, moneyFormatter)}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </article>
        </>
      )}

      {Array.isArray(generalMovements) && generalMovements.length > 0 && <article className="cash-card">
        <div className="cash-card__heading"><div><h2>{t('generalMovementsTitle')}</h2><p>{t('generalMovementsSubtitle')}</p></div><div className="cash-export-heading"><strong>{generalMovements.length}</strong><ExportButtons data={generalMovements} config={generalMovementsExportConfig} onLoadAllData={kind => loadAllPagesForExport(kind, paging => cashShiftService.getGeneralMovements(paging))} /></div></div>
        <div className="cash-table-wrapper">
          <table className="cash-table">
            <thead><tr><th>{t('date')}</th><th>Categoría</th><th>{t('folio')}</th><th>Tipo Movimiento</th><th>Descripción</th><th>{t('user')}</th><th>{t('amount')}</th></tr></thead>
            <tbody>{generalMovements.map(item => {
              if (!item) return null;
              const categoryBadge = formatMovementCategory(item.category);
              const movementBadge = formatMovementType(item.paymentMethod);
              const descriptionText = formatMovementDescription(item);
              return (
                <tr key={item.id || Math.random()}>
                  <td>{safeDate(item.createdAtUtc, dateFormatter)}</td>
                  <td><span className="badge badge-info">{categoryBadge}</span></td>
                  <td>{item.idVenta ? <strong>{t('saleNumber', { idVenta: item.idVenta })}</strong> : '—'}</td>
                  <td><span className="badge badge-success">{movementBadge}</span></td>
                  <td>{descriptionText}</td>
                  <td>{item.userUsername || '—'}</td>
                  <td><strong>{safeMoney(item.amount, moneyFormatter)}</strong></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </article>}

      {canReport && <article className="cash-card">
        <div className="cash-card__heading"><div><h2>{t('cashShiftHistory')}</h2><p>{t('cashShiftHistoryHint')}</p></div><div className="cash-export-heading"><strong>{Array.isArray(history) ? history.length : 0}</strong><ExportButtons data={history} config={historyExportConfig} onLoadAllData={kind => loadAllPagesForExport(kind, paging => cashShiftService.getShiftHistory(paging))} /></div></div>
        <div className="cash-table-wrapper">
          <table className="cash-table cash-table--history">
            <thead><tr><th>{t('shiftNumber')}</th><th>{t('user')}</th><th>{t('openedAt')}</th><th>{t('closedAt')}</th><th>{t('expectedClosingAmount')}</th><th>{t('actualClosingAmount')}</th><th>{t('difference')}</th><th>{t('status')}</th></tr></thead>
            <tbody>{Array.isArray(history) && history.map(shift => {
              if (!shift) return null;
              const diff = shift.differenceAmount ?? 0;
              return (
                <tr key={shift.id || Math.random()}>
                  <td><strong>{shift.shiftNumber || '—'}</strong></td>
                  <td>{shift.userUsername || '—'}</td>
                  <td>{safeDate(shift.openedAtUtc, dateFormatter)}</td>
                  <td>{shift.closedAtUtc ? safeDate(shift.closedAtUtc, dateFormatter) : '—'}</td>
                  <td>{safeMoney(shift.expectedClosingAmount, moneyFormatter)}</td>
                  <td>{shift.status === 'Cerrado' ? safeMoney(shift.actualClosingAmount, moneyFormatter) : '—'}</td>
                  <td className={diff === 0 ? '' : diff > 0 ? 'cash-positive' : 'cash-negative'}>{shift.status === 'Cerrado' ? safeMoney(shift.differenceAmount, moneyFormatter) : '—'}</td>
                  <td><span className={`cash-status cash-status--${shift.status === 'Abierto' ? 'open' : 'closed'}`}>{shift.status === 'Abierto' ? t('shiftStatusOpen') : t('shiftStatusClosed')}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        {(!Array.isArray(history) || history.length === 0) && <div className="cash-empty">{t('noCashShiftHistory')}</div>}
      </article>}

      {showDepositDialog && <div className="cash-modal-backdrop">
        <div className="cash-modal" role="dialog" aria-modal="true" aria-labelledby="cash-deposit-title">
          <div className="cash-modal__header"><div><h2 id="cash-deposit-title">{t('registerDeposit')}</h2><p>{t('depositReasonPlaceholder')}</p></div><button aria-label={t('close')} onClick={() => { setShowDepositDialog(false); setNotice(null); }}>×</button></div>
          {notice && <div className={`cash-notice cash-notice--${notice.type}`} role="alert" style={{ marginTop: '0.75rem' }}>{notice.text}</div>}
          <form className="cash-form" onSubmit={handleDeposit}>
            <label>{t('depositAmount')} *<input autoFocus type="number" min="0.01" max="1000000" step="0.01" value={depositAmount} onChange={event => setDepositAmount(event.target.value)} placeholder="0.00" required /></label>
            <label>{t('depositReason')} *<textarea rows={3} minLength={3} maxLength={250} value={depositReason} onChange={event => setDepositReason(event.target.value)} placeholder={t('depositReasonPlaceholder')} required /></label>
            <div className="cash-modal__actions"><button type="button" className="cash-secondary-btn" disabled={saving} onClick={() => { setShowDepositDialog(false); setNotice(null); }}>{t('cancel')}</button><button type="submit" className="action-btn" disabled={saving}>{saving ? t('saving') : t('registerDeposit')}</button></div>
          </form>
        </div>
      </div>}

      {showWithdrawalWarning && currentShift && <div className="cash-modal-backdrop">
        <div className="cash-modal" role="dialog" aria-modal="true" aria-labelledby="cash-warning-title">
          <div className="cash-modal__header"><div><h2 id="cash-warning-title">{t('withdrawalWarningTitle')}</h2><p>{t('withdrawalWarningText', { amount: safeMoney(Number(withdrawalAmount), moneyFormatter), available: safeMoney(currentShift.expectedClosingAmount, moneyFormatter) })}</p></div><button aria-label={t('close')} onClick={() => { setShowWithdrawalWarning(false); setNotice(null); }}>×</button></div>
          {notice && <div className={`cash-notice cash-notice--${notice.type}`} role="alert" style={{ marginTop: '0.75rem' }}>{notice.text}</div>}
          <div className="cash-modal__actions">
            <button type="button" className="cash-secondary-btn" onClick={() => { setShowWithdrawalWarning(false); setNotice(null); }}>{t('cancel')}</button>
            <button type="button" className="cash-danger-btn" disabled={saving} onClick={() => void executeWithdrawal()}>{t('confirmWithdrawal')}</button>
          </div>
        </div>
      </div>}

      {showCloseDialog && currentShift && <div className="cash-modal-backdrop">
        <div className="cash-modal" role="dialog" aria-modal="true" aria-labelledby="cash-close-title">
          <div className="cash-modal__header"><div><h2 id="cash-close-title">{t('confirmZReport')}</h2><p>{t('confirmZReportHint')}</p></div><button aria-label={t('close')} onClick={() => { setShowCloseDialog(false); setNotice(null); }}>×</button></div>
          {notice && <div className={`cash-notice cash-notice--${notice.type}`} role="alert" style={{ marginTop: '0.75rem' }}>{notice.text}</div>}
          <form className="cash-form" onSubmit={handleCloseShift}>
            <div className="cash-close-summary">
              <span>Esperado en Caja ($)<strong>{safeMoney(currentShift.expectedClosingAmount, moneyFormatter)}</strong></span>
              <span>{t('calculatedDifference')}<strong className={closeDifference == null || Math.abs(closeDifference) <= 0.01 ? '' : closeDifference > 0 ? 'cash-positive' : 'cash-negative'}>{closeDifference == null ? '—' : safeMoney(closeDifference, moneyFormatter)}</strong></span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#1e293b' }}>
              <div>💵 <strong>Fondo Inicial:</strong> <span className={currentShift.openingAmount > 0 ? 'cash-positive' : ''}>+{safeMoney(currentShift.openingAmount, moneyFormatter)}</span></div>
              <div>📥 <strong>Ingresos:</strong> <span className={(currentShift.totalCashDeposits ?? currentShift.totalEntradas ?? 0) > 0 ? 'cash-positive' : ''}>+{safeMoney(currentShift.totalCashDeposits ?? currentShift.totalEntradas, moneyFormatter)}</span></div>
              <div>💰 <strong>Ventas/Abonos Efectivo:</strong> <span className={currentShift.totalSalesCash > 0 ? 'cash-positive' : ''}>+{safeMoney(currentShift.totalSalesCash, moneyFormatter)}</span></div>
              <div>💸 <strong>Retiros:</strong> <span className={currentShift.totalWithdrawals > 0 ? 'cash-negative' : ''}>-{safeMoney(currentShift.totalWithdrawals, moneyFormatter)}</span></div>
            </div>
            <label>{t('actualClosingAmount')} *<input autoFocus type="number" min="0" max="1000000" step="0.01" value={closingAmount} onChange={event => setClosingAmount(event.target.value)} placeholder="0.00" required /></label>
            <label>{t('closingJustification')} {closeDifference != null && Math.abs(closeDifference) > 0.01 ? '*' : ''}<textarea rows={4} maxLength={500} value={closingNotes} onChange={event => setClosingNotes(event.target.value)} placeholder={t('closingJustificationPlaceholder')} /></label>
            <div className="cash-modal__actions"><button type="button" className="cash-secondary-btn" disabled={saving} onClick={() => { setShowCloseDialog(false); setNotice(null); }}>{t('cancel')}</button><button type="submit" className="cash-danger-btn" disabled={saving}>{saving ? t('saving') : t('executeZReport')}</button></div>
          </form>
        </div>
      </div>}
    </section>
  );
};

const CashMetric: React.FC<{ icon: string; label: string; value: string; tone?: 'accent' | 'danger'; subtitle?: string }> = ({ icon, label, value, tone, subtitle }) => (
  <div className={`cash-metric ${tone ? `cash-metric--${tone}` : ''}`}>
    <span>{icon} {label}</span>
    <strong>{value}</strong>
    {subtitle && <small style={{ display: 'block', fontSize: '0.72rem', opacity: 0.85, marginTop: '2px', fontWeight: 500 }}>{subtitle}</small>}
  </div>
);

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const safeDate = (dateStr?: string | null, formatter?: Intl.DateTimeFormat) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : (formatter ? formatter.format(d) : d.toLocaleString());
  } catch {
    return '—';
  }
};

const safeMoney = (amount?: number | null, formatter?: Intl.NumberFormat) => {
  const num = Number(amount ?? 0);
  const validNum = Number.isFinite(num) ? num : 0;
  return formatter ? formatter.format(validNum) : `$${validNum.toFixed(2)}`;
};

const transactionTypeKey = (type?: string | null) => {
  if (!type || typeof type !== 'string') return 'cashTransactionOpening';
  return ({
    Apertura: 'cashTransactionOpening',
    Opening: 'cashTransactionOpening',
    RetiroManual: 'cashTransactionWithdrawal',
    ManualWithdrawal: 'cashTransactionWithdrawal',
    Cierre: 'cashTransactionClosing',
    Closing: 'cashTransactionClosing',
    EntradaManual: 'cashTransactionInstallment',
    ManualDeposit: 'cashTransactionInstallment',
    EntradaVenta: 'cashTransactionSale',
    EntradaAbono: 'cashTransactionInstallment',
    Abono: 'cashTransactionInstallment',
    Devolucion: 'cashTransactionRefund'
  } as Record<string, string>)[type] ?? type;
};

const formatMovementCategory = (category?: string | null) => {
  if (!category || typeof category !== 'string') return 'Movimiento';
  const c = category.trim().toLowerCase();
  if (c === 'venta / abono' || c === 'venta/abono') return 'Venta / Abono';
  if (c === 'sale' || c === 'venta') return 'Venta';
  if (c === 'quoteconversion') return 'Venta (Cotización)';
  if (c === 'installment' || c === 'abono') return 'Abono';
  if (c === 'refund' || c === 'devolucion' || c === 'devolución') return 'Devolución';
  if (c === 'manualdeposit' || c.includes('ingreso')) return 'Ingreso / Cambio';
  if (c === 'manualwithdrawal' || c.includes('retiro') || c.includes('sangría')) return 'Retiro / Sangría';
  if (c === 'opening' || c === 'apertura') return 'Apertura';
  if (c === 'xreport' || c === 'cortex' || c.includes('corte x') || c.includes('cortex')) return 'Corte X';
  if (c === 'closing' || c === 'cierre' || c.includes('corte z') || c.includes('cortez')) return 'Corte Z';
  return category;
};

const formatMovementType = (type?: string | null) => {
  if (!type || typeof type !== 'string') return '—';
  const t = type.trim().toLowerCase();
  if (t === 'cash' || t === 'efectivo') return '💵 Efectivo';
  if (t === 'card' || t === 'tarjeta') return '💳 Tarjeta';
  if (t === 'transfer' || t === 'spei' || t === 'transferencia') return '🏦 SPEI';
  if (t === 'mixed' || t === 'mixto') return '🔀 Pago Mixto';
  return type;
};

const formatMovementDescription = (item?: { category?: string | null; reference?: string | null } | null) => {
  if (!item) return 'Movimiento de caja';
  const rawCat = (item.category || '').trim();
  const c = rawCat.toLowerCase();
  const desc = (item.reference || '').trim();

  if (c === 'ingreso / cambio' || c === 'ingreso/cambio' || c === 'manualdeposit' || c.includes('ingreso')) {
    return 'Entrada de dinero a caja';
  }
  if (c === 'venta / abono' || c === 'venta/abono' || c === 'venta (cotización)' || c === 'venta (cotizacion)' || c === 'quoteconversion') {
    return 'abono a venta';
  }
  if (c === 'abono' || c === 'installment') return 'abono a venta';
  if (c === 'xreport' || c === 'cortex' || c.includes('corte x') || c.includes('cortex')) return 'Generación de Corte X de caja';
  if (c === 'retiro / sangría' || c === 'manualwithdrawal') return desc || 'Retiro / Sangría de caja';
  if (c === 'venta' || c === 'sale') return desc.startsWith('Venta') ? desc : `Venta ${desc}`;
  return desc || 'Movimiento de caja';
};

export default CashShiftPage;
