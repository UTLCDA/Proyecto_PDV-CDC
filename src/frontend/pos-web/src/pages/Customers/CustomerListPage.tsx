import React, { useState, useEffect } from 'react';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { Cliente, PeticionCrearCliente, PeticionActualizarCliente } from '../../types/tiposCatalogo';

export const CustomerListPage: React.FC = () => {
  const [customers, setCustomers] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  const [formData, setFormData] = useState<PeticionCrearCliente & { isActive: boolean }>({
    firstName: '',
    lastName: '',
    companyName: '',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    city: 'León',
    state: 'Guanajuato',
    postalCode: '37000',
    customerType: 'Particular',
    specialDiscountPercentage: 0,
    notes: '',
    isActive: true
  });

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const loadCustomers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await servicioCatalogo.getCustomers(search || undefined);
      setCustomers(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar directorio de clientes.');
    } finally {
      setLoading(false);
    }
  };

  const openNewCustomerModal = () => {
    setEditingCustomerId(null);
    setFormData({
      firstName: '',
      lastName: '',
      companyName: '',
      taxId: '',
      email: '',
      phone: '',
      address: '',
      city: 'León',
      state: 'Guanajuato',
      postalCode: '37000',
      customerType: 'Particular',
      specialDiscountPercentage: 0,
      notes: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditCustomerModal = (c: Cliente) => {
    setEditingCustomerId(c.id);
    setFormData({
      firstName: c.firstName,
      lastName: c.lastName,
      companyName: c.companyName || '',
      taxId: c.taxId || '',
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      state: c.state,
      postalCode: c.postalCode,
      customerType: c.customerType,
      specialDiscountPercentage: c.specialDiscountPercentage,
      notes: c.notes,
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomerId) {
        const updatePayload: PeticionActualizarCliente = { ...formData };
        await servicioCatalogo.updateCustomer(editingCustomerId, updatePayload);
      } else {
        const createPayload: PeticionCrearCliente = { ...formData };
        await servicioCatalogo.createCustomer(createPayload);
      }
      setIsModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Error al guardar el cliente.');
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>👥 Directorio de Clientes WPC Bajío</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gestión completa de Alta, Edición de datos fiscales (RFC) y Descuentos Especiales</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Buscar por Nombre, RFC o Empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '280px' }}
          />
          <button className="action-btn" onClick={openNewCustomerModal}>
            ➕ Nuevo Cliente
          </button>
        </div>
      </div>

      {errorMsg && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{errorMsg}</div>}

      {loading ? (
        <div>Cargando clientes...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(15,23,42,0.8)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Cliente / Empresa</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>RFC / Tax ID</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Contacto</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Tipo Cliente</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Desc. Especial</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                    <div style={{ fontWeight: 600 }}>{c.displayName}</div>
                    {c.companyName && <small style={{ color: 'var(--text-muted)' }}>{c.companyName}</small>}
                  </td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{c.taxId || 'N/A'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <div>{c.email}</div>
                    <small style={{ color: 'var(--text-muted)' }}>{c.phone}</small>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span className={`badge ${c.customerType === 'Mayorista' || c.customerType === 'Wholesale' ? 'badge-success' : ''}`}>
                      {c.customerType}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: 'var(--accent-gold, #fbbf24)' }}>
                    {c.specialDiscountPercentage > 0 ? `${c.specialDiscountPercentage}%` : '0%'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <button className="lang-btn" onClick={() => openEditCustomerModal(c)} style={{ fontSize: '0.75rem' }}>
                      ✏️ Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal CRUD Cliente */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>{editingCustomerId ? '✏️ Editar Cliente' : '➕ Alta de Nuevo Cliente WPC Bajío'}</h3>
            <form onSubmit={handleSaveCustomer} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem', fontSize: '0.85rem' }}>
              <div>
                <label>Nombre(s) *:</label>
                <input type="text" className="input-field" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
              </div>
              <div>
                <label>Apellido(s) *:</label>
                <input type="text" className="input-field" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} required />
              </div>
              <div>
                <label>Nombre de Empresa / Razón Social:</label>
                <input type="text" className="input-field" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
              </div>
              <div>
                <label>RFC / Tax ID:</label>
                <input type="text" className="input-field" value={formData.taxId} onChange={e => setFormData({ ...formData, taxId: e.target.value })} placeholder="XAXX010101000" />
              </div>
              <div>
                <label>Correo Electrónico *:</label>
                <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div>
                <label>Teléfono *:</label>
                <input type="text" className="input-field" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label>Dirección Completa:</label>
                <input type="text" className="input-field" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
              </div>
              <div>
                <label>Ciudad:</label>
                <input type="text" className="input-field" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div>
                <label>Estado:</label>
                <input type="text" className="input-field" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
              </div>
              <div>
                <label>Tipo de Cliente *:</label>
                <select className="input-field" value={formData.customerType} onChange={e => setFormData({ ...formData, customerType: e.target.value })}>
                  <option value="Particular">Particular (Público General)</option>
                  <option value="Mayorista">Mayorista (Descuento de Mayoreo)</option>
                  <option value="Arquitecto/Constructor">Arquitecto / Contratista</option>
                </select>
              </div>
              <div>
                <label>Descuento Especial (%):</label>
                <input type="number" step="0.5" className="input-field" value={formData.specialDiscountPercentage} onChange={e => setFormData({ ...formData, specialDiscountPercentage: parseFloat(e.target.value) || 0 })} />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="action-btn" style={{ flex: 1 }}>💾 Guardar Cliente</button>
                <button type="button" className="lang-btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerListPage;
