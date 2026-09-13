import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../services/apiClient';
import './WebOrdersPage.css';

export interface WebOrderItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string;
}

export interface WebOrder {
  id: string;
  folio: string;
  idVenta: number;
  status: 'paid' | 'preparing' | 'shipped' | 'delivered';
  statusLabel: string;
  trackingCarrier: string;
  trackingNumber: string;
  deliveryMethod: 'delivery' | 'pickup';
  customer: {
    id?: string;
    displayName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  subtotal: number;
  shippingCost: number;
  discountAmount?: number;
  total: number;
  itemsCount: number;
  items: WebOrderItem[];
  notes: string;
  createdAtUtc: string;
}

const CARRIERS = [
  'Estafeta',
  'FedEx',
  'DHL Express',
  'Redpack',
  'Paquetexpress',
  'Tres Guerras',
  'Castores',
  'Flete Propio WPC Bajío',
  'Entrega Local León'
];

export const WebOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<WebOrder | null>(null);

  // Formulario de edición de guía
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderStatus, setOrderStatus] = useState<string>('En camino');
  const [savingTracking, setSavingTracking] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  const money = useMemo(() => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }), []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<WebOrder[]>('/payments/stripe/web-orders');
      if (Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Error al cargar pedidos web:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const openTrackingModal = (order: WebOrder) => {
    setSelectedOrder(order);
    setCarrier(order.trackingCarrier || '');
    setTrackingNumber(order.trackingNumber || '');
    setOrderStatus(
      order.status === 'delivered' ? 'Entregado' :
      order.status === 'shipped' ? 'En camino' :
      order.status === 'preparing' ? 'Preparando' : 'En camino'
    );
    setSaveSuccessMessage('');
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSavingTracking(true);
    try {
      await apiClient.put(`/payments/stripe/web-orders/${selectedOrder.id}/tracking`, {
        trackingCarrier: carrier,
        trackingNumber: trackingNumber,
        status: orderStatus
      });

      setSaveSuccessMessage('¡Información de guía y estado actualizada con éxito!');

      // Actualizar pedido en estado local
      setOrders(prev => prev.map(o => {
        if (o.id === selectedOrder.id) {
          const newStatus = orderStatus === 'Entregado' ? 'delivered' :
                            orderStatus === 'Preparando' ? 'preparing' : 'shipped';
          const newStatusLabel = orderStatus === 'Entregado' ? 'Entregado' :
                                 orderStatus === 'Preparando' ? 'Preparando en almacén' : 'En camino';
          return {
            ...o,
            trackingCarrier: carrier,
            trackingNumber: trackingNumber,
            status: newStatus,
            statusLabel: newStatusLabel
          };
        }
        return o;
      }));

      setTimeout(() => {
        setSelectedOrder(null);
      }, 1500);
    } catch (err) {
      console.error('Error al guardar guía:', err);
      alert('Ocurrió un error al actualizar la guía de rastreo.');
    } finally {
      setSavingTracking(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term ||
        order.folio.toLowerCase().includes(term) ||
        order.customer.displayName.toLowerCase().includes(term) ||
        order.customer.email.toLowerCase().includes(term) ||
        order.trackingNumber.toLowerCase().includes(term);

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const metrics = useMemo(() => {
    const total = orders.length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const shipped = orders.filter(o => o.status === 'shipped').length;
    const pending = orders.filter(o => o.status === 'paid' || o.status === 'preparing').length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    return { total, delivered, shipped, pending, totalRevenue };
  }, [orders]);

  return (
    <div className="web-orders-page">
      <header className="web-orders-header">
        <div className="web-orders-header__top">
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📦 Pedidos Tienda en Línea (CDC / Stripe)
            </h2>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)' }}>
              Supervisión de compras web, asignación manual de guías de paquetería y control de despachos.
            </p>
          </div>
          <button className="action-btn" onClick={fetchOrders} disabled={loading}>
            🔄 {loading ? 'Actualizando...' : 'Recargar Pedidos'}
          </button>
        </div>

        {/* Métricas */}
        <div className="sales-history-metrics" style={{ marginTop: '1rem' }}>
          <article className="card">
            <span>Total Pedidos Web</span>
            <strong>{metrics.total} órdenes</strong>
            <small style={{ color: 'var(--text-secondary)' }}>{money.format(metrics.totalRevenue)} facturado</small>
          </article>
          <article className="card">
            <span>Por Empacar / Despachar</span>
            <strong style={{ color: '#d97706' }}>{metrics.pending} pendientes</strong>
            <small>En almacén central</small>
          </article>
          <article className="card">
            <span>En Camino / Con Guía</span>
            <strong style={{ color: '#2563eb' }}>{metrics.shipped} en ruta</strong>
            <small>Con paquetería</small>
          </article>
          <article className="card">
            <span>Entregados con Éxito</span>
            <strong style={{ color: '#16a34a' }}>{metrics.delivered} entregados</strong>
            <small>Clientes satisfechos</small>
          </article>
        </div>

        {/* Barra de Filtros */}
        <div className="web-orders-filters card" style={{ marginTop: '1rem', padding: '0.75rem 1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="form-control"
            style={{ flex: '1 1 240px' }}
            placeholder="🔍 Buscar por Folio (WPC-...), Cliente, Correo o Guía..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <select
            className="form-control"
            style={{ flex: '0 1 200px' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los estatus</option>
            <option value="paid">Por despachar (Pagado)</option>
            <option value="preparing">Preparando en almacén</option>
            <option value="shipped">En camino (Con guía)</option>
            <option value="delivered">Entregados</option>
          </select>

          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Mostrando <strong>{filteredOrders.length}</strong> de {orders.length} pedidos
          </span>
        </div>
      </header>

      {/* Tabla de Pedidos Web */}
      <main className="card" style={{ marginTop: '1rem', padding: 0, overflow: 'hidden' }}>
        <div className="sales-history-table-wrap">
          <table className="sales-history-table">
            <thead>
              <tr>
                <th>Folio / Fecha</th>
                <th>Cliente</th>
                <th>Modalidad / Destino</th>
                <th>Partidas</th>
                <th>Flete</th>
                <th>Total</th>
                <th>Paquetería & Guía</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    Cargando pedidos de la tienda en línea...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    No se encontraron pedidos web con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <strong style={{ color: 'var(--primary-main)', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                        {order.folio}
                      </strong>
                      <small style={{ display: 'block', color: 'var(--text-secondary)' }}>
                        {new Date(order.createdAtUtc).toLocaleString('es-MX')}
                      </small>
                    </td>
                    <td>
                      <strong>{order.customer.displayName}</strong>
                      <small style={{ display: 'block', color: 'var(--text-secondary)' }}>{order.customer.email}</small>
                      <small style={{ display: 'block', color: 'var(--text-secondary)' }}>📞 {order.customer.phone || 'Sin tel.'}</small>
                    </td>
                    <td>
                      <span className="badge" style={{
                        backgroundColor: order.deliveryMethod === 'pickup' ? '#0d9488' : '#6366f1',
                        color: '#fff',
                        marginBottom: '0.25rem',
                        display: 'inline-block'
                      }}>
                        {order.deliveryMethod === 'pickup' ? '🏪 Recolección en Tienda' : '🚚 Envío a Domicilio'}
                      </span>
                      {order.deliveryMethod === 'delivery' && (
                        <small style={{ display: 'block', maxWidth: '240px', lineHeight: '1.2' }}>
                          {order.customer.address}
                        </small>
                      )}
                    </td>
                    <td>
                      <strong>{order.itemsCount} producto(s)</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {order.items.slice(0, 2).map((it, i) => (
                          <div key={i}>{it.quantity}× {it.name}</div>
                        ))}
                        {order.items.length > 2 && <div>+{order.items.length - 2} más...</div>}
                      </div>
                    </td>
                    <td>
                      {order.shippingCost > 0 ? (
                        <strong>{money.format(order.shippingCost)}</strong>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>$0.00 (Gratis)</span>
                      )}
                    </td>
                    <td>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                        {money.format(order.total)}
                      </strong>
                    </td>
                    <td>
                      {order.trackingNumber ? (
                        <div>
                          <strong style={{ display: 'block', color: '#2563eb' }}>{order.trackingCarrier}</strong>
                          <code style={{ fontSize: '0.8rem', background: 'var(--background-container)', padding: '2px 4px', borderRadius: '4px' }}>
                            {order.trackingNumber}
                          </code>
                        </div>
                      ) : (
                        <span style={{ color: '#d97706', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          ⚠️ Sin guía asignada
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{
                        backgroundColor:
                          order.status === 'delivered' ? '#16a34a' :
                          order.status === 'shipped' ? '#2563eb' :
                          order.status === 'preparing' ? '#d97706' : '#6b7280',
                        color: '#fff',
                        fontWeight: 600
                      }}>
                        {order.statusLabel}
                      </span>
                    </td>
                    <td>
                      <button
                        className="pos-link-btn"
                        style={{ fontWeight: 600, color: 'var(--primary-main)' }}
                        onClick={() => openTrackingModal(order)}
                      >
                        ✏️ Guía / Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal de Detalle y Asignación de Guía */}
      {selectedOrder && (
        <div className="pos-receipt-backdrop" onMouseDown={e => e.target === e.currentTarget && setSelectedOrder(null)}>
          <div className="card" style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', overflowY: 'auto', margin: 'auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--primary-main)' }}>
                  📦 Pedido Web {selectedOrder.folio}
                </h3>
                <small style={{ color: 'var(--text-secondary)' }}>
                  Registrado el {new Date(selectedOrder.createdAtUtc).toLocaleString('es-MX')}
                </small>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </header>

            {/* Mensaje de éxito si se acaba de guardar */}
            {saveSuccessMessage && (
              <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontWeight: 600 }}>
                ✅ {saveSuccessMessage}
              </div>
            )}

            {/* Datos del Cliente y Entrega */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--background-container)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontWeight: 700, display: 'block', color: 'var(--text-secondary)' }}>DATOS DEL CLIENTE</span>
                <p style={{ margin: '0.25rem 0' }}><strong>{selectedOrder.customer.displayName}</strong></p>
                <p style={{ margin: '0.25rem 0' }}>📧 {selectedOrder.customer.email}</p>
                <p style={{ margin: '0.25rem 0' }}>📞 {selectedOrder.customer.phone || 'No proporcionado'}</p>
              </div>
              <div>
                <span style={{ fontWeight: 700, display: 'block', color: 'var(--text-secondary)' }}>DESTINO DE ENVÍO</span>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>{selectedOrder.deliveryMethod === 'pickup' ? 'Recolección en Tienda León' : 'Envío a Domicilio'}</strong>
                </p>
                <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>
                  {selectedOrder.customer.address}
                </p>
              </div>
            </div>

            {/* Desglose de Productos */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Partidas del Pedido ({selectedOrder.items.length})</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--background-container)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Producto</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Cant.</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Precio Unit.</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px' }}>
                        <strong>{it.name}</strong> <small style={{ color: 'var(--text-secondary)' }}>({it.sku})</small>
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        {it.quantity} {it.unit === 'box' ? 'caja(s)' : 'pza(s)'}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>{money.format(it.unitPrice)}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}><strong>{money.format(it.lineTotal)}</strong></td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--border-subtle)' }}>
                    <td colSpan={3} style={{ padding: '6px', textAlign: 'right' }}>Subtotal:</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{money.format(selectedOrder.subtotal)}</td>
                  </tr>
                  {selectedOrder.discountAmount !== undefined && selectedOrder.discountAmount > 0 && (
                    <tr style={{ color: '#16a34a' }}>
                      <td colSpan={3} style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>Descuento aplicado:</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>-{money.format(selectedOrder.discountAmount)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} style={{ padding: '6px', textAlign: 'right' }}>Costo de Envío:</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>
                      {selectedOrder.shippingCost > 0 ? money.format(selectedOrder.shippingCost) : '$0.00 (Gratis)'}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                    <td colSpan={3} style={{ padding: '6px', textAlign: 'right', color: 'var(--primary-main)' }}>Total Pagado:</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: 'var(--primary-main)' }}>{money.format(selectedOrder.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Formulario de Asignación de Guía */}
            <form onSubmit={handleSaveTracking} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary-main)' }}>
                🚚 Gestión y Asignación de Guía de Rastreo
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Empresa de Paquetería / Transporte
                  </label>
                  <input
                    list="carriers-list"
                    className="form-control"
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    placeholder="Ej. Estafeta, FedEx, Redpack..."
                    required
                  />
                  <datalist id="carriers-list">
                    {CARRIERS.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Número de Guía / Código de Rastreo
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder="Ej. EST-9823471023MX"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Estatus de Despacho
                </label>
                <select
                  className="form-control"
                  value={orderStatus}
                  onChange={e => setOrderStatus(e.target.value)}
                >
                  <option value="Preparando">📦 Preparando en almacén</option>
                  <option value="En camino">🚚 En camino / Entregado a paquetería</option>
                  <option value="Entregado">✅ Entregado al cliente</option>
                </select>
                <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  Al guardar, el cliente podrá consultar en tiempo real este número de guía desde la página /cuenta de la tienda en línea.
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="pos-receipt-close"
                  onClick={() => setSelectedOrder(null)}
                  disabled={savingTracking}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="action-btn"
                  disabled={savingTracking}
                  style={{ background: 'var(--primary-main)', color: '#fff' }}
                >
                  {savingTracking ? 'Guardando...' : '💾 Guardar Guía y Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebOrdersPage;
