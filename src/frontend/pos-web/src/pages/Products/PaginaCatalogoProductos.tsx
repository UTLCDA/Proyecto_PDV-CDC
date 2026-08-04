import React, { useState, useEffect } from 'react';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { Producto, Categoria, PeticionCrearProducto, PeticionActualizarProducto } from '../../types/tiposCatalogo';

export const PaginaCatalogoProductos: React.FC = () => {
  const [products, setProducts] = useState<Producto[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State for Product CRUD
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Modal State for Category CRUD
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryDesc, setCategoryDesc] = useState<string>('');

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    categoryId: '',
    unitPrice: 0,
    wholesalePrice: 0,
    wholesaleMinQuantity: 10,
    unitOfMeasure: 'Pza',
    coveragePerUnitSqM: 0.464,
    widthMm: 160,
    lengthMm: 2900,
    thicknessMm: 24,
    material: 'WPC Madera Plástica',
    isQuoteOnly: false,
    isTopSellerVisible: true,
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        servicioCatalogo.getProducts(search || undefined, selectedCategory || undefined),
        servicioCatalogo.getCategories()
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar catálogo de productos WPC Bajío');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openNewProductModal = () => {
    setEditingProductId(null);
    setFormData({
      sku: `LAM-${Date.now().toString().slice(-6)}`,
      barcode: `750${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      name: '',
      description: '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      unitPrice: 350,
      wholesalePrice: 290,
      wholesaleMinQuantity: 10,
      unitOfMeasure: 'Pza',
      coveragePerUnitSqM: 0.464,
      widthMm: 160,
      lengthMm: 2900,
      thicknessMm: 24,
      material: 'WPC Madera Plástica',
      isQuoteOnly: false,
      isTopSellerVisible: true,
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditProductModal = (prod: Producto) => {
    setEditingProductId(prod.id);
    setFormData({
      sku: prod.sku,
      barcode: prod.barcode,
      name: prod.name,
      description: prod.description,
      categoryId: prod.categoryId,
      unitPrice: prod.unitPrice,
      wholesalePrice: prod.wholesalePrice,
      wholesaleMinQuantity: prod.wholesaleMinQuantity,
      unitOfMeasure: prod.unitOfMeasure,
      coveragePerUnitSqM: prod.coveragePerUnitSqM,
      widthMm: prod.widthMm,
      lengthMm: prod.lengthMm,
      thicknessMm: prod.thicknessMm,
      material: prod.material,
      isQuoteOnly: prod.isQuoteOnly,
      isTopSellerVisible: prod.isTopSellerVisible,
      isActive: prod.isActive
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProductId) {
        const updatePayload: PeticionActualizarProducto = { ...formData };
        await servicioCatalogo.updateProduct(editingProductId, updatePayload);
      } else {
        const createPayload: PeticionCrearProducto = { ...formData };
        await servicioCatalogo.createProduct(createPayload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al guardar el producto.');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await servicioCatalogo.createCategory({ name: categoryName, description: categoryDesc });
      setCategoryName('');
      setCategoryDesc('');
      setIsCategoryModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al crear la categoría.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>📦 Catálogo de Productos WPC Bajío</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gestión completa de Alta, Edición y Desactivación de Productos y Categorías</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="lang-btn" onClick={() => setIsCategoryModalOpen(true)}>
            📁 Crear Categoría
          </button>
          <button className="action-btn" onClick={openNewProductModal}>
            ➕ Nuevo Producto Lambrín
          </button>
        </div>
      </div>

      {errorMsg && <div style={{ color: 'var(--danger)' }}>{errorMsg}</div>}

      {/* Filtros de búsqueda */}
      <form onSubmit={handleSearchSubmit} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          className="input-field"
          placeholder="Buscar por Nombre, SKU o Código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '300px' }}
        />
        <select
          className="input-field"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
        >
          <option value="">-- Todas las Categorías --</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="submit" className="action-btn">Filtrar</button>
      </form>

      {/* Tabla de Productos */}
      <div className="card">
        <table style={{ width: '100%', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(15,23,42,0.8)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
              <th style={{ padding: '0.75rem' }}>SKU / Barcode</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Producto</th>
              <th style={{ padding: '0.75rem' }}>Cobertura M²</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>P. Unitario</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>P. Mayoreo</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                  <div>{p.sku}</div>
                  <small style={{ color: 'var(--text-muted)' }}>{p.barcode}</small>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <small style={{ color: 'var(--text-muted)' }}>{p.categoryName} ({p.material})</small>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{p.coveragePerUnitSqM} m²</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>${p.unitPrice.toFixed(2)}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', color: '#4ade80' }}>${p.wholesalePrice.toFixed(2)}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <span className={`badge ${p.isActive ? 'badge-success' : 'badge-warning'}`}>
                    {p.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <button className="lang-btn" onClick={() => openEditProductModal(p)} style={{ fontSize: '0.75rem' }}>
                    ✏️ Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal CRUD Formulario Producto */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>{editingProductId ? '✏️ Editar Producto Lambrín' : '➕ Alta de Nuevo Producto'}</h3>
            <form onSubmit={handleSaveProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem', fontSize: '0.85rem' }}>
              <div>
                <label>SKU:</label>
                <input type="text" className="input-field" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} required />
              </div>
              <div>
                <label>Código de Barras:</label>
                <input type="text" className="input-field" value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label>Nombre del Producto:</label>
                <input type="text" className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label>Categoría:</label>
                <select className="input-field" value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} required>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label>Precio Unitario ($):</label>
                <input type="number" step="0.01" className="input-field" value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div>
                <label>Precio Mayoreo ($):</label>
                <input type="number" step="0.01" className="input-field" value={formData.wholesalePrice} onChange={e => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div>
                <label>Cobertura por Unidad (m²):</label>
                <input type="number" step="0.001" className="input-field" value={formData.coveragePerUnitSqM} onChange={e => setFormData({ ...formData, coveragePerUnitSqM: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div>
                <label>Material:</label>
                <input type="text" className="input-field" value={formData.material} onChange={e => setFormData({ ...formData, material: e.target.value })} />
              </div>

              {editingProductId && (
                <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                    <strong>Producto Activo para Venta</strong>
                  </label>
                </div>
              )}

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="action-btn" style={{ flex: 1 }}>💾 Guardar Producto</button>
                <button type="button" className="lang-btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Categoría */}
      {isCategoryModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '420px' }}>
            <h3>📁 Crear Nueva Categoría</h3>
            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nombre de Categoría *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  placeholder="Ej. Lambrín Acanalado Premium"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Descripción</label>
                <input
                  type="text"
                  className="input-field"
                  value={categoryDesc}
                  onChange={e => setCategoryDesc(e.target.value)}
                  placeholder="Descripción de la línea de productos..."
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="submit" className="action-btn" style={{ flex: 1 }}>💾 Crear Categoría</button>
                <button type="button" className="lang-btn" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginaCatalogoProductos;
