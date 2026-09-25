import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveProductImageUrl } from '../../services/apiClient';
import { isImageFile, isHeicFile } from '../../utils/imageProcessor';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { Categoria, PeticionActualizarCategoria, PeticionCrearCategoria } from '../../types/tiposCatalogo';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableTh } from '../../components/common/SortableTh';
import { usePagination } from '../../hooks/usePagination';
import TablePagination from '../../components/common/TablePagination';
import { loadAllPagesForExport } from '../../utils/pagedExport';
import './CategoryListPage.css';

interface CategoryForm {
  name: string;
  description: string;
  parentCategoryId: string;
  isActive: boolean;
  imageUrl?: string;
}

const emptyForm = (): CategoryForm => ({
  name: '',
  description: '',
  parentCategoryId: '',
  isActive: true,
  imageUrl: ''
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
  const pagination = usePagination({ initialPageSize: 25 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  // Estados para imagen de categoría
  const [imagenArchivo, setImagenArchivo] = useState<File | null>(null);
  const [imagenPreviewUrl, setImagenPreviewUrl] = useState<string>('');
  const [imagenFueEliminada, setImagenFueEliminada] = useState<boolean>(false);
  const [procesandoImagen, setProcesandoImagen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Find parent name for display
  const getParentName = (parentId?: string) => {
    if (!parentId) return '—';
    const parent = categories.find(c => c.id === parentId);
    return parent ? parent.name : '—';
  };

  const filteredCategories = useMemo(() => {
    let result = [...categories];
    if (appliedFilters.status === 'active') {
      result = result.filter(c => c.isActive !== false);
    } else if (appliedFilters.status === 'inactive') {
      result = result.filter(c => c.isActive === false);
    }
    return result;
  }, [categories, appliedFilters.status]);

  const { sortedData: sortedCategories, sortKey, sortDirection, handleSort } = useTableSort(filteredCategories, {
    valueExtractors: {
      name: cat => cat.name,
      slug: cat => cat.slug,
      description: cat => cat.description || '',
      parentCategory: cat => getParentName(cat.parentCategoryId),
      isActive: cat => cat.isActive !== false ? 1 : 0
    }
  });

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await servicioCatalogo.getCategories(
        appliedFilters.search.trim() || undefined,
        { page: pagination.pageNumber, pageSize: pagination.pageSize },
        sortKey,
        sortDirection
      );
      const items = Array.isArray(data) ? data : data.items;
      setCategories(items);
      if (!Array.isArray(data)) pagination.setPaginationFromResult(data);
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message || 'Error al cargar las categorías.' });
    } finally {
      setLoading(false);
    }
  }, [appliedFilters.search, pagination.pageNumber, pagination.pageSize, sortKey, sortDirection]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    pagination.resetPage();
    setAppliedFilters({ search, status: statusFilter });
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    pagination.resetPage();
    setAppliedFilters({ search: '', status: 'all' });
  };

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

  const openCreate = () => {
    setEditingCategory(null);
    setForm(emptyForm());
    if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagenPreviewUrl);
    }
    setImagenArchivo(null);
    setImagenPreviewUrl('');
    setImagenFueEliminada(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setNotice(null);
    setIsModalOpen(true);
  };

  const openEdit = (category: Categoria) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description || '',
      parentCategoryId: category.parentCategoryId || '',
      isActive: category.isActive !== false,
      imageUrl: category.imageUrl || ''
    });
    if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagenPreviewUrl);
    }
    setImagenArchivo(null);
    setImagenPreviewUrl(category.imageUrl || '');
    setImagenFueEliminada(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setNotice(null);
    setIsModalOpen(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      alert('El archivo seleccionado no es una imagen válida.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setProcesandoImagen(true);
      let fileToUse: File = file;
      if (isHeicFile(file)) {
        try {
          const heic2anyModule = await import('heic2any');
          const heic2any = heic2anyModule.default || heic2anyModule;
          const resultBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.88 });
          const finalBlob = Array.isArray(resultBlob) ? resultBlob[0] : resultBlob;
          fileToUse = new File([finalBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
        } catch (heicErr) {
          console.warn('Fallo conversión HEIC:', heicErr);
        }
      }

      if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagenPreviewUrl);
      }
      const preview = URL.createObjectURL(fileToUse);
      setImagenArchivo(fileToUse);
      setImagenPreviewUrl(preview);
      setImagenFueEliminada(false);
    } catch (err: any) {
      console.error('Error al procesar imagen:', err);
      alert(err.message || 'Error al procesar la imagen seleccionada.');
    } finally {
      setProcesandoImagen(false);
    }
  };

  const handleQuitarImagen = () => {
    if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagenPreviewUrl);
    }
    setImagenArchivo(null);
    setImagenPreviewUrl('');
    setForm(prev => ({ ...prev, imageUrl: '' }));
    setImagenFueEliminada(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

      let savedCatId: string | null = null;
      if (editingCategory) {
        const updatePayload: PeticionActualizarCategoria = {
          name: form.name.trim(),
          description: form.description.trim(),
          parentCategoryId: form.parentCategoryId ? form.parentCategoryId : null,
          isActive: form.isActive,
          imageUrl: imagenFueEliminada ? '' : form.imageUrl
        };
        const updated = await servicioCatalogo.updateCategory(editingCategory.id, updatePayload);
        savedCatId = updated?.id || editingCategory.id;
        setNotice({ type: 'success', text: `Categoría "${form.name.trim()}" actualizada exitosamente.` });
      } else {
        const createPayload: PeticionCrearCategoria = {
          name: form.name.trim(),
          description: form.description.trim(),
          parentCategoryId: form.parentCategoryId ? form.parentCategoryId : null
        };
        const created = await servicioCatalogo.createCategory(createPayload);
        savedCatId = created.id;
        setNotice({ type: 'success', text: `Categoría "${form.name.trim()}" creada exitosamente.` });
      }

      if (imagenArchivo && savedCatId) {
        await servicioCatalogo.uploadCategoryImage(savedCatId, imagenArchivo, imagenArchivo.name);
      } else if (imagenFueEliminada && editingCategory) {
        await servicioCatalogo.deleteCategoryImage(editingCategory.id);
      }

      if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagenPreviewUrl);
      }
      setImagenArchivo(null);
      setImagenPreviewUrl('');
      setImagenFueEliminada(false);

      setIsModalOpen(false);
      await loadCategories();
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message || 'Error al guardar la categoría.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="categories-page">
      <div className="card categories-header">
        <div>
          <h1>📁 {t('categoryCatalogTitle')}</h1>
          <p>{t('categoryCatalogSubtitle')}</p>
        </div>

        <form
          className="categories-actions"
          onSubmit={handleApplyFilters}
        >
          <input
            type="search"
            className="form-control"
            placeholder={t('searchCategoryPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            className="form-control"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value="all">{t('allCategories')}</option>
            <option value="active">{t('activeCategories')}</option>
            <option value="inactive">{t('inactiveCategories')}</option>
          </select>

          <button type="submit" className="lang-btn">🔎 {t('search')}</button>
          <button type="button" className="lang-btn" onClick={handleClearFilters}>🔄 {t('clearFilters')}</button>

          {canCreate && (
            <button type="button" className="action-btn" onClick={openCreate}>
              ➕ {t('newCategory')}
            </button>
          )}

          <div className="export-control">
            <ExportButtons
              data={filteredCategories}
              config={exportConfig}
              onLoadAllData={kind => loadAllPagesForExport(kind, paging => servicioCatalogo.getCategories(appliedFilters.search || undefined, paging, sortKey, sortDirection))}
            />
          </div>
        </form>
      </div>

      {notice && (
        <div className={`categories-notice categories-notice--${notice.type}`} role="alert">
          {notice.text}
        </div>
      )}

      <div className="card categories-card">
        {loading ? (
          <div className="categories-empty">{t('loadingCategories')}</div>
        ) : filteredCategories.length === 0 ? (
          <div className="categories-empty">{t('noCategoriesFound')}</div>
        ) : (
          <>
            <div className="categories-table-wrap">
            <table className="categories-table">
              <thead>
                <tr>
                  <th style={{ width: '56px', textAlign: 'center' }}>{t('photoHeader')}</th>
                  <SortableTh columnKey="name" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
                    {t('category')}
                  </SortableTh>
                  <SortableTh columnKey="slug" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
                    {t('categoryKey')}
                  </SortableTh>
                  <SortableTh columnKey="description" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
                    {t('description')}
                  </SortableTh>
                  <SortableTh columnKey="parentCategory" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
                    {t('parentCategory')}
                  </SortableTh>
                  <SortableTh columnKey="isActive" activeSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>
                    {t('status')}
                  </SortableTh>
                  <th style={{ textAlign: 'right' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map(cat => {
                  const isActive = cat.isActive !== false;
                  return (
                    <tr key={cat.id}>
                      <td style={{ width: '56px', textAlign: 'center', padding: '0.4rem 0.5rem' }}>
                        {cat.imageUrl ? (
                          <img
                            src={resolveProductImageUrl(cat.imageUrl)}
                            alt={cat.name}
                            style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                          />
                        ) : (
                          <div style={{ width: '38px', height: '38px', background: 'var(--bg-tertiary, #f3f4f6)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px dashed var(--border-color, #cbd5e1)', margin: '0 auto' }}>
                            📁
                          </div>
                        )}
                      </td>
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
                          {isActive ? `🟢 ${t('activeCategories')}` : `🔴 ${t('inactiveCategories')}`}
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
                              title={t('editCategoryTooltip')}
                            >
                              ✏️ {t('edit')}
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
                              title={isActive ? t('deactivateCategoryTooltip') : t('activateCategoryTooltip')}
                            >
                              {isActive ? `🗑️ ${t('deactivate')}` : `🔄 ${t('activate')}`}
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
          <TablePagination
            pageNumber={pagination.pageNumber}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPageNumber}
            onPageSizeChange={pagination.setPageSize}
            disabled={loading}
          />
        </>
      )}
      </div>

      {/* Modal de Alta y Edición de Categoría */}
      {isModalOpen && (
        <div className="categories-modal-backdrop" onClick={() => !saving && setIsModalOpen(false)}>
          <div className="categories-modal" onClick={e => e.stopPropagation()}>
            <header>
              <div>
                <h2>{editingCategory ? `✏️ ${t('editCategoryTitle')}` : `➕ ${t('newCategoryTitle')}`}</h2>
                <p>{editingCategory ? t('editCategorySubtitle') : t('newCategorySubtitle')}</p>
              </div>
              <button type="button" onClick={() => !saving && setIsModalOpen(false)} aria-label={t('close')}>✕</button>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="categories-form-grid">
                <label className="categories-field">
                  {t('categoryNameInputLabel')} *
                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder={t('categoryNameInputPlaceholder')}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    disabled={saving}
                  />
                </label>

                {/* Sección de Imagen Representativa */}
                <div className="categories-field">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    {t('categoryImageSectionTitle')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {(imagenPreviewUrl || form.imageUrl) && !imagenFueEliminada ? (
                      <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                        <img
                          src={imagenPreviewUrl.startsWith('blob:') ? imagenPreviewUrl : resolveProductImageUrl(form.imageUrl || '')}
                          alt="Vista previa"
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        />
                        <button
                          type="button"
                          onClick={handleQuitarImagen}
                          title="Eliminar imagen"
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            background: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ width: '80px', height: '80px', flexShrink: 0, borderRadius: '8px', border: '1px dashed var(--border-color, #cbd5e1)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary, #f8fafc)', fontSize: '28px' }}>
                        🖼️
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.heic,.heif,.HEIC,.HEIF"
                        disabled={saving || procesandoImagen}
                        onChange={handleImageFileChange}
                        style={{ display: 'block', fontSize: '0.85rem' }}
                      />
                      <small style={{ color: 'var(--text-muted, #64748b)', display: 'block', marginTop: '0.35rem', fontSize: '0.78rem' }}>
                        {procesandoImagen ? '⏳ Optimizando imagen...' : t('categoryImageHelp')}
                      </small>
                    </div>
                  </div>
                </div>

                <label className="categories-field">
                  {t('description')}
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder={t('categoryDescPlaceholder')}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    disabled={saving}
                  />
                </label>

                <label className="categories-field">
                  {t('parentCategoryLabel')}
                  <select
                    value={form.parentCategoryId}
                    onChange={e => setForm({ ...form, parentCategoryId: e.target.value })}
                    disabled={saving}
                  >
                    <option value="">{t('noParentCategoryOption')}</option>
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
                    {t('categoryActiveLabel')}
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
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="action-btn"
                  disabled={saving}
                >
                  {saving ? t('saving') : editingCategory ? t('updateCategory') : t('saveCategory')}
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
