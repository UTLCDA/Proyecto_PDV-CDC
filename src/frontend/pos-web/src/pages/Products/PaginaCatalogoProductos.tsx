import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Producto, Categoria } from '../../types/tiposCatalogo';
import { servicioCatalogo } from '../../services/servicioCatalogo';
import { useAuth } from '../../context/AuthContext';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { generateBarcodeBase64, saveBarcodeLocally, getLocalBarcode } from '../../utils/barcodeGenerator';
import { downloadTechnicalDataSheet } from '../../utils/technicalSheetGenerator';
import './ProductListPage.css';

const MAX_PRODUCT_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export const PaginaCatalogoProductos: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canCreateProduct = hasPermission('catalogo', 'productos_crear');
  const canEditProduct = hasPermission('catalogo', 'productos_editar');
  const canCreateCategory = hasPermission('catalogo', 'categorias_crear');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [filtrosAplicados, setFiltrosAplicados] = useState({ busqueda: '', categoriaId: '' });
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  // Estado Modal Producto
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false);
  const [esEdicion, setEsEdicion] = useState(false);
  const [productoEdicionId, setProductoEdicionId] = useState<string | null>(null);

  // Campos del Formulario de Producto (1.1 - 2.1)
  const [sku, setSku] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [codigoBarrasBase64, setCodigoBarrasBase64] = useState('');
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precioUnitario, setPrecioUnitario] = useState<string>('');
  const [costoUnitario, setCostoUnitario] = useState<string>('');
  const [precioMayoreo, setPrecioMayoreo] = useState<string>('');
  const [cantidadMinimaMayoreo, setCantidadMinimaMayoreo] = useState<string>('');
  const [unidadMedida, setUnidadMedida] = useState('Pza');
  const [coberturaUnidadM2, setCoberturaUnidadM2] = useState<string>('');
  const [piezasPorCaja, setPiezasPorCaja] = useState<string>('');
  const [largoCm, setLargoCm] = useState<string>('');
  const [altoCm, setAltoCm] = useState<string>('');
  const [anchoCm, setAnchoCm] = useState<string>('');
  const [cantidadInventarioInicial, setCantidadInventarioInicial] = useState<string>('');
  const [imagenUrl, setImagenUrl] = useState<string>('');
  const [soloCotizacion, setSoloCotizacion] = useState(false);
  const [visibleMasVendido, setVisibleMasVendido] = useState(true);

  // Modal Estado Categoría
  const [modalCategoriaAbierto, setModalCategoriaAbierto] = useState(false);
  const [nombreCategoria, setNombreCategoria] = useState('');
  const [descripcionCategoria, setDescripcionCategoria] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const exportConfig = useMemo<ExportReportConfig<Producto>>(() => ({
    moduleName: 'Catálogo de Productos WPC Bajío',
    title: 'Catálogo Administrativo de Productos',
    fileName: 'Productos',
    sheetName: 'Productos',
    orientation: 'landscape',
    filters: [
      { label: 'Búsqueda', value: filtrosAplicados.busqueda },
      { label: 'Categoría', value: categorias.find(category => category.id === filtrosAplicados.categoriaId)?.name || 'Todas' }
    ],
    columns: [
      { key: 'sku', label: 'SKU / 编号', width: 0.8, value: product => product.sku },
      { key: 'barcode', label: 'Código de Barras / 条形码', width: 1.1, value: product => product.barcode || '—' },
      { key: 'name', label: 'Producto / 产品', width: 1.7, value: product => product.name },
      { key: 'category', label: 'Categoría / 类别', width: 1, value: product => product.categoryName },
      { key: 'unit', label: 'Unidad / 单位', width: 0.65, value: product => product.unitOfMeasure },
      { key: 'unitCost', label: 'Costo Unitario / 成本单价', type: 'currency', width: 0.9, value: product => product.unitCost || 0 },
      { key: 'unitPrice', label: 'Precio Menudeo / 零售价', type: 'currency', width: 1.1, value: product => product.unitPrice },
      { key: 'wholesalePrice', label: 'Precio Mayoreo / 批发价', type: 'currency', width: 0.9, value: product => product.wholesalePrice },
      { key: 'wholesaleMin', label: 'Mínimo Mayoreo / 最小批发量', type: 'number', width: 0.8, value: product => product.wholesaleMinQuantity },
      { key: 'pieces', label: 'Piezas / Contenido / 每箱件数', type: 'number', width: 0.8, value: product => product.piecesPerBox || 1 },
      { key: 'coverage', label: 'Cobertura m² / 覆盖面积', type: 'number', width: 0.8, value: product => product.boxCoverageSqM || product.coveragePerUnitSqM },
      { key: 'stock', label: 'Existencias / 库存', type: 'number', width: 0.75, value: product => product.availableQuantity },
      { key: 'status', label: 'Estado / 状态', width: 0.7, value: product => product.isActive ? 'Activo' : 'Inactivo' }
    ]
  }), [categorias, filtrosAplicados]);

  useEffect(() => {
    cargarDatos();
  }, [categoriaFiltro]);

  const cargarDatos = async () => {
    setCargando(true);
    setErrorCarga('');
    try {
      const [prodsData, catsData] = await Promise.all([
        servicioCatalogo.getProducts(busqueda, categoriaFiltro),
        servicioCatalogo.getCategories()
      ]);
      setProductos(prodsData);
      setCategorias(catsData);
      setFiltrosAplicados({ busqueda: busqueda.trim(), categoriaId: categoriaFiltro });
    } catch (error) {
      setProductos([]);
      setCategorias([]);
      setErrorCarga(error instanceof Error ? error.message : t('catalogLoadError'));
    } finally {
      setCargando(false);
    }
  };

  const handleBuscarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    cargarDatos();
  };

  // Limpieza de Caché y Apertura de Modal Crear (2.1)
  const abrirModalCrear = () => {
    setEsEdicion(false);
    setProductoEdicionId(null);
    setSku('');
    setCodigoBarras('');
    setCodigoBarrasBase64('');
    setNombre('');
    setColor('');
    setDescripcion('');
    setCategoriaId(categorias.length > 0 ? categorias[0].id : '');
    setPrecioUnitario('');
    setCostoUnitario('');
    setPrecioMayoreo('');
    setCantidadMinimaMayoreo('');
    setUnidadMedida('Pza');
    setCoberturaUnidadM2('');
    setPiezasPorCaja('');
    setLargoCm('');
    setAltoCm('');
    setAnchoCm('');
    setCantidadInventarioInicial('');
    setImagenUrl('');
    setSoloCotizacion(false);
    setVisibleMasVendido(false);
    setModalProductoAbierto(true);

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 150);
  };

  const abrirModalEditar = (p: Producto) => {
    setEsEdicion(true);
    setProductoEdicionId(p.id);
    setSku(p.sku || '');
    setCodigoBarras(p.barcode || '');
    if (p.barcode?.trim()) {
      const base64 = generateBarcodeBase64(p.barcode.trim());
      setCodigoBarrasBase64(base64);
    } else {
      setCodigoBarrasBase64('');
    }
    setNombre(p.name || '');
    setColor(p.color || '');
    setDescripcion(p.description || '');
    setCategoriaId(p.categoryId || '');
    setPrecioUnitario(p.unitPrice?.toString() || '0');
    setCostoUnitario(p.unitCost?.toString() || '0');
    setPrecioMayoreo(p.wholesalePrice?.toString() || '0');
    setCantidadMinimaMayoreo(p.wholesaleMinQuantity?.toString() || '10');
    setUnidadMedida(p.unitOfMeasure || 'Pza');
    setCoberturaUnidadM2(p.coveragePerUnitSqM?.toString() || '0');
    setPiezasPorCaja(p.piecesPerBox?.toString() || '1');
    setLargoCm(p.lengthCm?.toString() || '0');
    setAltoCm(p.heightCm?.toString() || '0');
    setAnchoCm(p.widthCm?.toString() || '0');
    setCantidadInventarioInicial(p.initialInventoryQuantity?.toString() || '0');
    setImagenUrl(p.imageUrl || '/logo_wpc_bajio.jpeg');
    setSoloCotizacion(p.isQuoteOnly);
    setVisibleMasVendido(p.isTopSellerVisible);
    setModalProductoAbierto(true);
  };

  // Manejo de SKU Libre Captura
  const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSku(e.target.value);
  };

  // Manejo de Generación Dinámica de Código de Barras e Imagen Base64 Local
  const handleCodigoBarrasChange = (val: string) => {
    setCodigoBarras(val);
    if (val.trim()) {
      const base64 = generateBarcodeBase64(val.trim());
      setCodigoBarrasBase64(base64);
      if (sku.trim() || val.trim()) {
        saveBarcodeLocally(sku || val, base64);
      }
    } else {
      setCodigoBarrasBase64('');
    }
  };

  // Manejo de Selección e Imagen Base64 / Local Preview (1.2 & 1.2.1)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert(t('invalidProductImageType'));
        e.target.value = '';
        return;
      }
      if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
        alert(t('productImageTooLarge'));
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Formateador sin Ceros Molestos a la Izquierda (1.8)
  const handleFormattedNumericChange = (setter: React.Dispatch<React.SetStateAction<string>>, rawVal: string) => {
    if (rawVal === '') {
      setter('');
      return;
    }
    // Eliminar ceros a la izquierda innecesarios (ej. 0150 -> 150)
    const cleaned = rawVal.replace(/^0+(?=\d)/, '');
    setter(cleaned);
  };

  const handleLargoChange = (val: string) => {
    handleFormattedNumericChange(setLargoCm, val);
    const largo = parseFloat(val) || 0;
    const ancho = parseFloat(anchoCm) || 0;
    if (largo > 0 && ancho > 0) {
      setCoberturaUnidadM2(((largo * ancho) / 10000).toFixed(3));
    }
  };

  const handleAnchoChange = (val: string) => {
    handleFormattedNumericChange(setAnchoCm, val);
    const largo = parseFloat(largoCm) || 0;
    const ancho = parseFloat(val) || 0;
    if (largo > 0 && ancho > 0) {
      setCoberturaUnidadM2(((largo * ancho) / 10000).toFixed(3));
    }
  };

  // Cálculo de Cobertura Total de la Caja (1.3)
  const piezasNum = parseFloat(piezasPorCaja) || 0;
  const cobUnitM2Num = parseFloat(coberturaUnidadM2) || 0;
  const coberturaTotalCajaM2 = (piezasNum * cobUnitM2Num).toFixed(3);

  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      alert('Por favor ingrese el nombre del producto.');
      return;
    }

    try {
      const isBoxUnit = unidadMedida === 'Caja';
      if (esEdicion && productoEdicionId) {
        await servicioCatalogo.updateProduct(productoEdicionId, {
          sku: sku.trim(),
          barcode: codigoBarras.trim(),
          name: nombre,
          description: descripcion,
          categoryId: categoriaId,
          unitPrice: parseFloat(precioUnitario) || 0,
          unitCost: parseFloat(costoUnitario) || 0,
          wholesalePrice: parseFloat(precioMayoreo) || 0,
          wholesaleMinQuantity: parseFloat(cantidadMinimaMayoreo) || 1,
          unitOfMeasure: unidadMedida,
          coveragePerUnitSqM: parseFloat(coberturaUnidadM2) || 0,
          imageUrl: imagenUrl,
          piecesPerBox: parseInt(piezasPorCaja) || 1,
          lengthCm: parseFloat(largoCm) || 0,
          heightCm: parseFloat(altoCm) || 0,
          widthCm: parseFloat(anchoCm) || 0,
          widthMm: Math.round((parseFloat(anchoCm) || 0) * 10),
          lengthMm: Math.round((parseFloat(largoCm) || 0) * 10),
          thicknessMm: 24,
          material: 'WPC Madera Plástica',
          color: color.trim(),
          isQuoteOnly: soloCotizacion,
          isTopSellerVisible: visibleMasVendido,
          isActive: true
        });
      } else {
        await servicioCatalogo.createProduct({
          sku: sku.trim(),
          barcode: codigoBarras.trim(),
          name: nombre.trim(),
          description: descripcion,
          categoryId: categoriaId,
          unitPrice: parseFloat(precioUnitario) || 0,
          unitCost: parseFloat(costoUnitario) || 0,
          wholesalePrice: parseFloat(precioMayoreo) || 0,
          wholesaleMinQuantity: parseFloat(cantidadMinimaMayoreo) || 1,
          unitOfMeasure: unidadMedida,
          coveragePerUnitSqM: parseFloat(coberturaUnidadM2) || 0,
          imageUrl: imagenUrl,
          piecesPerBox: parseInt(piezasPorCaja) || 1,
          lengthCm: parseFloat(largoCm) || 0,
          heightCm: parseFloat(altoCm) || 0,
          widthCm: parseFloat(anchoCm) || 0,
          initialInventoryQuantity: parseFloat(cantidadInventarioInicial) || 0,
          widthMm: Math.round((parseFloat(anchoCm) || 0) * 10),
          lengthMm: Math.round((parseFloat(largoCm) || 0) * 10),
          thicknessMm: 24,
          material: 'WPC Madera Plástica',
          color: color.trim(),
          isQuoteOnly: soloCotizacion,
          isTopSellerVisible: visibleMasVendido
        });
      }

      setModalProductoAbierto(false);
      cargarDatos();
    } catch (err: any) {
      alert(err.message || 'Error al guardar producto.');
    }
  };

  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCategoria.trim()) return;
    try {
      await servicioCatalogo.createCategory({
        name: nombreCategoria.trim(),
        description: descripcionCategoria
      });
      setNombreCategoria('');
      setDescripcionCategoria('');
      setModalCategoriaAbierto(false);
      cargarDatos();
    } catch (err: any) {
      alert(err.message || 'Error al crear la categoría.');
    }
  };

  return (
    <div className="product-list-container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>📦 {t('catalogTitle')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('catalogSubtitle')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {canCreateProduct && <button className="action-btn" onClick={abrirModalCrear}>
              ➕ {t('newLambrinProduct')}
            </button>}
            {canCreateCategory && <button className="lang-btn" onClick={() => setModalCategoriaAbierto(true)}>
              📁 {t('createCategory')}
            </button>}
            <ExportButtons data={productos} config={exportConfig} />
          </div>
        </div>

        {errorCarga && <div className="catalog-error-notice" role="alert">{errorCarga}</div>}

        {/* Buscador y Filtros */}
        <form onSubmit={handleBuscarSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input-field"
            placeholder={t('searchProductsPlaceholder')}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ flex: 1, minWidth: '240px' }}
          />

          <select
            className="input-field"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            style={{ width: '220px' }}
          >
            <option value="">-- {t('allCategories')} --</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button type="submit" className="action-btn">{t('search')}</button>
        </form>

        {/* Tabla de Productos con Columna de Imagen Thumbnail (Punto 2.0) */}
        {cargando ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('loading')}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-main)', background: 'var(--background-container)' }}>
                  <th style={{ padding: '0.75rem', width: '70px' }}>{t('productImage')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('skuProduct')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('category')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('unitPrice')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('wholesalePrice')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('piecesPerBox')}</th>
                  <th style={{ padding: '0.75rem' }}>{t('coverageM2')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {productos.length === 0 && (
                  <tr><td colSpan={8} className="catalog-empty-state">{t('noCatalogProducts')}</td></tr>
                )}
                {productos.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {/* Columna Miniatura Imagen (2.0) */}
                    <td style={{ padding: '0.75rem' }}>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                        />
                      ) : (
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '6px',
                          background: 'var(--background-container)',
                          border: '1px dashed var(--border-input)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                          fontSize: '1.2rem'
                        }}>
                          📷
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        SKU: <strong style={{ color: 'var(--accent-primary)' }}>{p.sku}</strong> &bull; Cod: {p.barcode || 'N/A'} {p.color ? `• Color: ${p.color}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{p.categoryName}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                      ${p.unitPrice?.toFixed(2)} MXN
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--success)' }}>
                      ${p.wholesalePrice?.toFixed(2)} ({t('wholesaleMin', { qty: p.wholesaleMinQuantity, unit: p.unitOfMeasure })})
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {t('piecesCount', { count: p.piecesPerBox || 1 })}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          background: 'var(--background-container)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          width: 'fit-content'
                        }}>
                          📐 {t('coveragePerPiece', { coverage: p.coveragePerUnitSqM || 0 })}
                        </span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          background: 'var(--background-selected)',
                          border: '1px solid var(--border-hover)',
                          color: 'var(--primary-main)',
                          fontSize: '0.75rem',
                          width: 'fit-content',
                          fontWeight: 'bold'
                        }}>
                          📦 {t('boxCoverage', { coverage: p.boxCoverageSqM ? p.boxCoverageSqM.toFixed(2) : ((p.piecesPerBox || 1) * (p.coveragePerUnitSqM || 0)).toFixed(2) })}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="lang-btn"
                          onClick={() => void downloadTechnicalDataSheet(p)}
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                          title="Descargar Ficha Técnica PDF"
                        >
                          📄 Ficha Técnica
                        </button>
                        {canEditProduct && (
                          <button className="lang-btn" onClick={() => abrirModalEditar(p)} style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}>
                            ✏️ {t('editProduct') || 'Editar Producto'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Rediseñado de Producto WPC Bajío (Puntos 1.1 - 2.1) */}
      {modalProductoAbierto && (canCreateProduct || canEditProduct) && (
        <div className="catalog-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card catalog-product-modal" style={{ width: '850px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h3>{esEdicion ? '✏️ Editar Producto Lambrín WPC' : '➕ Nuevo Producto Lambrín WPC Bajío'}</h3>
              <button className="lang-btn" onClick={() => setModalProductoAbierto(false)}>✕</button>
            </div>

            <form onSubmit={handleGuardarProducto} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Sección 1: Información General */}
              <div style={{ padding: '1rem', background: 'var(--background-container)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--accent-primary)' }}>📦 1. Información General</h4>

                <div className="catalog-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>SKU *</label>
                    <input
                      type="text"
                      className="input-field"
                      required
                      value={sku}
                      onChange={handleSkuChange}
                      placeholder="Ej. WPC-INT-TEKA-01"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Código de Barras (Escáner / Captura Libre) *</label>
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      className="input-field"
                      required
                      value={codigoBarras}
                      onChange={(e) => handleCodigoBarrasChange(e.target.value)}
                      placeholder="Escanee o ingrese código..."
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Espacio para Visualizar y Guardar Código de Barras en Base64 para Impresión de Etiquetas */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--background-surface, #ffffff)',
                      borderRadius: '6px',
                      border: '1px dashed var(--border-hover, #0284c7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary, #0284c7)', marginBottom: '0.35rem' }}>
                          📊 Código de Barras Renderizado (Base64 Generado para Impresión de Etiquetas)
                        </span>
                        {codigoBarras.trim() ? (
                          codigoBarrasBase64 ? (
                            <img
                              src={codigoBarrasBase64}
                              alt={`Barcode ${codigoBarras}`}
                              style={{ maxHeight: '65px', maxWidth: '100%', background: '#ffffff', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generando representación visual...</span>
                          )
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Al escribir o escanear el número en este campo, se generará y mostrará la imagen del código de barras en formato Base64 para guardarla localmente e imprimir etiquetas.
                          </span>
                        )}
                      </div>

                      {codigoBarrasBase64 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                            💾 Base64 Guardado ({codigoBarrasBase64.length} bytes)
                          </span>
                          <button
                            type="button"
                            className="lang-btn"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = codigoBarrasBase64;
                              link.download = `Barcode_${sku || codigoBarras}.png`;
                              link.click();
                            }}
                          >
                            📥 Descargar Etiqueta PNG
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nombre Comercial del Producto *</label>
                    <input
                      type="text"
                      className="input-field"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Lambrín Interior WPC Tono Teka 16cm x 2.90m"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Categoría *</label>
                    <select
                      className="input-field"
                      required
                      value={categoriaId}
                      onChange={(e) => setCategoriaId(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Color / Tono *</label>
                    <input
                      type="text"
                      className="input-field"
                      required
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Ej. Teka, Nogal, Roble, Gris Grafito..."
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Unidad de Medida *</label>
                    <select
                      className="input-field"
                      required
                      value={unidadMedida}
                      onChange={(e) => setUnidadMedida(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="Pza">Pza (Pieza)</option>
                      <option value="M2">M2 (Metro Cuadrado)</option>
                      <option value="ML">ML (Metro Lineal)</option>
                      <option value="Caja">Caja</option>
                      <option value="Kilo">Kilo (Kilogramo)</option>
                      <option value="Bolsa">Bolsa</option>
                      <option value="Tubo">Tubo (Pegamento)</option>
                      <option value="Juego">Juego (Kit Pijas / Clavos)</option>
                    </select>
                  </div>

                  {/* Caja de Texto de Descripción Visible (Punto 2.1) */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Descripción Técnica y Acabados</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Ingrese detalles del material, tono, resistencia UV, acabados y textura..."
                      style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Imagen y Cobertura/Dimensiones (1.2, 1.3) */}
              <div style={{ padding: '1rem', background: 'var(--background-container)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--accent-primary)' }}>🖼️ 2. Imagen, Cobertura y Dimensiones</h4>

                <div className="catalog-image-grid" style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                  {/* Vista Previa de Imagen (1.2) */}
                  <div style={{ textAlign: 'center' }}>
                    {imagenUrl ? (
                      <img src={imagenUrl} alt="Preview" style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--accent-primary)' }} />
                    ) : (
                      <div style={{ width: '90px', height: '90px', borderRadius: '8px', background: 'var(--background-surface)', border: '1px dashed var(--border-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin Foto</div>
                    )}
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Cargar Imagen del Producto (Local / Base64)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="input-field"
                      onChange={handleImageFileChange}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginTop: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>{unidadMedida === 'Caja' ? 'Piezas x Caja (1.3) *' : 'Piezas / Contenido *'}</label>
                    <input
                      type="number"
                      className="input-field"
                      min="1"
                      required
                      value={piezasPorCaja}
                      onChange={(e) => handleFormattedNumericChange(setPiezasPorCaja, e.target.value)}
                    />
                  </div>

                  {unidadMedida === 'Caja' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Cobertura por Pieza (📐 m²) *</label>
                        <input
                          type="number"
                          step="0.001"
                          className="input-field"
                          required={unidadMedida === 'Caja'}
                          value={coberturaUnidadM2}
                          onChange={(e) => handleFormattedNumericChange(setCoberturaUnidadM2, e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Cobertura Total Caja (📐 m²)</label>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.55rem 0.85rem',
                          background: 'var(--background-selected)',
                          border: '1px solid var(--border-hover)',
                          color: 'var(--primary-main)',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '0.95rem',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}>
                          📐 {coberturaTotalCajaM2} m²
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Largo (cm)</label>
                        <input
                          type="number"
                          className="input-field"
                          value={largoCm}
                          onChange={(e) => handleLargoChange(e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Espesor (cm)</label>
                        <input
                          type="number"
                          className="input-field"
                          value={altoCm}
                          onChange={(e) => handleFormattedNumericChange(setAltoCm, e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Ancho (cm)</label>
                        <input
                          type="number"
                          className="input-field"
                          value={anchoCm}
                          onChange={(e) => handleAnchoChange(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Sección 3: Precios, Unidad de Medida e Inventario Inicial (1.4, 1.8, 1.9) */}
              <div style={{ padding: '1rem', background: 'var(--background-container)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--accent-primary)' }}>💰 3. Precios, Unidad de Medida e Inventario Inicial</h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                  {/* Formateo de Cajas Monetarias sin ceros molestos (1.8) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Precio Unitario ($ MXN) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      required
                      value={precioUnitario}
                      onChange={(e) => handleFormattedNumericChange(setPrecioUnitario, e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Costo Neto / Inicial ($ MXN)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      value={costoUnitario}
                      onChange={(e) => handleFormattedNumericChange(setCostoUnitario, e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  {unidadMedida === 'Caja' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Precio Mayoreo ($ MXN) *</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input-field"
                          required={unidadMedida === 'Caja'}
                          value={precioMayoreo}
                          onChange={(e) => handleFormattedNumericChange(setPrecioMayoreo, e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Min. Cantidad Mayoreo *</label>
                        <input
                          type="number"
                          className="input-field"
                          required={unidadMedida === 'Caja'}
                          value={cantidadMinimaMayoreo}
                          onChange={(e) => handleFormattedNumericChange(setCantidadMinimaMayoreo, e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* Cantidad para Inventario Inicial (1.4) */}
                  {!esEdicion && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Cantidad Inventario Inicial (1.4) *</label>
                      <input
                        type="number"
                        className="input-field"
                        required
                        value={cantidadInventarioInicial}
                        onChange={(e) => handleFormattedNumericChange(setCantidadInventarioInicial, e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={visibleMasVendido}
                      onChange={(e) => setVisibleMasVendido(e.target.checked)}
                    />
                    ⭐ Destacado / Más Vendido
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={soloCotizacion}
                      onChange={(e) => setSoloCotizacion(e.target.checked)}
                    />
                    📋 Solo Cotización
                  </label>
                </div>
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="lang-btn" onClick={() => setModalProductoAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="action-btn">
                  💾 {esEdicion ? 'Actualizar Producto' : 'Guardar Producto en Catálogo'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Categoría */}
      {modalCategoriaAbierto && canCreateCategory && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '420px' }}>
            <h3>📁 Crear Nueva Categoría WPC</h3>
            <form onSubmit={handleCrearCategoria} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nombre de Categoría *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={nombreCategoria}
                  onChange={(e) => setNombreCategoria(e.target.value)}
                  placeholder="Ej. Accesorios y Fijación WPC"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Descripción</label>
                <input
                  type="text"
                  className="input-field"
                  value={descripcionCategoria}
                  onChange={(e) => setDescripcionCategoria(e.target.value)}
                  placeholder="Pijas, grapas, pegamento, remates..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="submit" className="action-btn" style={{ flex: 1 }}>💾 Guardar Categoría</button>
                <button type="button" className="lang-btn" onClick={() => setModalCategoriaAbierto(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginaCatalogoProductos;
