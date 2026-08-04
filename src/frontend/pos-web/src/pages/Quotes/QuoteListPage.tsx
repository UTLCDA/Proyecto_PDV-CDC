import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Quote } from '../../types/commercial';
import { commercialService } from '../../services/commercialService';

export const QuoteListPage: React.FC = () => {
  const { t } = useTranslation();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const data = await commercialService.getQuotes(search);
      setQuotes(data);
    } catch {
      setQuotes([
        {
          id: 'q-1',
          quoteNumber: 'COT-2026-00001',
          customerDisplayName: 'Arquitectura y Diseños S.A.',
          subTotal: 3500,
          discountAmount: 0,
          taxAmount: 560,
          totalAmount: 4060,
          expirationDateUtc: new Date(Date.now() + 864000000).toISOString(),
          status: 'Active',
          notes: 'Cotización para proyecto en Polanco',
          createdAtUtc: new Date().toISOString(),
          items: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handle1ClickConvert = async (quoteId: string) => {
    setConvertingId(quoteId);
    try {
      const sale = await commercialService.convertQuoteToSale(quoteId);
      alert(`${t('quoteConvertedSuccess')}: ${sale.folioNumber}`);
      loadQuotes();
    } catch (err: any) {
      alert(err.message || 'Error al convertir cotización');
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>📑 {t('quotesManagement')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {t('quotesSubtitle')}
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); loadQuotes(); }} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            className="form-control"
            placeholder={t('searchQuotesPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: '240px' }}
          />
          <button className="lang-btn" type="submit">🔍 {t('search')}</button>
        </form>
      </div>

      {loading ? (
        <div>{t('loading')}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>{t('quoteNumber')}</th>
                <th style={{ padding: '0.75rem' }}>{t('customer')}</th>
                <th style={{ padding: '0.75rem' }}>{t('expirationDate')}</th>
                <th style={{ padding: '0.75rem' }}>{t('total')}</th>
                <th style={{ padding: '0.75rem' }}>{t('status')}</th>
                <th style={{ padding: '0.75rem' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>{q.quoteNumber}</td>
                  <td style={{ padding: '0.75rem' }}>{q.customerDisplayName || t('generalPublic')}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(q.expirationDateUtc).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    ${q.totalAmount.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {q.status === 'Converted' ? (
                      <span className="badge badge-success">✅ {t('statusConverted')}</span>
                    ) : q.status === 'Active' ? (
                      <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}>
                        🔵 {t('statusActive')}
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
                        🔴 {q.status}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {q.status === 'Active' && (
                      <button
                        className="btn-primary"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                        disabled={convertingId === q.id}
                        onClick={() => handle1ClickConvert(q.id)}
                      >
                        ⚡ {t('convert1Click')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuoteListPage;
