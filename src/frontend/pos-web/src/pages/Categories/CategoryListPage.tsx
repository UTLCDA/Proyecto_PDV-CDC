import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { Categoria, PeticionActualizarCategoria, PeticionCrearCategoria } from '../../types/tiposCatalogo';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import './CategoryListPage.css';

interface CategoryForm {
  name: string;
  description: string;
  parentCategoryId: string;
  isActive: boolean;
}

const emptyForm = (): CategoryForm => ({
  name: '',
  description: '',
  parentCategoryId: '',
  isActive: true
});

export const CategoryListPage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [appliedFilters, setAppliedFilters] = useState<{ search: string; status: 'all' | 'active' | 'inactive' }>({ search: '', status: 'all' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const canCreate = hasPermission('catalogo', 'categorias_crear') || hasPermission('usuarios', 'administrar') || hasPermission('catalogo', 'productos_crear');
  const canEdit = hasPermission('catalogo', 'categorias_crear') || hasPermission('usuarios', 'administrar') || hasPermission('catalogo', 'productos_editar');

  const exportConfig = useMemo<ExportReportConfig<Categoria>>(() => ({
    moduleName: 'Categorías',
    title: 'Catálogo de Categorías WPC Bajío',
    fileName: 'Categorias_WPCBajio',
    sheetName: 'Categorias',
    orientation: 'portrait',
    filters: [
      { label: 'Búsqueda', value: appliedFilters.search || 'Todas' },
      { label: 'Estado', value: appliedFilters.status === 'all' ? 'Todos' : appliedFilters.status === 'active' ? 'Activas' : 'Inactivas' }
    ],
    columns: [
      { key: 'name', label: 'Categoría / 分类', width: 1.5, value: cat => cat.name },
      { key: 'slug', label: 'Slug / 标识符', width: 1.2, value: cat => cat.slug },
      { key: 'description', label: 'Descripción / 描述', width: 2, value: cat => cat.description || '—' },
      { key: 'status', label: 'Estado / 状态', width: 0.8, value: cat => cat.isActive === false ? 'Inactiva' : 'Activa' }
    ]
  }), [appliedFilters]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await servicioCatalogo.getCategories();
      setCategories(data);
      setAppliedFilters({ search, status: statusFilter });
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message || 'Error al cargar las categorías.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setIsModalOpen(false);
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isModalOpen]);

  const filteredCategories = useMemo(() => {
    let result = [...categories];
    if (statusFilter === 'active') {
      result = result.filter(c => c.isActive !== false);
    } else if (statusFilter === 'inactive') {
      result = result.filter(c => c.isActive === false);
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.slug.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term))
      );
    }
    return result;
  }, [categories, statusFilter, search]);

  const openCreate = () => {
    setEditingCategory(null);
    setForm(emptyForm());
    setNotice(null);
    setIsModalOpen(true);
  };

  const openEdit = (category: Categoria) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description || '',
      parentCategoryId: category.parentCategoryId || '',
      isActive: category.isActive !== false
    });
    setNotice(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (category: Categoria) => {
    const actionName = category.isActive === false ? 'activar' : 'desactivar';
    if (!window.confirm(`¿Está seguro de que desea ${actionName} la categoría "${category.name}"?`)) {
      return;
    }
    try {
      setSaving(true);
      await servicioCatalogo.deleteCategory(category.id);
      setNotice({ type: 'success', text: `Categoría "${category.name}" actualizada con éxito.` });
      await loadCategories();
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message || 'Error al cambiar estado de la categoría.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setNotice({ type: 'error', text: 'El nombre de la categoría es obligatorio.' });
      return;
    }

    try {
      setSaving(true);
      setNotice(null);

      if (editingCategory) {
        const updatePayload: PeticionActualizarCategoria = {
          name: form.name.trim(),
          description: form.description.trim(),
          parentCategoryId: form.parentCategoryId ? form.parentCategoryId : null,
          isActive: form.isActive
        };
        await servicioCatalogo.updateCategory(editingCategory.id, updatePayload);
        setNotice({ type: 'success', text: `Categoría "${form.name.trim()}" actualizada exitosamente.` });
      } else {
        const createPayload: PeticionCrearCategoria = {
          name: form.name.trim(),
          description: form.description.trim(),
          parentCategoryId: form.parentCategoryId ? form.parentCategoryId : null
        };
        await servicioCatalogo.createCategory(createPayload);
        setNotice({ type: 'success', text: `Categoría "${form.name.trim()}" creada exitosamente.` });
      }

      setIsModalOpen(false);
      await loadCategories();
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message || 'Error al guardar la categoría.' });
    } finally {
      setSaving(false);
    }
  };

  // Find parent name for display
  const getParentName = (parentId?: string) => {
    if (!parentId) return '—';
    const parent = categories.find(c => c.id === parentId);
    return parent ? parent.name : '—';
  };

  return (
    <div className="categories-page">
      <div className="card categories-header">
        <div>
          <h1>📁 Catálogo de Categorías WPC Bajío</h1>
          <p>Módulo para el ABC (Alta, Bajas/desactivar y Cambios) y clasificación de productos</p>
        </div>

        <div className="categories-actions">
          <input
            type="search"
            className="form-control"
            placeholder="🔍 Buscar categoría por nombre, slug o descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            className="form-control"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value="all">Todas las categorías</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>

          {canCreate && (
            <button type="button" className="action-btn" onClick={openCreate}>
              ➕ Nueva Categoría
            </button>
          )}

          <div className="export-control">
            <ExportButtons data={filteredCategories} config={exportConfig} />
          </div>
        </div>
      </div>

      {notice && (
        <div className={`categories-notice categories-notice--${notice.type}`} role="alert">
          {notice.text}
        </div>
      )}

      <div className="card categories-card">
        {loading ? (
          <div className="categories-empty">Cargando categorías...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="categories-empty">No se encontraron categorías con los filtros seleccionados.</div>
        ) : (
          <div className="categories-table-wrap">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Slug / Clave</th>
                  <th>Descripción</th>
                  <th>Categoría Padre</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map(cat => {
                  const isActive = cat.isActive !== false;
                  return (
                    <tr key={cat.id}>
                      <td>
                        <strong>{cat.name}</strong>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{cat.slug}</span>
                      </td>
                      <td>
                        <span>{cat.description || '—'}</span>
                      </td>
                      <td>
                        <small>{getParentName(cat.parentCategoryId)}</small>
                      </td>
                      <td>
                        <span className={`category-badge ${isActive ? 'category-badge--active' : 'category-badge--inactive'}`}>
                          {isActive ? '🟢 Activa' : '🔴 Inactiva'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="category-actions-cell" style={{ justifyContent: 'flex-end' }}>
                          {canEdit && (
                            <button
                              type="button"
                              className="lang-btn"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                              onClick={() => openEdit(cat)}
                              title="Editar categoría"
                            >
                              ✏️ Editar
                            </button>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              className="lang-btn"
                              style={{
                                fontSize: '0.78rem',
                                padding: '0.35rem 0.65rem',
                                color: isActive ? 'var(--danger)' : 'var(--success)'
                              }}
                              onClick={() => handleToggleStatus(cat)}
                              title={isActive ? 'Desactivar categoría' : 'Activar categoría'}
                            >
                              {isActive ? '🗑️ Desactivar' : '🔄 Activar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Alta y Edición de Categoría */}
      {isModalOpen && (
        <div className="categories-modal-backdrop" onClick={() => !saving && setIsModalOpen(false)}>
          <div className="categories-modal" onClick={e => e.stopPropagation()}>
            <header>
              <div>
                <h2>{editingCategory ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}</h2>
                <p>{editingCategory ? 'Modifique los datos de la categoría' : 'Ingrese los datos para registrar una nueva categoría'}</p>
              </div>
              <button type="button" onClick={() => !saving && setIsModalOpen(false)} aria-label="Cerrar">✕</button>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="categories-form-grid">
                <label className="categories-field">
                  Nombre de la Categoría *
                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder="Ej. Lambrín WPC Interior, Lambrín Exterior..."
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    disabled={saving}
                  />
                </label>

                <label className="categories-field">
                  Descripción
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder="Detalles sobre los productos de esta categoría..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    disabled={saving}
                  />
                </label>

                <label className="categories-field">
                  Categoría Padre (Opcional)
                  <select
                    value={form.parentCategoryId}
                    onChange={e => setForm({ ...form, parentCategoryId: e.target.value })}
                    disabled={saving}
                  >
                    <option value="">Ninguna (Categoría Principal)</option>
                    {categories
                      .filter(c => !editingCategory || c.id !== editingCategory.id)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </label>

                {editingCategory && (
                  <label className="categories-checkbox">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm({ ...form, isActive: e.target.checked })}
                      disabled={saving}
                    />
                    Categoría Activa (Visible en catálogo y punto de venta)
                  </label>
                )}
              </div>

              <footer>
                <button
                  type="button"
                  className="lang-btn"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="action-btn"
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryListPage;
