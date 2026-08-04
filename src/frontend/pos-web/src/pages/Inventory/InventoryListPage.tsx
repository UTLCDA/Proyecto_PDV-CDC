import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Stock, InventoryMovement } from '../../types/inventory';
import { inventoryService } from '../../services/inventoryService';

export const InventoryListPage: React.FC = () => {
  const { t } = useTranslation();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [search, setSearch] = useState('');
  const [isLowStockOnly, setIsLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal State for Stock Movement Entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementType, setMovementType] = useState<'Entry' | 'Exit' | 'Adjustment'>('Entry');
  const [quantity, setQuantity] = useState<number>(10);
  const [reason, setReason] = useState('Recepción de mercancía de proveedor');
  const [referenceDoc, setReferenceDoc] = useState('FAC-2026-001');

  useEffect(() => {
    loadData();
  }, [isLowStockOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const stockData = await inventoryService.getStockLevels(search, isLowStockOnly);
      const movementData = await inventoryService.getMovements();
      setStocks(stockData);
      setMovements(movementData);
      if (stockData.length > 0 && !selectedProductId) {
        setSelectedProductId(stockData[0].productId);
      }
    } catch {
      setStocks([
        {
          id: 'st-1',
          productId: 'p-1',
          productSku: 'LAM-INT-TEKA',
          productName: 'Lambrín Interior WPC Tono Teka',
          categoryName: 'Lambrín Interior WPC',
          quantityOnHand: 150,
          minimumAlertThreshold: 20,
          reorderQuantity: 100,
          unitOfMeasure: 'Pza',
          location: 'Nave A - Pasillo 3',
          isLowStock: false,
          isOutOfStock: false
        },
        {
          id: 'st-2',
          productId: 'p-2',
          productSku: 'LAM-EXT-ROBLE',
          productName: 'Lambrín Exterior Co-Extrusión Roble Oscuro',
          categoryName: 'Lambrín Exterior Co-Extrusión',
          quantityOnHand: 8,
          minimumAlertThreshold: 15,
          reorderQuantity: 50,
          unitOfMeasure: 'Pza',
          location: 'Nave B - Pasillo 1',
          isLowStock: true,
          isOutOfStock: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleRegisterMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryService.registerMovement({
        productId: selectedProductId,
        movementType,
        quantity,
        reason,
        referenceNumber: referenceDoc
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar el movimiento de inventario.');
    }
  };

  return (
    <div className="inventory-page-container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>🏭 Control de Inventarios WPC Bajío</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Gestión de existencias en almacén, alertas de reorden y captura de movimientos
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder={t('searchInventoryPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ minWidth: '220px' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isLowStockOnly}
                  onChange={(e) => setIsLowStockOnly(e.target.checked)}
                />
                ⚠️ {t('lowStockOnly')}
              </label>
            </form>

            <button className="action-btn" onClick={() => setIsModalOpen(true)}>
              ➕ Capturar Movimiento
            </button>
          </div>
        </div>

        {loading ? (
          <div>{t('loading')}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>SKU / {t('productCatalog')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('location')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('stockOnHand')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('minThreshold')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('stockStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{s.productName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {s.productSku} &bull; {s.categoryName}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{s.location}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, fontSize: '1rem' }}>
                      {s.quantityOnHand} {s.unitOfMeasure}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {s.minimumAlertThreshold} {s.unitOfMeasure}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {s.isOutOfStock ? (
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
                          🔴 {t('outOfStock')}
                        </span>
                      ) : s.isLowStock ? (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)' }}>
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
        )}
      </div>

      {/* Histórico de Movimientos */}
      {movements.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>📋 {t('recentMovementsLog')}</h3>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem' }}>{t('date')}</th>
                  <th style={{ padding: '0.5rem' }}>{t('productCatalog')}</th>
                  <th style={{ padding: '0.5rem' }}>{t('type')}</th>
                  <th style={{ padding: '0.5rem' }}>{t('quantity')}</th>
                  <th style={{ padding: '0.5rem' }}>{t('reason')}</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                      {new Date(m.createdAtUtc).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem' }}>{m.productName || m.productSku}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span className={`badge ${m.movementType === 'Entry' ? 'badge-success' : 'badge-warning'}`}>
                        {m.movementType}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{m.quantity}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Captura Movimiento de Inventario */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '480px' }}>
            <h3>➕ Capturar Movimiento de Stock</h3>
            <form onSubmit={handleRegisterMovement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Seleccionar Producto *</label>
                <select
                  className="input-field"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                >
                  {stocks.map(s => (
                    <option key={s.productId} value={s.productId}>{s.productName} ({s.productSku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Tipo de Movimiento *</label>
                <select
                  className="input-field"
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as any)}
                >
                  <option value="Entry">📥 Entrada (Recepción / Compra)</option>
                  <option value="Exit">📤 Salida (Merma / Ajuste Menor)</option>
                  <option value="Adjustment">⚖️ Ajuste Físico de Inventario</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Cantidad (Piezas) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="input-field"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Motivo / Observación *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Documento de Referencia (Factura/Remisión)</label>
                <input
                  type="text"
                  className="input-field"
                  value={referenceDoc}
                  onChange={(e) => setReferenceDoc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="submit" className="action-btn" style={{ flex: 1 }}>💾 Registrar Movimiento</button>
                <button type="button" className="lang-btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryListPage;
