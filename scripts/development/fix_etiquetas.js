const fs = require('fs');
const path = require('path');

const baseDir = 'D:/Visozr Etiquetas/src';

// ==========================================
// 1. ThermalLabel.tsx
// ==========================================
const thermalLabelContent = `import React from 'react';
import { LabelData } from '../types/label';
import wpcBajioLogo from '../assets/wpc-bajio-logo.jpg';

interface ThermalLabelProps {
  data: LabelData;
  className?: string;
  id?: string;
  isPrintVersion?: boolean;
}

export const ThermalLabel: React.FC<ThermalLabelProps> = ({
  data,
  className = '',
  id,
  isPrintVersion = false,
}) => {
  // Formato de moneda mexicano
  const formattedPrice = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(data.precio || 0);

  // Sanitizar dimensiones para limpiar cualquier caracter extraño o mojibake heredado
  const cleanDimensions = (data.dimensiones || '290 cm x 16 cm x 2.2 cm')
    .replace(/Ã—/g, 'x')
    .replace(/×/g, 'x');

  // Ajuste inteligente de escala de color para nombres bilingües largos (evita recorte)
  const colorText = (data.color || 'SIN ESPECIFICAR').trim();
  const colorLen = colorText.length;
  const colorFontSize = colorLen > 38 ? '8pt' : colorLen > 24 ? '9.2pt' : '11pt';
  const colorLineHeight = colorLen > 24 ? 1.15 : 1.1;

  return (
    <div
      id={id}
      style={{
        width: '100mm',
        height: '60mm',
        backgroundColor: '#FEE2B8',
        color: '#3A2312',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
      className={\`select-none flex flex-col justify-between \${className}\`}
    >
      {/* Margen perimetral seguro para rodillos de impresora térmica (3.5mm) */}
      <div
        style={{
          margin: '3mm',
          border: '1.8mm solid #E6D8C5',
          borderRadius: '2mm',
          boxSizing: 'border-box',
          height: 'calc(100% - 6mm)',
          width: 'calc(100% - 6mm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '2.5mm 3.5mm',
        }}
        className="bg-[#FEE2B8] relative overflow-hidden"
      >
        {/* 1. ENCABEZADO: Logo + WPC Bajío */}
        <div className="flex items-center border-b border-[#3A2312]/20 pb-1">
          <div className="flex items-center gap-2">
            <img
              src={wpcBajioLogo}
              alt="Logo WPC Bajío"
              className="rounded-full object-cover shrink-0 border border-[#3A2312]/30"
              style={{ width: '8.5mm', height: '8.5mm' }}
            />
            <span
              className="tracking-wider text-[#3A2312] font-black font-['Outfit']"
              style={{ fontSize: '13.5pt', lineHeight: 1 }}
            >
              WPC Bajío
            </span>
          </div>
        </div>

        {/* 2. CUERPO CENTRAL: COLOR (MULTILÍNEA COMPLETO), DIMENSIONES Y SKU */}
        <div className="my-auto py-1 flex flex-col gap-1.5">
          {/* Fila Color: Permite visualización completa multilínea sin puntos suspensivos */}
          <div className="flex items-start gap-1.5">
            <span
              className="font-extrabold uppercase tracking-wide text-[#3A2312]/80 shrink-0 pt-0.5"
              style={{ fontSize: '7.5pt' }}
            >
              COLOR:
            </span>
            <span
              className="font-black text-[#3A2312] tracking-tight font-['Outfit'] break-words line-clamp-2"
              style={{ fontSize: colorFontSize, lineHeight: colorLineHeight }}
              title={colorText}
            >
              {colorText}
            </span>
          </div>

          {/* Fila Dimensiones */}
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-extrabold uppercase tracking-wide text-[#3A2312]/80 shrink-0"
              style={{ fontSize: '7.5pt' }}
            >
              DIMENSIONES:
            </span>
            <span
              className="font-bold text-[#3A2312] tracking-normal"
              style={{ fontSize: '8.5pt', lineHeight: 1.1 }}
            >
              {cleanDimensions}
            </span>
          </div>

          {/* Fila SKU */}
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-extrabold uppercase tracking-wide text-[#3A2312]/80 shrink-0"
              style={{ fontSize: '7.5pt' }}
            >
              SKU:
            </span>
            <span
              className="font-mono font-bold tracking-tight text-[#3A2312]"
              style={{ fontSize: '9pt', lineHeight: 1 }}
            >
              {data.sku || 'LAM-000-00'}
            </span>
          </div>
        </div>

        {/* 3. PIE INFERIOR (FOOTER): Código numérico (izq) y Bloque de precio (der) */}
        <div className="flex items-end justify-between pt-1 border-t border-[#3A2312]/20">
          {/* Izquierda: Código de barras */}
          <div className="flex flex-col items-start justify-end max-w-[58%] overflow-hidden pb-0.5">
            <span
              className="text-[6pt] tracking-wider uppercase font-semibold text-[#3A2312]/70 leading-none mb-1"
            >
              CÓDIGO DE BARRAS
            </span>
            <span
              className="font-mono font-bold tracking-wider text-[#3A2312] select-all leading-tight"
              style={{ fontSize: '12pt' }}
            >
              {data.barcode || '000000000000'}
            </span>
          </div>

          {/* Derecha: Bloque de precio destacado con IVA Incluido */}
          <div className="text-right flex flex-col items-end justify-end pl-1 shrink-0">
            <span
              className="font-extrabold tracking-wider uppercase text-[#3A2312]/80 leading-none"
              style={{ fontSize: '6pt' }}
            >
              PRECIO P/PZA
            </span>
            <span
              className="font-black font-['Outfit'] text-[#3A2312] leading-none tracking-tight my-0.5"
              style={{ fontSize: '15pt' }}
            >
              {formattedPrice}
            </span>
            <span
              className="text-[5.5pt] font-bold text-[#3A2312]/75 uppercase tracking-wide leading-none"
            >
              IVA Incluido
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
`;

// ==========================================
// 2. LabelPreviewCard.tsx
// ==========================================
const labelPreviewCardContent = `import React, { useState } from 'react';
import { 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  Ruler
} from 'lucide-react';
import { LabelData } from '../types/label';
import { ThermalLabel } from './ThermalLabel';

interface LabelPreviewCardProps {
  data: LabelData;
  labelElementId: string;
}

export const LabelPreviewCard: React.FC<LabelPreviewCardProps> = ({
  data,
  labelElementId,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.25);
  const [showRulers, setShowRulers] = useState<boolean>(true);

  return (
    <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl p-5 md:p-6 shadow-xl flex flex-col gap-4">
      {/* Barra superior de la vista previa */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">
                Vista Previa en Tiempo Real
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Formato Térmico Estándar 100mm x 60mm a escala exacta
            </p>
          </div>
        </div>

        {/* Controles de Zoom y Guías */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setShowRulers(!showRulers)}
            title="Mostrar u ocultar guías milimétricas"
            className={\`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 \${
              showRulers
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }\`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">100 x 60mm</span>
          </button>

          <div className="h-4 w-px bg-slate-800 my-auto" />

          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.max(0.75, +(prev - 0.25).toFixed(2)))}
            disabled={zoomLevel <= 0.75}
            title="Reducir zoom"
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-mono font-semibold text-slate-300 px-1 w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.min(2.0, +(prev + 0.25).toFixed(2)))}
            disabled={zoomLevel >= 2.0}
            title="Aumentar zoom"
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setZoomLevel(1.0)}
            title="Escala 1:1 física aproximada"
            className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            1:1
          </button>
        </div>
      </div>

      {/* Contenedor Visual de la Etiqueta */}
      <div className="wood-pattern rounded-xl p-4 sm:p-8 flex items-center justify-center min-h-[320px] overflow-hidden relative border border-slate-800/80 shadow-inner">
        {showRulers && (
          <>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-mono font-bold text-amber-400/80 bg-slate-900/90 px-2 py-0.5 rounded border border-amber-500/30 pointer-events-none">
              <span>◄</span>
              <span>100 mm (10 cm)</span>
              <span>►</span>
            </div>

            <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 flex items-center gap-2 text-[10px] font-mono font-bold text-amber-400/80 bg-slate-900/90 px-2 py-0.5 rounded border border-amber-500/30 pointer-events-none origin-center">
              <span>◄</span>
              <span>60 mm (6 cm)</span>
              <span>►</span>
            </div>
          </>
        )}

        <div
          style={{
            transform: \`scale(\${zoomLevel})\`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="thermal-shadow rounded-lg overflow-hidden border border-[#E6D8C5]/50 shrink-0"
        >
          <ThermalLabel id={labelElementId} data={data} />
        </div>
      </div>

      {/* Ficha técnica */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Medida Fís.</span>
          <span className="font-semibold text-slate-200">100 x 60 mm</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Paleta Térmica</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-3 h-3 rounded-full bg-[#FEE2B8] border border-black/30" title="Fondo #FEE2B8" />
            <span className="w-3 h-3 rounded-full bg-[#3A2312] border border-white/20" title="Tinta #3A2312" />
            <span className="w-3 h-3 rounded-full bg-[#E6D8C5] border border-black/30" title="Borde #E6D8C5" />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Formato</span>
          <span className="font-semibold text-slate-200">Rollo Continuo</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Márgenes</span>
          <span className="font-semibold text-emerald-400">Seguro 3.5mm rodillos</span>
        </div>
      </div>
    </div>
  );
};
`;

// ==========================================
// 3. LabelForm.tsx
// ==========================================
const labelFormContent = `import React, { useState } from 'react';
import { 
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
  Search
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

  const filteredPresets = PRESET_PRODUCTS.filter(p => {
    if (!filterQuery.trim()) return true;
    const term = filterQuery.toLowerCase();
    return p.sku.toLowerCase().includes(term) ||
      p.color.toLowerCase().includes(term) ||
      p.barcode.includes(term);
  });

  const handleGenerateBarcode = () => {
    const randomCode = '750' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    onChange('barcode', randomCode);
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

        {/* Buscador y Chips de Modelos */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Modelos del Catálogo ({filteredPresets.length})
            </label>
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
            {filteredPresets.map((preset) => (
              <button
                key={preset.sku}
                type="button"
                onClick={() => onApplyPreset(preset)}
                title={\`\${preset.sku}: \${preset.color}\`}
                className={\`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer \${
                  formData.sku === preset.sku
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700/80 text-slate-300 hover:border-slate-600'
                }\`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/30 shrink-0"
                  style={{ backgroundColor: preset.previewColor || '#b38f65' }}
                />
                <span className="font-mono text-[10px] text-amber-400/90 font-bold">{preset.sku}</span>
                <span className="truncate max-w-[160px]">{preset.color}</span>
              </button>
            ))}
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

// ==========================================
// 4. BatchQueue.tsx
// ==========================================
const batchQueueContent = `import React from 'react';
import { 
  Trash2, 
  Printer, 
  FileDown, 
  Layers, 
  Edit3, 
  Sparkles
} from 'lucide-react';
import { LabelData } from '../types/label';

interface BatchQueueProps {
  queue: LabelData[];
  onRemoveItem: (id: string) => void;
  onUpdateCopies: (id: string, delta: number) => void;
  onClearQueue: () => void;
  onSelectForEdit: (item: LabelData) => void;
  onPrintBatch: () => void;
  onDownloadBatchPdf: () => void;
  onLoadAllProducts?: () => void;
  isGeneratingPdf: boolean;
  totalCatalogCount?: number;
}

export const BatchQueue: React.FC<BatchQueueProps> = ({
  queue,
  onRemoveItem,
  onUpdateCopies,
  onClearQueue,
  onSelectForEdit,
  onPrintBatch,
  onDownloadBatchPdf,
  onLoadAllProducts,
  isGeneratingPdf,
  totalCatalogCount = 104,
}) => {
  const totalLabels = queue.reduce((sum, item) => sum + (item.copias || 1), 0);
  const totalRollLengthMeters = ((totalLabels * 63) / 1000).toFixed(2);

  if (queue.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center text-center gap-4">
        <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-slate-400">
          <Layers className="w-10 h-10 stroke-[1.5]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-200">
            La Cola de Impresión está Vacía
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            Puedes agregar productos uno por uno desde el formulario o cargar de un clic todo el catálogo capturado en el Punto de Venta.
          </p>
        </div>

        {onLoadAllProducts && (
          <button
            type="button"
            onClick={onLoadAllProducts}
            className="mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-6 py-3 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer text-sm"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>⚡ Cargar Catálogo Completo ({totalCatalogCount} Etiquetas)</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl p-5 md:p-6 shadow-xl flex flex-col gap-5">
      {/* Encabezado y Estadísticas de la Cola */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Cola de Impresión por Lote
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {queue.length} modelos
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Total: <strong className="text-amber-400 font-semibold">{totalLabels} etiquetas</strong> • Longitud est.: {totalRollLengthMeters}m de rollo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onLoadAllProducts && (
            <button
              type="button"
              onClick={onLoadAllProducts}
              className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recargar Catálogo ({totalCatalogCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClearQueue}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-2 rounded-xl border border-rose-500/20 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar</span>
          </button>
        </div>
      </div>

      {/* Lista de Modelos en la Cola */}
      <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
        {queue.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-mono font-bold text-slate-500 w-6 text-right shrink-0">
                #{index + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {item.sku}
                  </span>
                  <span className="text-sm font-bold text-slate-200 truncate">
                    {item.color}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span>{item.dimensiones}</span>
                  <span>•</span>
                  <span className="font-mono">{item.barcode}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">
                    \${(item.precio || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-slate-900 border border-slate-750 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => onUpdateCopies(item.id, -1)}
                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded transition-colors text-xs font-bold cursor-pointer"
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-mono font-bold text-slate-200">
                  {item.copias}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateCopies(item.id, 1)}
                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded transition-colors text-xs font-bold cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => onSelectForEdit(item)}
                title="Editar en formulario"
                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                title="Eliminar de la cola"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botones de Procesamiento por Lote */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          onClick={onPrintBatch}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Lote ({totalLabels} Etiquetas)</span>
        </button>

        <button
          type="button"
          onClick={onDownloadBatchPdf}
          disabled={isGeneratingPdf}
          className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold py-3 px-4 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF por Lote'}</span>
        </button>
      </div>
    </div>
  );
};
`;

// ==========================================
// 5. App.tsx
// ==========================================
const appContent = `import React, { useState } from 'react';
import { 
  Printer, 
  Sparkles, 
  Settings, 
  HelpCircle, 
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { LabelData } from './types/label';
import { PRESET_PRODUCTS } from './data/presets';
import { LabelForm } from './components/LabelForm';
import { LabelPreviewCard } from './components/LabelPreviewCard';
import { BatchQueue } from './components/BatchQueue';
import { PrintContainer } from './components/PrintContainer';
import { exportCurrentLabelToPdf, exportBatchQueueToPdf } from './utils/pdfExport';
import { ThermalLabel } from './components/ThermalLabel';
import wpcLogo from './assets/wpc-bajio-logo.jpg';

export const App: React.FC = () => {
  // Estado de la etiqueta actual en edición (cargamos el primer producto del catálogo)
  const defaultPreset = PRESET_PRODUCTS[0] || {
    color: 'Mármol blanco —— 白色大理石纹',
    dimensiones: '290 cm x 20 cm x 2.25 cm',
    sku: 'LAM-01',
    barcode: '8809000018115',
    precio: 158,
  };

  const [labelData, setLabelData] = useState<LabelData>({
    id: 'current-working-label',
    color: defaultPreset.color,
    dimensiones: defaultPreset.dimensiones,
    sku: defaultPreset.sku,
    barcode: defaultPreset.barcode,
    precio: defaultPreset.precio,
    copias: 1,
  });

  // Estado de la cola de impresión por lotes
  const [queue, setQueue] = useState<LabelData[]>([]);
  const [printTarget, setPrintTarget] = useState<'single' | 'batch'>('single');
  
  // Estado para diálogos y notificaciones rápidas
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Manejador del Toast
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Manejadores de cambios en formulario
  const handleFieldChange = (field: keyof LabelData, value: any) => {
    setLabelData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Cargar un preset del catálogo
  const handleApplyPreset = (preset: typeof PRESET_PRODUCTS[0]) => {
    setLabelData((prev) => ({
      ...prev,
      color: preset.color,
      dimensiones: preset.dimensiones,
      sku: preset.sku,
      barcode: preset.barcode,
      precio: preset.precio,
    }));
    showToast(\`Modelo \${preset.sku} cargado\`, 'success');
  };

  // Cargar todo el catálogo a la cola con 1 clic
  const handleLoadAllProductsToQueue = () => {
    const fullCatalogQueue: LabelData[] = PRESET_PRODUCTS.map((p, idx) => ({
      id: \`catalog-\${p.sku}-\${idx}-\${Date.now()}\`,
      color: p.color,
      dimensiones: p.dimensiones,
      sku: p.sku,
      barcode: p.barcode,
      precio: p.precio,
      copias: 1,
    }));

    setQueue(fullCatalogQueue);
    showToast(\`¡\${fullCatalogQueue.length} etiquetas cargadas a la cola!\`, 'success');
  };

  // Agregar etiqueta actual a la cola
  const handleAddToQueue = () => {
    const newItem: LabelData = {
      ...labelData,
      id: \`queue-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
    };

    setQueue((prev) => [...prev, newItem]);
    showToast(\`Modelo \${labelData.sku} agregado a la cola (\${labelData.copias} copias)\`, 'success');
  };

  // Modificar copias en la cola
  const handleUpdateCopies = (id: string, delta: number) => {
    setQueue((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newCopies = Math.max(1, (item.copias || 1) + delta);
            return { ...item, copias: newCopies };
          }
          return item;
        })
    );
  };

  // Remover elemento de la cola
  const handleRemoveFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    showToast('Etiqueta eliminada de la cola', 'info');
  };

  // Vaciar toda la cola
  const handleClearQueue = () => {
    if (window.confirm('¿Seguro que deseas vaciar toda la cola de impresión?')) {
      setQueue([]);
      showToast('Cola de impresión vaciada', 'info');
    }
  };

  // Editar elemento de la cola en el formulario
  const handleSelectForEdit = (item: LabelData) => {
    setLabelData({
      ...item,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(\`Editando \${item.sku}\`, 'info');
  };

  // Restablecer formulario a valores por defecto
  const handleResetForm = () => {
    setLabelData({
      id: 'current-working-label',
      color: defaultPreset.color,
      dimensiones: defaultPreset.dimensiones,
      sku: defaultPreset.sku,
      barcode: defaultPreset.barcode,
      precio: defaultPreset.precio,
      copias: 1,
    });
    showToast('Formulario restablecido', 'info');
  };

  // 1. Impresión Directa de la Etiqueta Actual
  const handleDirectPrint = () => {
    setPrintTarget('single');
    showToast('Abriendo cuadro de diálogo de impresión...', 'info');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // 2. Impresión Directa del Lote Completo
  const handlePrintBatch = () => {
    if (queue.length === 0) {
      showToast('La cola de impresión está vacía', 'error');
      return;
    }
    setPrintTarget('batch');
    const total = queue.reduce((sum, i) => sum + (i.copias || 1), 0);
    showToast(\`Preparando impresión de \${total} etiquetas del lote...\`, 'info');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // 3. Descarga PDF de Etiqueta Individual (100mm x 60mm exacto)
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      showToast('Generando documento PDF de 100mm x 60mm...', 'info');
      await exportCurrentLabelToPdf('label-preview-source', labelData);
      showToast('¡PDF generado y descargado con éxito!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Ocurrió un error al generar el PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 4. Descarga PDF Multipágina del Lote Completo
  const handleDownloadBatchPdf = async () => {
    if (queue.length === 0) {
      showToast('La cola de impresión está vacía', 'error');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      showToast('Procesando páginas del lote para PDF...', 'info');
      await exportBatchQueueToPdf('batch-export-container', queue);
      showToast('¡PDF de lote descargado con éxito!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Ocurrió un error al generar el PDF del lote', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Inter'] selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Flotante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div className={\`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm font-semibold border \${
            toastMessage.type === 'success' 
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200' 
              : toastMessage.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
              : 'bg-slate-900/95 border-slate-700 text-slate-200'
          }\`}>
            {toastMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Barra de Navegación Superior */}
      <header className="border-b border-slate-850 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={wpcLogo} 
              alt="WPC Bajío" 
              className="w-9 h-9 rounded-full object-cover border border-amber-500/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-100 font-['Outfit']">
                  WPC BAJÍO
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                  Térmico PDV
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Formato Estándar: 100mm x 60mm • Papel Autoadherible • WPC Bajío
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden md:flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-300 font-medium">Catálogo Sincronizado</span>
              <span className="font-mono text-amber-400 font-bold">({PRESET_PRODUCTS.length} productos)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Formulario de Edición */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <LabelForm
              formData={labelData}
              onChange={handleFieldChange}
              onApplyPreset={handleApplyPreset}
              onAddToQueue={handleAddToQueue}
              onDirectPrint={handleDirectPrint}
              onDownloadPdf={handleDownloadPdf}
              onReset={handleResetForm}
              isGeneratingPdf={isGeneratingPdf}
              queueCount={queue.length}
            />
          </div>

          {/* Columna Derecha: Vista Previa en Vivo */}
          <div className="lg:col-span-6 flex flex-col gap-6 lg:sticky lg:top-24">
            <LabelPreviewCard
              data={labelData}
              labelElementId="label-preview-source"
            />
          </div>
        </div>

        {/* Sección Inferior: Cola de Impresión por Lote */}
        <section className="pt-2">
          <BatchQueue
            queue={queue}
            onRemoveItem={handleRemoveFromQueue}
            onUpdateCopies={handleUpdateCopies}
            onClearQueue={handleClearQueue}
            onSelectForEdit={handleSelectForEdit}
            onPrintBatch={handlePrintBatch}
            onDownloadBatchPdf={handleDownloadBatchPdf}
            onLoadAllProducts={handleLoadAllProductsToQueue}
            isGeneratingPdf={isGeneratingPdf}
            totalCatalogCount={PRESET_PRODUCTS.length}
          />
        </section>
      </main>

      {/* Contenedor Oculto para Impresión CSS */}
      <PrintContainer
        currentLabel={labelData}
        queue={queue}
        printTarget={printTarget}
      />

      {/* Contenedor Oculto para Renderizado de PDF por Lote */}
      <div
        id="batch-export-container"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        {queue.map((item) => (
          <div key={item.id} data-batch-item data-copies={item.copias || 1}>
            <ThermalLabel data={item} isPrintVersion />
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
`;

// Escribir los 5 archivos con pure UTF-8
fs.writeFileSync(path.join(baseDir, 'components/ThermalLabel.tsx'), thermalLabelContent, 'utf8');
console.log('[OK] ThermalLabel.tsx escrito con UTF-8 puro');

fs.writeFileSync(path.join(baseDir, 'components/LabelPreviewCard.tsx'), labelPreviewCardContent, 'utf8');
console.log('[OK] LabelPreviewCard.tsx escrito con UTF-8 puro');

fs.writeFileSync(path.join(baseDir, 'components/LabelForm.tsx'), labelFormContent, 'utf8');
console.log('[OK] LabelForm.tsx escrito con UTF-8 puro');

fs.writeFileSync(path.join(baseDir, 'components/BatchQueue.tsx'), batchQueueContent, 'utf8');
console.log('[OK] BatchQueue.tsx escrito con UTF-8 puro');

fs.writeFileSync(path.join(baseDir, 'App.tsx'), appContent, 'utf8');
console.log('[OK] App.tsx escrito con UTF-8 puro');

console.log('=== Actualización de componentes completada ===');
