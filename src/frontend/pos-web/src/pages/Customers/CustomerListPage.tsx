import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { Cliente, PeticionActualizarCliente, PeticionCrearCliente } from '../../types/tiposCatalogo';
import './CustomerListPage.css';

type CustomerForm = Omit<PeticionCrearCliente, 'specialDiscountPercentage'> & {
  specialDiscountPercentage: string;
  isActive: boolean;
};

const emptyForm = (): CustomerForm => ({
  firstName: '',
  lastName: '',
  companyName: '',
  taxId: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  customerType: 'Particular',
  specialDiscountPercentage: '',
  notes: '',
  isActive: true
});

export const CustomerListPage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const canCreate = hasPermission('clientes', 'crear');
  const canEdit = hasPermission('clientes', 'editar');
  const canAdminister = hasPermission('usuarios', 'administrar');

  const loadCustomers = async (term = search) => {
    try {
      setLoading(true);
      const result = await servicioCatalogo.getCustomers(term.trim() || undefined, undefined, canAdminister);
      setCustomers(result.filter(customer => statusFilter === 'all' || customer.isActive === (statusFilter === 'active')));
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('customerLoadError')) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCustomers(search), 250);
    return () => window.clearTimeout(timer);
  }, [search, statusFilter, canAdminister]);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setIsModalOpen(false);
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isModalOpen]);

  const openCreate = () => {
    setEditingCustomerId(null);
    setForm(emptyForm());
    setNotice(null);
    setIsModalOpen(true);
  };

  const openEdit = (customer: Cliente) => {
    setEditingCustomerId(customer.id);
    setForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      companyName: customer.companyName ?? '',
      taxId: customer.taxId ?? '',
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      postalCode: customer.postalCode,
      customerType: customer.customerType,
      specialDiscountPercentage: customer.specialDiscountPercentage ? String(customer.specialDiscountPercentage) : '',
      notes: customer.notes,
      isActive: customer.isActive
    });
    setNotice(null);
    setIsModalOpen(true);
  };

  const updateForm = (field: keyof CustomerForm, value: string | boolean) =>
    setForm(current => ({ ...current, [field]: value }));

  const saveCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    const discount = Number(form.specialDiscountPercentage || 0);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      setNotice({ type: 'error', text: t('invalidCustomerDiscount') });
      return;
    }
    const payload: PeticionCrearCliente = {
      firstName: form.firstName,
      lastName: form.lastName,
      companyName: form.companyName || undefined,
      taxId: form.taxId || undefined,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      customerType: form.customerType,
      specialDiscountPercentage: discount,
      notes: form.notes
    };
    try {
      setSaving(true);
      if (editingCustomerId) {
        await servicioCatalogo.updateCustomer(editingCustomerId, { ...payload, isActive: form.isActive } as PeticionActualizarCliente);
      } else {
        await servicioCatalogo.createCustomer(payload);
      }
      setIsModalOpen(false);
      setNotice({ type: 'success', text: t('customerSaved') });
      await loadCustomers();
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, t('customerSaveError')) });
    } finally {
      setSaving(false);
    }
  };

  return <section className="customers-page">
    <header className="customers-header">
      <div><h1>👥 {t('customersPageTitle')}</h1><p>{t('customersPageSubtitle')}</p></div>
      <div className="customers-actions">
        <input className="form-control" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('searchCustomerAdmin')} />
        {canAdminister && <select className="form-control" value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} aria-label={t('customerStatus')}>
          <option value="all">{t('allStatuses')}</option>
          <option value="active">{t('activeStatus')}</option>
          <option value="inactive">{t('inactiveStatus')}</option>
        </select>}
        {canCreate && <button className="action-btn" onClick={openCreate}>➕ {t('newCustomer')}</button>}
      </div>
    </header>

    {notice && <div className={`customers-notice customers-notice--${notice.type}`} role="alert">{notice.text}</div>}

    <article className="customers-card">
      {loading ? <div className="customers-empty">{t('loading')}</div> : customers.length === 0 ? <div className="customers-empty">{t('noCustomers')}</div> :
        <div className="customers-table-wrap"><table className="customers-table"><thead><tr>
          <th>{t('customerCompany')}</th><th>{t('taxIdLabel')}</th><th>{t('customerContact')}</th><th>{t('customerLocation')}</th><th>{t('customerType')}</th><th>{t('customerDiscount')}</th><th>{t('customerStatus')}</th>{canEdit && <th>{t('actions')}</th>}
        </tr></thead><tbody>{customers.map(customer => <tr key={customer.id}>
          <td><strong>{customer.displayName}</strong>{customer.companyName && <small>{customer.companyName}</small>}</td>
          <td><code>{customer.taxId || '—'}</code></td>
          <td><span>{customer.email}</span><small>{customer.phone}</small></td>
          <td><span>{[customer.city, customer.state].filter(Boolean).join(', ') || '—'}</span><small>{customer.postalCode}</small></td>
          <td><span className={`badge ${customer.customerType === 'Mayorista' ? 'badge-success' : ''}`}>{t(customerTypeKey(customer.customerType))}</span></td>
          <td>{customer.specialDiscountPercentage}%</td>
          <td><span className={`badge ${customer.isActive ? 'badge-success' : 'badge-danger'}`}>{t(customer.isActive ? 'activeStatus' : 'inactiveStatus')}</span></td>
          {canEdit && <td><button className="pos-link-btn" onClick={() => openEdit(customer)}>✏️ {t('editCustomer')}</button></td>}
        </tr>)}</tbody></table></div>}
    </article>

    {isModalOpen && <div className="customers-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setIsModalOpen(false)}>
      <div className="customers-modal" role="dialog" aria-modal="true" aria-labelledby="customer-form-title">
        <header><div><h2 id="customer-form-title">{t(editingCustomerId ? 'editCustomerTitle' : 'newCustomerTitle')}</h2><p>{t('customerFormHint')}</p></div><button aria-label={t('cancel')} onClick={() => setIsModalOpen(false)}>×</button></header>
        <form onSubmit={saveCustomer}>
          <div className="customers-form-grid">
            <Field label={`${t('firstName')} *`}><input required maxLength={100} value={form.firstName} onChange={event => updateForm('firstName', event.target.value)} /></Field>
            <Field label={`${t('lastName')} *`}><input required maxLength={100} value={form.lastName} onChange={event => updateForm('lastName', event.target.value)} /></Field>
            <Field label={t('companyName')}><input maxLength={200} value={form.companyName} onChange={event => updateForm('companyName', event.target.value)} /></Field>
            <Field label={t('taxIdLabel')}><input maxLength={13} value={form.taxId} onChange={event => updateForm('taxId', event.target.value.toUpperCase())} placeholder="XAXX010101000" /></Field>
            <Field label={`${t('email')} *`}><input required type="email" maxLength={256} value={form.email} onChange={event => updateForm('email', event.target.value)} /></Field>
            <Field label={`${t('phone')} *`}><input required type="tel" maxLength={25} value={form.phone} onChange={event => updateForm('phone', event.target.value)} /></Field>
            <Field label={t('address')} wide><input maxLength={300} value={form.address} onChange={event => updateForm('address', event.target.value)} /></Field>
            <Field label={t('city')}><input maxLength={100} value={form.city} onChange={event => updateForm('city', event.target.value)} /></Field>
            <Field label={t('state')}><input maxLength={100} value={form.state} onChange={event => updateForm('state', event.target.value)} /></Field>
            <Field label={t('postalCode')}><input inputMode="numeric" maxLength={5} value={form.postalCode} onChange={event => updateForm('postalCode', event.target.value.replace(/\D/g, ''))} /></Field>
            <Field label={`${t('customerType')} *`}><select value={form.customerType} onChange={event => updateForm('customerType', event.target.value)}><option value="Particular">{t('customerTypeRetail')}</option><option value="Mayorista">{t('customerTypeWholesale')}</option><option value="Arquitecto/Constructor">{t('customerTypeProfessional')}</option></select></Field>
            <Field label={t('specialDiscountPercent')}><input type="number" min="0" max="100" step="0.01" value={form.specialDiscountPercentage} onChange={event => updateForm('specialDiscountPercentage', event.target.value)} placeholder="0.00" /></Field>
            <Field label={t('customerNotes')} wide><textarea rows={3} maxLength={500} value={form.notes} onChange={event => updateForm('notes', event.target.value)} placeholder={t('customerNotesPlaceholder')} /></Field>
            {editingCustomerId && canAdminister && <label className="customers-checkbox customers-field--wide"><input type="checkbox" checked={form.isActive} onChange={event => updateForm('isActive', event.target.checked)} /> {t('activeCustomer')}</label>}
          </div>
          <footer><button type="button" className="lang-btn" onClick={() => setIsModalOpen(false)}>{t('cancel')}</button><button className="action-btn" disabled={saving}>{saving ? t('saving') : t('saveCustomer')}</button></footer>
        </form>
      </div>
    </div>}
  </section>;
};

const Field: React.FC<{ label: string; wide?: boolean; children: React.ReactNode }> = ({ label, wide, children }) => <label className={`customers-field ${wide ? 'customers-field--wide' : ''}`}><span>{label}</span>{children}</label>;
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const customerTypeKey = (type: string) => ({ Particular: 'customerTypeRetail', Mayorista: 'customerTypeWholesale', 'Arquitecto/Constructor': 'customerTypeProfessional' } as Record<string, string>)[type] ?? type;

export default CustomerListPage;
