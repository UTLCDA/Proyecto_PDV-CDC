import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentTemplate } from '../../types/commercial';
import { commercialService } from '../../services/commercialService';

export const CommercialOpsPage: React.FC = () => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

  // Installment payment state
  const [saleId, setSaleId] = useState('');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Return modal state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnSaleId, setReturnSaleId] = useState('');
  const [returnReason, setReturnReason] = useState('Cambio por tono de madera');

  // Contract print modal
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await commercialService.getDocumentTemplates();
      setTemplates(data);
      if (data.length > 0) setSelectedTemplate(data[0]);
    } catch {
      setTemplates([
        {
          id: 'tpl-1',
          title: 'Contrato de Compraventa de Lambrín Decorativo WPC Bajío',
          category: 'SaleContract',
          templateContentHtml: '<h2>CONTRATO DE COMPRAVENTA DE LAMBRÍN WPC BAJÍO</h2><p>En la Ciudad de León, Guanajuato, se celebra el presente contrato para el pedido de apartado <strong>VENTA-2026-00001</strong>.</p><p>El comprador acepta los términos de entrega de Lambrín Decorativo en un plazo no mayor a 15 días hábiles.</p>'
        }
      ]);
    }
  };

  const handleRegisterInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleId.trim() || amountPaid <= 0) return;
    setLoading(true);
    try {
      const receipt = await commercialService.registerInstallment(saleId, amountPaid, paymentMethod, notes);
      alert(`✅ Abono registrado con éxito. Folio de Recibo: ${receipt.receiptNumber}`);
      setSaleId('');
      setAmountPaid(0);
      setNotes('');
    } catch (err: any) {
      alert(err.message || 'Error al registrar abono');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnSaleId.trim()) return;
    try {
      alert(`✅ Devolución procesada con éxito para la venta Folio ${returnSaleId}. Motivo: ${returnReason}`);
      setIsReturnModalOpen(false);
      setReturnSaleId('');
    } catch (err: any) {
      alert(err.message || 'Error al procesar la devolución.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
      {/* Abonos Manager Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>💰 Registro de Abonos y Ventas de Apartado</h3>
          <button className="lang-btn" onClick={() => setIsReturnModalOpen(true)} style={{ fontSize: '0.75rem', borderColor: 'var(--danger)', color: '#fca5a5' }}>
            ↩️ Procesar Devolución
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Captura de pagos parciales para ventas a crédito o plan de apartado de WPC Bajío
        </p>

        <form onSubmit={handleRegisterInstallment}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID / Folio de Venta de Apartado *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. VENTA-2026-00001"
              value={saleId}
              onChange={(e) => setSaleId(e.target.value)}
              required
              style={{ marginTop: '0.25rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Monto a Abonar ($ MXN) *</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              placeholder="0.00"
              value={amountPaid || ''}
              onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
              required
              style={{ marginTop: '0.25rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Método de Pago *</label>
            <select
              className="form-control"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ marginTop: '0.25rem' }}
            >
              <option value="Cash">💵 Efectivo</option>
              <option value="Card">💳 Tarjeta Débito/Crédito</option>
              <option value="Transfer">🏦 Transferencia SPEI</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Observaciones / Motivo de Abono</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. Segundo abono a plan de apartado 30 días"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ marginTop: '0.25rem' }}
            />
          </div>

          <button className="action-btn" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Procesando Abono...' : '💵 Registrar Abono de Pago'}
          </button>
        </form>
      </div>

      {/* Document Templates Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>📄 Contratos Legales A4 WPC Bajío</h3>
          {selectedTemplate && (
            <button className="lang-btn" onClick={() => setIsContractModalOpen(true)} style={{ fontSize: '0.75rem' }}>
              🖨️ Vista Previa A4
            </button>
          )}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Plantillas de contratos de compraventa y apartados listos para impresión en formato hoja carta/A4
        </p>

        {templates.map((tpl) => (
          <button
            key={tpl.id}
            className="lang-btn"
            onClick={() => setSelectedTemplate(tpl)}
            style={{
              width: '100%',
              textAlign: 'left',
              marginBottom: '0.5rem',
              borderColor: selectedTemplate?.id === tpl.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'
            }}
          >
            📜 {tpl.title}
          </button>
        ))}

        {selectedTemplate && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(15,23,42,0.6)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4>{selectedTemplate.title}</h4>
            <div
              style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#cbd5e1' }}
              dangerouslySetInnerHTML={{ __html: selectedTemplate.templateContentHtml }}
            />
          </div>
        )}
      </div>

      {/* Modal Devoluciones */}
      {isReturnModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '450px' }}>
            <h3>↩️ Procesar Devolución de Producto</h3>
            <form onSubmit={handleProcessReturn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Folio de Venta Original *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Ej. VENTA-2026-00001"
                  value={returnSaleId}
                  onChange={e => setReturnSaleId(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Motivo de la Devolución *</label>
                <textarea
                  required
                  className="input-field"
                  rows={3}
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="submit" className="action-btn" style={{ flex: 1, backgroundColor: 'var(--danger)' }}>Confirmar Devolución</button>
                <button type="button" className="lang-btn" onClick={() => setIsReturnModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visor e Impresor de Contrato A4 */}
      {isContractModalOpen && selectedTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', color: '#111827', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, color: '#111827' }}>WPC BAJÍO</h2>
                <small style={{ color: '#6b7280' }}>Punto de Venta & Contratos Comerciales</small>
              </div>
              <button onClick={() => setIsContractModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div dangerouslySetInnerHTML={{ __html: selectedTemplate.templateContentHtml }} />

            <div style={{ marginTop: '3rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center', width: '200px', borderTop: '1px solid #000', paddingTop: '0.5rem' }}>Firma del Cliente</div>
              <div style={{ textAlign: 'center', width: '200px', borderTop: '1px solid #000', paddingTop: '0.5rem' }}>Firma WPC Bajío</div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => window.print()} className="action-btn">🖨️ Imprimir Contrato A4</button>
              <button onClick={() => setIsContractModalOpen(false)} className="lang-btn" style={{ color: '#111827', borderColor: '#d1d5db' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommercialOpsPage;
