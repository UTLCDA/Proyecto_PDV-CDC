const fs = require('fs');
const path = require('path');

const srcDir = 'D:/Visozr Etiquetas/src';

console.log('=== Mejorando LabelForm con Selector de Archivo y Filtro de Fotos ===');

// 1. Reconstruir LabelForm.tsx limpiamente con UTF-8
const labelFormPath = path.join(srcDir, 'components/LabelForm.tsx');
const newLabelFormContent = `import React, { useState, useRef } from 'react';
import { 
  Image as ImageIcon,
  Palette, 
  Ruler, 
  Barcode, 
  Tag, 
  DollarSign, 
  Copy, 
  PlusCircle, 
  Printer, 
  FileDown, 
  RotateCcw,
  Sparkles,
  Layers,
  Search,
  Upload,
  Camera
} from 'lucide-react';
import { LabelData } from '../types/label';
import { PRESET_PRODUCTS } from '../data/presets';

interface LabelFormProps {
  formData: LabelData;
  onChange: (field: keyof LabelData, value: any) => void;
  onApplyPreset: (preset: typeof PRESET_PRODUCTS[0]) => void;
  onAddToQueue: () => void;
  onDirectPrint: () => void;
  onDownloadPdf: () => void;
  onReset: () => void;
  isGeneratingPdf: boolean;
  queueCount: number;
}

export const LabelForm: React.FC<LabelFormProps> = ({
  formData,
  onChange,
  onApplyPreset,
  onAddToQueue,
  onDirectPrint,
  onDownloadPdf,
  onReset,
  isGeneratingPdf,
  queueCount,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [onlyWithImage, setOnlyWithImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPresets = PRESET_PRODUCTS.filter(p => {
    if (onlyWithImage && !p.imagenUrl) return false;
    if (!filterQuery.trim()) return true;
    const term = filterQuery.toLowerCase();
    return p.sku.toLowerCase().includes(term) ||
      p.color.toLowerCase().includes(term) ||
      p.barcode.includes(term);
  });

  const countWithImages = PRESET_PRODUCTS.filter(p => !!p.imagenUrl).length;

  const handleGenerateBarcode = () => {
    const randomCode = '750' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    onChange('barcode', randomCode);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onChange('imagenUrl', dataUrl);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl p-5 md:p-6 shadow-xl flex flex-col gap-6">
      {/* Encabezado del Formulario con Presets */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Datos del Lambrín
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona un modelo capturado ({PRESET_PRODUCTS.length} disponibles) o edita manualmente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            title="Restablecer formulario"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>
        </div>

        {/* Buscador, Filtro de Fotos y Chips de Modelos */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Modelos ({filteredPresets.length})
              </label>

              {/* Botón Filtro: Sólo con foto */}
              <button
                type="button"
                onClick={() => setOnlyWithImage(!onlyWithImage)}
                className={\`text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer \${
                  onlyWithImage
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                    : 'bg-slate-800/60 border-slate-750 text-slate-400 hover:text-slate-300'
                }\`}
                title="Mostrar únicamente los productos que ya tienen foto cargada en la base de datos"
              >
                <Camera className="w-3 h-3" />
                Con foto en BD ({countWithImages})
              </button>
            </div>

            <div className="relative w-48">
              <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Buscar SKU, Color, Código..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
            {filteredPresets.map((preset) => {
              const isSelected = formData.sku === preset.sku;
              const hasImg = !!preset.imagenUrl;
              return (
                <button
                  key={preset.sku}
                  type="button"
                  onClick={() => onApplyPreset(preset)}
                  title={\`\${preset.sku}: \${preset.color}\${hasImg ? ' (Tiene foto)' : ''}\`}
                  className={\`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer \${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700/80 text-slate-300 hover:border-slate-600'
                  }\`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/30 shrink-0"
                    style={{ backgroundColor: preset.previewColor || '#b38f65' }}
                  />
                  <span className="font-mono text-[10px] text-amber-400/90 font-bold">{preset.sku}</span>
                  {hasImg && (
                    <span className="text-[10px] opacity-80" title="Foto cargada en BD">📷</span>
                  )}
                  <span className="truncate max-w-[150px]">{preset.color}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* Inputs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* SKU */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            Código / SKU
          </label>
          <input
            type="text"
            value={formData.sku}
            onChange={(e) => onChange('sku', e.target.value)}
            placeholder="Ej: LAM-01"
            className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
          />
        </div>

        {/* Código de Barras */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-amber-400" />
              Código de Barras
            </label>
            <button
              type="button"
              onClick={handleGenerateBarcode}
              className="text-[10px] text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              Generar aleatorio
            </button>
          </div>
          <input
            type="text"
            value={formData.barcode}
            onChange={(e) => onChange('barcode', e.target.value)}
            placeholder="Ej: 8809000018115"
            className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
          />
        </div>

        {/* Foto del Producto (Miniatura) */}
        <div className="sm:col-span-2 flex flex-col gap-2 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              Foto del Producto (Muestra en Etiqueta)
            </label>
            {formData.imagenUrl && (
              <button
                type="button"
                onClick={() => onChange('imagenUrl', '')}
                className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                ✕ Quitar foto
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {formData.imagenUrl ? (
              <div className="relative group">
                <img
                  src={formData.imagenUrl}
                  alt="Miniatura"
                  className="w-14 h-14 rounded-lg object-cover border-2 border-amber-500/50 bg-white shrink-0 shadow-md"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/60 flex flex-col items-center justify-center text-slate-500 shrink-0 text-[10px] gap-1">
                <ImageIcon className="w-4 h-4 text-slate-600" />
                <span>Sin foto</span>
              </div>
            )}

            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {/* Botón para subir archivo desde la computadora */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                  id="label-image-upload"
                />
                <label
                  htmlFor="label-image-upload"
                  className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{formData.imagenUrl ? 'Cambiar Foto...' : 'Subir Foto de Producto...'}</span>
                </label>

                {formData.imagenUrl && (
                  <span className="text-[11px] text-emerald-400 font-medium">✓ Foto lista para la etiqueta</span>
                )}
              </div>

              <span className="text-[10px] text-slate-400">
                Los productos que ya tienen imagen en la base de datos se cargan automáticamente. También puedes subir una foto desde tu equipo.
              </span>
            </div>
          </div>
        </div>

        {/* Color Comercial Bilingüe */}
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            Color / Acabado Comercial
          </label>
          <input
            type="text"
            value={formData.color}
            onChange={(e) => onChange('color', e.target.value)}
            placeholder="Ej: Madera rojiza-marrón —— 红棕木色"
            className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
          />
        </div>

        {/* Dimensiones */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5 text-amber-400" />
            Dimensiones Físicas
          </label>
          <input
            type="text"
            value={formData.dimensiones}
            onChange={(e) => onChange('dimensiones', e.target.value)}
            placeholder="290 cm x 20 cm x 2.25 cm"
            className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
          />
        </div>

        {/* Precio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            Precio Unitario (MXN con IVA)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-sm text-slate-400">$</span>
            <input
              type="number"
              step="0.5"
              min="0"
              value={formData.precio === 0 ? '' : formData.precio}
              onChange={(e) => onChange('precio', parseFloat(e.target.value) || 0)}
              placeholder="158.00"
              className="w-full bg-slate-950 border border-slate-750 rounded-xl pl-7 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
          </div>
        </div>

        {/* Cantidad de Copias */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            Cantidad de Copias a Imprimir
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={formData.copias}
            onChange={(e) => onChange('copias', parseInt(e.target.value, 10) || 1)}
            className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
          />
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onAddToQueue}
          className="flex-1 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Agregar a la Cola ({queueCount})</span>
        </button>

        <button
          type="button"
          onClick={onDirectPrint}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Esta</span>
        </button>

        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={isGeneratingPdf}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold py-3 px-4 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          <span>{isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}</span>
        </button>
      </div>
    </div>
  );
};
`;

fs.writeFileSync(labelFormPath, newLabelFormContent, 'utf8');
console.log('[OK] LabelForm.tsx reescrito con UTF-8 puro, botón de subir archivo y filtro de fotos.');
