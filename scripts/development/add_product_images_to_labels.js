const fs = require('fs');
const path = require('path');

const srcDir = 'D:/Visozr Etiquetas/src';
const imgDir = 'D:/Visozr Etiquetas/public/product-images';

console.log('=== Agregando Soporte de Imagen de Producto a Etiquetas ===');

// 1. types/label.ts
const labelTypesPath = path.join(srcDir, 'types/label.ts');
let labelTypes = fs.readFileSync(labelTypesPath, 'utf8');
if (!labelTypes.includes('imagenUrl?: string')) {
  labelTypes = labelTypes.replace(
    'copias: number;',
    'copias: number;\n  imagenUrl?: string;'
  );
  labelTypes = labelTypes.replace(
    'previewColor?: string;',
    'previewColor?: string;\n  imagenUrl?: string;'
  );
  fs.writeFileSync(labelTypesPath, labelTypes, 'utf8');
  console.log('[OK] types/label.ts actualizado con imagenUrl.');
}

// 2. data/presets.ts
const presetsPath = path.join(srcDir, 'data/presets.ts');
let presetsCode = fs.readFileSync(presetsPath, 'utf8');

// Escanear qué imágenes existen en public/product-images/
const availableImages = new Set(fs.readdirSync(imgDir));

// Actualizar cada preset
const skuRegex = /sku:\s*'([^']+)'/g;
let match;
let updatedPresets = presetsCode;

// Leer los presets existentes e inyectar imagenUrl si existe en public/product-images
presetsCode = presetsCode.replace(/{\s*color:\s*'([^']*)',\s*dimensiones:\s*'([^']*)',\s*sku:\s*'([^']*)',\s*barcode:\s*'([^']*)',\s*precio:\s*([0-9.]+),\s*categoria:\s*'([^']*)',\s*previewColor:\s*'([^']*)',?(\s*imagenUrl:\s*'[^']*',?)?\s*}/g, (m, color, dim, sku, barcode, precio, cat, prevCol) => {
  const cleanSku1 = sku.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanSku2 = sku.replace(/[^a-zA-Z0-9_-]/g, '-');
  
  let imgPath = null;
  if (availableImages.has(`${cleanSku2}.jpg`)) {
    imgPath = `/product-images/${cleanSku2}.jpg`;
  } else if (availableImages.has(`${cleanSku1}.jpg`)) {
    imgPath = `/product-images/${cleanSku1}.jpg`;
  }

  if (imgPath) {
    return `  {
    color: '${color}',
    dimensiones: '${dim}',
    sku: '${sku}',
    barcode: '${barcode}',
    precio: ${precio},
    categoria: '${cat}',
    previewColor: '${prevCol}',
    imagenUrl: '${imgPath}',
  }`;
  } else {
    return `  {
    color: '${color}',
    dimensiones: '${dim}',
    sku: '${sku}',
    barcode: '${barcode}',
    precio: ${precio},
    categoria: '${cat}',
    previewColor: '${prevCol}',
  }`;
  }
});

fs.writeFileSync(presetsPath, presetsCode, 'utf8');
console.log('[OK] data/presets.ts actualizado con rutas de imagen para productos existentes.');

// 3. ThermalLabel.tsx
const thermalLabelPath = path.join(srcDir, 'components/ThermalLabel.tsx');
let thermalCode = fs.readFileSync(thermalLabelPath, 'utf8');

// Modificar la sección central (2. CUERPO CENTRAL) para alojar el recuadro de imagen
const newCentralBody = `        {/* 2. CUERPO CENTRAL: TEXTO (IZQ) + IMAGEN DEL PRODUCTO EN RECUADRO (DER) */}
        <div
          style={{
            margin: 'auto 0',
            padding: '2px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          {/* Columna Izquierda: Información técnica */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Fila Color */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <span
                style={{
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  color: 'rgba(58, 35, 18, 0.8)',
                  flexShrink: 0,
                  paddingTop: '1.5px',
                  fontSize: '7.5pt',
                  whiteSpace: 'nowrap',
                }}
              >
                COLOR:
              </span>
              <span
                style={{
                  fontWeight: 900,
                  color: '#3A2312',
                  letterSpacing: '-0.02em',
                  fontFamily: "'Outfit', sans-serif",
                  wordBreak: 'break-word',
                  fontSize: colorFontSize,
                  lineHeight: colorLineHeight,
                  maxHeight: '16mm',
                  overflow: 'hidden',
                }}
                title={colorText}
              >
                {colorText}
              </span>
            </div>

            {/* Fila Dimensiones */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  color: 'rgba(58, 35, 18, 0.8)',
                  flexShrink: 0,
                  fontSize: '7.5pt',
                  whiteSpace: 'nowrap',
                }}
              >
                DIMENSIONES:
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: '#3A2312',
                  fontSize: '8.5pt',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                }}
              >
                {cleanDimensions}
              </span>
            </div>

            {/* Fila SKU */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  color: 'rgba(58, 35, 18, 0.8)',
                  flexShrink: 0,
                  fontSize: '7.5pt',
                  whiteSpace: 'nowrap',
                }}
              >
                SKU:
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#3A2312',
                  fontSize: '9pt',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {data.sku || 'LAM-000-00'}
              </span>
            </div>
          </div>

          {/* Columna Derecha: Recuadro con Imagen del Producto (si existe) */}
          {data.imagenUrl ? (
            <div
              style={{
                width: '18mm',
                height: '18mm',
                minWidth: '18mm',
                minHeight: '18mm',
                borderRadius: '2mm',
                border: '1.2px solid rgba(58, 35, 18, 0.35)',
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(58, 35, 18, 0.12)',
                flexShrink: 0,
              }}
            >
              <img
                src={data.imagenUrl}
                alt={data.sku}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          ) : null}
        </div>`;

// Reemplazar sección central en ThermalLabel
const centralRegex = /\{\/\* 2\. CUERPO CENTRAL[\s\S]*?\{\/\* 3\. PIE INFERIOR/;
if (thermalCode.match(centralRegex)) {
  thermalCode = thermalCode.replace(centralRegex, `${newCentralBody}\n\n        {/* 3. PIE INFERIOR`);
  fs.writeFileSync(thermalLabelPath, thermalCode, 'utf8');
  console.log('[OK] ThermalLabel.tsx actualizado con recuadro de imagen a la derecha.');
}

// 4. App.tsx
const appPath = path.join(srcDir, 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

// Asegurar que defaultPreset pase imagenUrl y handleApplyPreset pase imagenUrl
appCode = appCode.replace(
  'precio: defaultPreset.precio,\n    copias: 1,',
  'precio: defaultPreset.precio,\n    imagenUrl: defaultPreset.imagenUrl,\n    copias: 1,'
);

appCode = appCode.replace(
  'precio: preset.precio,\n    }));',
  'precio: preset.precio,\n      imagenUrl: preset.imagenUrl,\n    }));'
);

appCode = appCode.replace(
  'precio: p.precio,\n      copias: 1,\n    }));',
  'precio: p.precio,\n      imagenUrl: p.imagenUrl,\n      copias: 1,\n    }));'
);

appCode = appCode.replace(
  'precio: defaultPreset.precio,\n      copias: 1,\n    });',
  'precio: defaultPreset.precio,\n      imagenUrl: defaultPreset.imagenUrl,\n      copias: 1,\n    });'
);

fs.writeFileSync(appPath, appCode, 'utf8');
console.log('[OK] App.tsx actualizado para manejar imagenUrl en presets y cola.');

// 5. LabelForm.tsx: Agregar input/preview de imagen en el formulario
const labelFormPath = path.join(srcDir, 'components/LabelForm.tsx');
let labelFormCode = fs.readFileSync(labelFormPath, 'utf8');

if (!labelFormCode.includes('imagenUrl')) {
  // Agregar icono Image si es necesario
  labelFormCode = labelFormCode.replace(
    "import { \n  Palette,",
    "import { \n  Image as ImageIcon,\n  Palette,"
  );

  // Agregar campo de imagen debajo de Acabado / Color
  const colorFieldTarget = '{/* Color Comercial Bilingüe */}';
  const newImageField = `{/* Foto del Producto (Miniatura) */}
        <div className="sm:col-span-2 flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              Foto del Producto (Muestra en Etiqueta)
            </label>
            {formData.imagenUrl && (
              <button
                type="button"
                onClick={() => onChange('imagenUrl', '')}
                className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                ✕ Quitar foto
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {formData.imagenUrl ? (
              <img
                src={formData.imagenUrl}
                alt="Miniatura"
                className="w-12 h-12 rounded-lg object-cover border border-amber-500/40 bg-white shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 flex items-center justify-center text-slate-500 shrink-0 text-xs">
                Sin foto
              </div>
            )}
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="text"
                value={formData.imagenUrl || ''}
                onChange={(e) => onChange('imagenUrl', e.target.value)}
                placeholder="/product-images/LAM-01.jpg o data:image/..."
                className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-400">
                Se detecta automáticamente de la base de datos o puedes pegar una URL / Base64.
              </span>
            </div>
          </div>
        </div>

        {/* Color Comercial Bilingüe */}`;

  labelFormCode = labelFormCode.replace(colorFieldTarget, newImageField);
  fs.writeFileSync(labelFormPath, labelFormCode, 'utf8');
  console.log('[OK] LabelForm.tsx actualizado con campo y miniatura de imagen.');
}

console.log('=== Actualización completada exitosamente ===');
