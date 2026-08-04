import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CashShift } from '../../types/reports';
import { cashShiftService } from '../../services/cashShiftService';

export const CashShiftPage: React.FC = () => {
  const { t } = useTranslation();
  const [currentShift, setCurrentShift] = useState<CashShift | null>(null);
  const [openingAmount, setOpeningAmount] = useState<number>(1000);
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(0);
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [closingAmount, setClosingAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShift();
  }, []);

  const loadShift = async () => {
    setLoading(true);
    try {
      const shift = await cashShiftService.getCurrentShift();
      setCurrentShift(shift);
    } catch {
      setCurrentShift(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const shift = await cashShiftService.openShift(openingAmount, notes);
      setCurrentShift(shift);
      alert(t('shiftOpenedSuccess'));
    } catch (err: any) {
      alert(err.message || 'Error al abrir turno');
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawalAmount <= 0) return;
    try {
      const shift = await cashShiftService.registerWithdrawal(withdrawalAmount, withdrawalReason);
      setCurrentShift(shift);
      setWithdrawalAmount(0);
      setWithdrawalReason('');
      alert(t('withdrawalSuccess'));
    } catch (err: any) {
      alert(err.message || 'Error al registrar retiro');
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const closed = await cashShiftService.closeShift(closingAmount, notes);
      setCurrentShift(null);
      alert(`${t('shiftClosedSuccess')}: Diferencia $${closed.differenceAmount.toFixed(2)}`);
    } catch (err: any) {
      alert(err.message || 'Error al cerrar turno');
    }
  };

  if (loading) return <div>{t('loading')}</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
      {/* Current Shift / Open Shift Card */}
      <div className="card">
        <h3>💵 {t('cashShiftTitle')}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          {t('cashShiftSubtitle')}
        </p>

        {!currentShift ? (
          <form onSubmit={handleOpenShift}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('openingFloatAmount')}</label>
              <input
                type="number"
                className="form-control"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(parseFloat(e.target.value) || 0)}
                required
                style={{ marginTop: '0.25rem' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('notes')}</label>
              <input
                type="text"
                className="form-control"
                placeholder="Fondo de caja turno matutino"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ marginTop: '0.25rem' }}
              />
            </div>
            <button className="btn-primary" type="submit">
              🚀 {t('openShift')}
            </button>
          </form>
        ) : (
          <div>
            <div style={{ background: 'rgba(16,185,129,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--success)' }}>
                🟢 <strong>{t('shiftStatusOpen')}</strong> &bull; Folio: {currentShift.shiftNumber}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {t('openedAt')}: {new Date(currentShift.openedAtUtc).toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              <div>{t('openingFloatAmount')}: <strong>${currentShift.openingAmount.toFixed(2)}</strong></div>
              <div>{t('totalSalesCash')}: <strong>${currentShift.totalSalesCash.toFixed(2)}</strong></div>
              <div>{t('totalWithdrawals')}: <strong>${currentShift.totalWithdrawals.toFixed(2)}</strong></div>
              <div>{t('expectedClosingAmount')}: <strong style={{ color: 'var(--accent-primary)' }}>${currentShift.expectedClosingAmount.toFixed(2)}</strong></div>
            </div>

            {/* Withdrawal Form */}
            <form onSubmit={handleWithdrawal} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
              <h4>📤 {t('registerWithdrawal')}</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Monto $"
                  value={withdrawalAmount || ''}
                  onChange={(e) => setWithdrawalAmount(parseFloat(e.target.value) || 0)}
                  style={{ width: '120px' }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Motivo (ej. Pago de flete)"
                  value={withdrawalReason}
                  onChange={(e) => setWithdrawalReason(e.target.value)}
                />
                <button className="lang-btn" type="submit">OK</button>
              </div>
            </form>

            {/* Close Shift Form */}
            <form onSubmit={handleCloseShift} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <h4>🔒 {t('closeShiftTitle')} (Corte X/Z)</h4>
              <div style={{ margin: '0.75rem 0' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('actualClosingAmount')}</label>
                <input
                  type="number"
                  className="form-control"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(parseFloat(e.target.value) || 0)}
                  required
                  style={{ marginTop: '0.25rem' }}
                />
              </div>
              <button className="btn-primary" type="submit" style={{ background: 'var(--danger)' }}>
                🛑 {t('closeShiftBtn')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashShiftPage;
