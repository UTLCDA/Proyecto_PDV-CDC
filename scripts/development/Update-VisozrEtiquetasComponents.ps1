$appFile = "D:\Visozr Etiquetas\src\App.tsx"
$batchQueueFile = "D:\Visozr Etiquetas\src\components\BatchQueue.tsx"
$labelFormFile = "D:\Visozr Etiquetas\src\components\LabelForm.tsx"

# 1. Update BatchQueue.tsx
$batchQueueCode = @'
import React from 'react';
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
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <Layers className="w-6 h-6 text-slate-500" />
        </div>
        <h3 className="text-sm font-bold text-slate-300">Cola de Impresión Vacía</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto mb-4">
          Llena los datos del producto o carga automáticamente todos los modelos capturados del catálogo.
        </p>
        {onLoadAllProducts && (
          <button
            type="button"
            onClick={onLoadAllProducts}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>⚡ Cargar Catálogo Completo ({totalCatalogCount} Etiquetas)</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl p-5 md:p-6 shadow-xl flex flex-col gap-4">
      {/* Encabezado de la Cola */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Lote de Impresión
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {queue.length} {queue.length === 1 ? 'modelo' : 'modelos'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Total: <strong className="text-amber-400">{totalLabels} etiquetas</strong> (~{totalRollLengthMeters}m de rollo)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onLoadAllProducts && (
            <button
              type="button"
              onClick={onLoadAllProducts}
              title="Cargar o reponer todos los productos del catálogo"
              className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-800/40 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cargar Catálogo ({totalCatalogCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClearQueue}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-900/40 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar</span>
          </button>
        </div>
      </div>

      {/* Lista de Etiquetas en Cola */}
      <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto pr-1">
        {queue.map((item, index) => (
          <div
            key={item.id}
            className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
          >
            {/* Información del Producto */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-mono font-bold text-slate-500 w-5">
                #{index + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-200 truncate">
                    {item.color}
                  </h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                    {item.sku}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>${item.precio.toFixed(2)}</span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-slate-400 truncate">
                    {item.barcode}
                  </span>
                  <span>•</span>
                  <span className="text-[11px] text-slate-500 truncate">
                    {item.dimensiones}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones y Selector de Copias */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => onUpdateCopies(item.id, -1)}
                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-bold text-amber-400">
                  {item.copias}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateCopies(item.id, 1)}
                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => onSelectForEdit(item)}
                title="Cargar en editor"
                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                title="Eliminar de la cola"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botones de Acción de Lote */}
      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={onPrintBatch}
          className="py-2.5 px-4 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 active:scale-[0.98] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-950/40 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Lote ({totalLabels})</span>
        </button>

        <button
          type="button"
          onClick={onDownloadBatchPdf}
          disabled={isGeneratingPdf}
          className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] disabled:opacity-60 text-slate-100 font-semibold rounded-xl text-sm border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <FileDown className="w-4 h-4 text-sky-400" />
          <span>{isGeneratingPdf ? 'Creando PDF...' : 'PDF de Lote'}</span>
        </button>
      </div>
    </div>
  );
};
'@

[System.IO.File]::WriteAllText($batchQueueFile, $batchQueueCode, [System.Text.Encoding]::UTF8)
Write-Host "[OK] BatchQueue.tsx actualizado." -ForegroundColor Green

# 2. Update LabelForm.tsx
$labelFormCode = @'
import React, { useState } from 'react';
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
      {/* Encabezado del Formulario con Presets Rápidos */}
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

        {/* Buscador y Chips de Presets de Catálogo */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Modelos del Catálogo ({filteredPresets.length})
            </label>
            <div className="relative w-44">
              <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Buscar SKU / Color..."
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
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                  formData.sku === preset.sku
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700/80 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/30 shrink-0"
                  style={{ backgroundColor: preset.previewColor || '#b38f65' }}
                />
                <span className="font-mono text-[10px] text-amber-400/90">{preset.sku}</span>
                <span className="truncate max-w-[140px]">{preset.color}</span>
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

        {/* Acabado / Color */}
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            Color / Acabado Comercial
          </label>
          <input
            type="text"
            value={formData.color}
            onChange={(e) => onChange('color', e.target.value)}
            placeholder="Ej: Mármol blanco —— 白色大理石纹"
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
            placeholder="290 cm × 20 cm × 2.25 cm"
            className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
          />
        </div>

        {/* Precio por Pieza */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            Precio Unitario (MXN)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">$</span>
            <input
              type="number"
              step="0.50"
              value={formData.precio || ''}
              onChange={(e) => onChange('precio', parseFloat(e.target.value) || 0)}
              placeholder="158.00"
              className="w-full bg-slate-950 border border-slate-750 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold"
            />
          </div>
        </div>

        {/* Tiraje de Copias */}
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            Número de Etiquetas a Imprimir
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="50"
              value={formData.copias}
              onChange={(e) => onChange('copias', parseInt(e.target.value, 10))}
              className="flex-1 accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="w-12 text-center text-sm font-bold bg-slate-950 border border-slate-800 py-1.5 rounded-lg text-amber-400 font-mono">
              {formData.copias}
            </span>
          </div>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* Botones de Acción Primarios */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onAddToQueue}
          className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/50 text-slate-100 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-amber-400" />
          <span>Agregar a la Cola ({queueCount})</span>
        </button>

        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={isGeneratingPdf}
          className="py-3 px-4 bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          title="Descargar esta etiqueta como PDF 100x60mm"
        >
          <FileDown className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">PDF Individual</span>
        </button>

        <button
          type="button"
          onClick={onDirectPrint}
          className="py-3 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Ahora</span>
        </button>
      </div>
    </div>
  );
};
'@

[System.IO.File]::WriteAllText($labelFormFile, $labelFormCode, [System.Text.Encoding]::UTF8)
Write-Host "[OK] LabelForm.tsx actualizado." -ForegroundColor Green

# 3. Update App.tsx
$appCode = @'
import React, { useState } from 'react';
import { 
  Printer, 
  Layers, 
  Sparkles, 
  Flame,
  ShieldCheck
} from 'lucide-react';
import { LabelData, PresetProduct } from './types/label';
import { PRESET_PRODUCTS } from './data/presets';
import { LabelForm } from './components/LabelForm';
import { LabelPreviewCard } from './components/LabelPreviewCard';
import { BatchQueue } from './components/BatchQueue';
import { PrintContainer } from './components/PrintContainer';
import { exportCurrentLabelToPdf, exportBatchQueueToPdf } from './utils/pdfExport';

export default function App() {
  const initialProduct = PRESET_PRODUCTS[0] || {
    color: 'Mármol blanco —— 白色大理石纹',
    dimensiones: '290 cm × 20 cm × 2.25 cm',
    sku: 'LAM-01',
    barcode: '8809000018115',
    precio: 158.0,
  };

  // Estado del formulario actual
  const [formData, setFormData] = useState<LabelData>({
    id: 'current-edit',
    color: initialProduct.color,
    dimensiones: initialProduct.dimensiones,
    sku: initialProduct.sku,
    barcode: initialProduct.barcode,
    precio: initialProduct.precio,
    copias: 1,
  });

  // Estado de la cola de impresión por lotes
  const [queue, setQueue] = useState<LabelData[]>([]);

  const [printTarget, setPrintTarget] = useState<'single' | 'batch'>('single');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Mostrar mensaje toast temporal
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Manejar cambios en los campos del formulario
  const handleFormChange = (field: keyof LabelData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Cargar un preset del catálogo
  const handleApplyPreset = (preset: PresetProduct) => {
    setFormData((prev) => ({
      ...prev,
      color: preset.color,
      dimensiones: preset.dimensiones,
      sku: preset.sku,
      barcode: preset.barcode,
      precio: preset.precio,
    }));
    showToast(`Acabado "${preset.sku} - ${preset.color}" cargado`, 'info');
  };

  // Agregar etiqueta actual a la cola
  const handleAddToQueue = () => {
    if (!formData.color.trim()) {
      showToast('Ingresa el color o modelo antes de agregarlo', 'error');
      return;
    }

    const newItem: LabelData = {
      ...formData,
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    setQueue((prev) => [...prev, newItem]);
    showToast(`"${formData.color}" (${formData.copias} copias) agregado a la cola`, 'success');
  };

  // Cargar todos los productos de PRESET_PRODUCTS a la cola
  const handleLoadAllProducts = () => {
    const allLabels: LabelData[] = PRESET_PRODUCTS.map((p, idx) => ({
      id: `batch-${p.sku}-${idx}`,
      color: p.color,
      dimensiones: p.dimensiones,
      sku: p.sku,
      barcode: p.barcode,
      precio: p.precio,
      copias: 1,
    }));
    setQueue(allLabels);
    showToast(`¡Se cargaron todos los ${allLabels.length} productos a la cola de etiquetas!`, 'success');
  };

  // Modificar copias de un item en cola
  const handleUpdateCopies = (id: string, delta: number) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newCopies = Math.max(1, (item.copias || 1) + delta);
          return { ...item, copias: newCopies };
        }
        return item;
      })
    );
  };

  // Eliminar un item de la cola
  const handleRemoveFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    showToast('Elemento removido de la cola', 'info');
  };

  // Vaciar toda la cola
  const handleClearQueue = () => {
    if (window.confirm('¿Seguro que deseas vaciar toda la cola de impresión?')) {
      setQueue([]);
      showToast('Cola de impresión vaciada', 'info');
    }
  };

  // Cargar item de la cola al formulario para editar
  const handleSelectForEdit = (item: LabelData) => {
    setFormData({
      ...item,
      id: 'current-edit',
    });
    showToast(`Cargado "${item.color}" en el editor`, 'info');
  };

  // Limpiar formulario a valores por defecto
  const handleResetForm = () => {
    setFormData({
      id: 'current-edit',
      color: '',
      dimensiones: '290 cm × 20 cm × 2.25 cm',
      sku: '',
      barcode: '',
      precio: 0,
      copias: 1,
    });
    showToast('Formulario restablecido', 'info');
  };

  // 1. Impresión Directa de la Etiqueta Actual
  const handleDirectPrintSingle = () => {
    setPrintTarget('single');
    showToast('Abriendo cuadro de diálogo de impresión...', 'info');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // 2. Impresión Directa del Lote Completo
  const handleDirectPrintBatch = () => {
    if (queue.length === 0) {
      showToast('No hay etiquetas en la cola para imprimir', 'error');
      return;
    }
    setPrintTarget('batch');
    const total = queue.reduce((sum, item) => sum + (item.copias || 1), 0);
    showToast(`Preparando impresión de ${total} etiquetas del lote...`, 'info');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // 3. Descargar PDF de Etiqueta Actual
  const handleDownloadSinglePdf = async () => {
    try {
      setIsGeneratingPdf(true);
      showToast('Generando documento PDF de 100mm × 60mm...', 'info');
      await exportCurrentLabelToPdf('preview-label-render', formData);
      showToast('¡PDF generado y descargado con éxito!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Ocurrió un error al generar el PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 4. Descargar PDF del Lote Completo
  const handleDownloadBatchPdf = async () => {
    if (queue.length === 0) {
      showToast('No hay etiquetas en la cola', 'error');
      return;
    }
    try {
      setIsGeneratingPdf(true);
      showToast('Procesando páginas del lote para PDF...', 'info');
      await exportBatchQueueToPdf('batch-offscreen-container', queue);
      showToast('¡PDF de lote descargado con éxito!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Ocurrió un error al generar el PDF del lote', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* BARRA SUPERIOR (NO-PRINT) */}
      <header className="no-print sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-900/30">
              <Flame className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight font-['Outfit'] text-slate-100">
                  VISOZR <span className="text-amber-400">ETIQUETAS</span>
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Térmico PDV
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Formato Estándar: 100mm × 60mm (10×6cm) • Papel Autoadherible • WPC Bajío
              </p>
            </div>
          </div>

          {/* Estado de conexión de impresora e información */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Calibración: <strong>@page 100×60mm</strong></span>
            </div>

            <button
              type="button"
              onClick={handleDirectPrintSingle}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden xs:inline">Imprimir Ahora</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL (NO-PRINT) */}
      <main className="no-print flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Banner de Consejos para Impresión Térmica */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs sm:text-sm text-amber-200/90">
          <div className="p-1 rounded bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
            <Printer className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <strong className="text-amber-300 font-semibold">Consejo para Impresora Térmica (Zebra, Xprinter, TSC, Bixolon, Rollo):</strong>{' '}
            En el diálogo del navegador, selecciona tamaño de papel <strong>100×60mm (o 4×2.36 pulg)</strong>, márgenes en <strong>"Ninguno"</strong> y activa la casilla <strong>"Gráficos en segundo plano"</strong>.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Columna Izquierda: Formulario de Captura de Datos */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            <LabelForm
              formData={formData}
              onChange={handleFormChange}
              onApplyPreset={handleApplyPreset}
              onAddToQueue={handleAddToQueue}
              onDirectPrint={handleDirectPrintSingle}
              onDownloadPdf={handleDownloadSinglePdf}
              onReset={handleResetForm}
              isGeneratingPdf={isGeneratingPdf}
              queueCount={queue.length}
            />
          </section>

          {/* Columna Derecha: Live Preview y Cola de Impresión */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            {/* 1. Vista Previa en Vivo */}
            <LabelPreviewCard
              data={formData}
              labelElementId="preview-label-render"
            />

            {/* 2. Cola de Impresión por Lotes */}
            <BatchQueue
              queue={queue}
              onRemoveItem={handleRemoveFromQueue}
              onUpdateCopies={handleUpdateCopies}
              onClearQueue={handleClearQueue}
              onSelectForEdit={handleSelectForEdit}
              onPrintBatch={handleDirectPrintBatch}
              onDownloadBatchPdf={handleDownloadBatchPdf}
              onLoadAllProducts={handleLoadAllProducts}
              isGeneratingPdf={isGeneratingPdf}
              totalCatalogCount={PRESET_PRODUCTS.length}
            />
          </section>
        </div>
      </main>

      {/* CONTENEDOR DE IMPRESIÓN Y EXPORTACIÓN */}
      <PrintContainer
        currentLabel={formData}
        queue={queue}
        printTarget={printTarget}
      />

      {/* TOAST DE NOTIFICACIONES */}
      {toast && (
        <div className="no-print fixed bottom-5 right-5 z-50 animate-bounce">
          <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-semibold shadow-2xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
'@

[System.IO.File]::WriteAllText($appFile, $appCode, [System.Text.Encoding]::UTF8)
Write-Host "[OK] App.tsx actualizado." -ForegroundColor Green
