const fs = require('fs');
const path = require('path');

const baseDir = 'D:/Visozr Etiquetas/src';

// ==========================================
// 1. pdfExport.ts (Soporte de PDF Carta 8 por hoja + Rollo Térmico)
// ==========================================
const pdfExportContent = `import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { LabelData } from '../types/label';

/**
 * Renderiza un elemento HTML a imagen base64 en alta definición (DPI 300+)
 */
async function renderElementToImage(el: HTMLElement): Promise<string> {
  const canvas = await html2canvas(el, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#FEE2B8',
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

/**
 * Exporta la etiqueta actual visible de la vista previa (100mm x 60mm)
 */
export async function exportCurrentLabelToPdf(
  elementId: string,
  data: LabelData
): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) {
    throw new Error('No se encontró el elemento de la etiqueta');
  }

  const cleanSku = (data.sku || 'etiqueta').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = \`Etiqueta_\${cleanSku}_100x60mm.pdf\`;
  const copies = Math.max(1, data.copias || 1);

  const imgData = await renderElementToImage(el);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [60, 100],
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < copies; i++) {
    if (i > 0) {
      pdf.addPage([60, 100], 'landscape');
    }
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  }

  pdf.save(filename);
}

/**
 * Exporta el lote en formato continuo de rollo térmico individual (100mm x 60mm por página)
 */
export async function exportBatchQueueToPdf(
  containerElementId: string,
  queue: LabelData[]
): Promise<void> {
  const container = document.getElementById(containerElementId);
  if (!container) {
    throw new Error('No se encontró el contenedor del lote');
  }

  const items = container.querySelectorAll<HTMLElement>('[data-batch-item]');
  if (items.length === 0) {
    throw new Error('No hay elementos para exportar');
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [60, 100],
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  let isFirstPage = true;

  for (let i = 0; i < items.length; i++) {
    const itemEl = items[i];
    const copies = parseInt(itemEl.getAttribute('data-copies') || '1', 10);
    const imgData = await renderElementToImage(itemEl);

    for (let c = 0; c < copies; c++) {
      if (!isFirstPage) {
        pdf.addPage([60, 100], 'landscape');
      }
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      isFirstPage = false;
    }
  }

  const nowStr = new Date().toISOString().slice(0, 10);
  pdf.save(\`Lote_Termico_\${nowStr}_100x60mm.pdf\`);
}

/**
 * Exporta el lote completo organizado en Hojas Tamaño Carta (Letter: 215.9mm x 279.4mm)
 * Acomodando exactamente 8 etiquetas por hoja (2 columnas x 4 filas)
 * con márgenes seguros y guías de corte sutiles.
 */
export async function exportBatchQueueToLetterPdf(
  containerElementId: string,
  queue: LabelData[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const container = document.getElementById(containerElementId);
  if (!container) {
    throw new Error('No se encontró el contenedor del lote');
  }

  const items = container.querySelectorAll<HTMLElement>('[data-batch-item]');
  if (items.length === 0) {
    throw new Error('No hay elementos para exportar');
  }

  // Geometría para hoja tamaño carta (215.9mm x 279.4mm):
  // 2 columnas x 4 filas = 8 etiquetas (100mm x 60mm)
  // Ancho: 6mm margen izq + 100mm col1 + 3.9mm gap + 100mm col2 + 6mm margen der = 215.9mm
  // Alto: 14mm margen sup + 4 x 60mm + 3 x 3.8mm gap + 14mm margen inf = 279.4mm
  const colPositions = [6.0, 109.9];
  const rowPositions = [14.0, 77.8, 141.6, 205.4];
  const labelWidth = 100.0;
  const labelHeight = 60.0;
  const labelsPerPage = 8;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  // Lista expandida según copias
  const expandedList: HTMLElement[] = [];
  items.forEach((itemEl) => {
    const copies = parseInt(itemEl.getAttribute('data-copies') || '1', 10);
    for (let c = 0; c < copies; c++) {
      expandedList.push(itemEl);
    }
  });

  const totalLabels = expandedList.length;
  const totalPages = Math.ceil(totalLabels / labelsPerPage);
  const imageCache = new Map<HTMLElement, string>();

  let currentSlot = 0;
  let currentPage = 1;

  for (let i = 0; i < totalLabels; i++) {
    const itemEl = expandedList[i];
    if (onProgress) {
      onProgress(i + 1, totalLabels);
    }

    let imgData = imageCache.get(itemEl);
    if (!imgData) {
      imgData = await renderElementToImage(itemEl);
      imageCache.set(itemEl, imgData);
    }

    const slotIndex = currentSlot % labelsPerPage;
    if (currentSlot > 0 && slotIndex === 0) {
      pdf.addPage('letter', 'portrait');
      currentPage++;
    }

    const colIndex = slotIndex % 2;
    const rowIndex = Math.floor(slotIndex / 2);
    const x = colPositions[colIndex];
    const y = rowPositions[rowIndex];

    // Colocar imagen de la etiqueta
    pdf.addImage(imgData, 'PNG', x, y, labelWidth, labelHeight, undefined, 'FAST');

    // Guía de corte punteada sutil
    pdf.setDrawColor(195, 185, 175);
    pdf.setLineDashPattern([1.5, 1.5], 0);
    pdf.setLineWidth(0.18);
    pdf.rect(x, y, labelWidth, labelHeight);

    // Encabezado y pie de página en cada hoja carta
    if (slotIndex === 0) {
      pdf.setFontSize(7.5);
      pdf.setTextColor(120, 110, 100);
      pdf.text('WPC BAJÍO • PLANILLA DE ETIQUETAS TAMAÑO CARTA (8 ETIQUETAS POR HOJA • 100mm × 60mm)', 107.95, 9.0, { align: 'center' });
      pdf.text(\`Página \${currentPage} de \${totalPages} • Líneas punteadas indican guías de corte con regla o guillotina\`, 107.95, 273.5, { align: 'center' });
    }

    currentSlot++;
  }

  const nowStr = new Date().toISOString().slice(0, 10);
  pdf.save(\`Planilla_Carta_WPCBajio_\${totalLabels}_Etiquetas_\${nowStr}.pdf\`);
}
`;

// ==========================================
// 2. index.css (Soporte CSS Print Carta + Térmico)
// ==========================================
const indexCssContent = `@import "tailwindcss";

@media print {
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }

  /* Ocultar interfaz en papel */
  .no-print {
    display: none !important;
  }

  .print-only {
    display: block !important;
    position: static !important;
    visibility: visible !important;
  }

  /* MODO 1: PLANILLA TAMAÑO CARTA (8 etiquetas por hoja, 2x4) */
  body.print-letter-mode {
    width: 215.9mm !important;
    height: auto !important;
  }

  body.print-letter-mode .print-letter-page {
    width: 215.9mm !important;
    height: 279.4mm !important;
    max-width: 215.9mm !important;
    max-height: 279.4mm !important;
    padding: 14mm 6mm !important;
    box-sizing: border-box !important;
    page-break-after: always !important;
    break-after: page !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: grid !important;
    grid-template-columns: 100mm 100mm !important;
    grid-template-rows: repeat(4, 60mm) !important;
    column-gap: 3.9mm !important;
    row-gap: 3.8mm !important;
    justify-content: center !important;
    align-content: center !important;
    background: #ffffff !important;
    overflow: hidden !important;
  }

  body.print-letter-mode .print-letter-item {
    width: 100mm !important;
    height: 60mm !important;
    box-sizing: border-box !important;
    outline: 1px dashed #c4b5a0 !important;
    outline-offset: -1px !important;
    overflow: hidden !important;
  }

  /* MODO 2: ROLLO TÉRMICO CONTINUO (100mm x 60mm) */
  body.print-thermal-mode {
    width: 100mm !important;
    height: auto !important;
  }

  body.print-thermal-mode .print-thermal-page {
    width: 100mm !important;
    height: 60mm !important;
    max-width: 100mm !important;
    max-height: 60mm !important;
    page-break-after: always !important;
    break-after: page !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }
}

@media screen {
  .print-only {
    display: none !important;
  }
}

.thermal-shadow {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
}

.wood-pattern {
  background-color: #1e293b;
  background-image: radial-gradient(rgba(245, 158, 11, 0.08) 1px, transparent 0);
  background-size: 24px 24px;
}
`;

// ==========================================
// 3. PrintContainer.tsx (Renderiza en Hojas Carta o Rollo)
// ==========================================
const printContainerContent = `import React from 'react';
import { LabelData } from '../types/label';
import { ThermalLabel } from './ThermalLabel';

interface PrintContainerProps {
  currentLabel: LabelData;
  queue: LabelData[];
  printTarget: 'single' | 'batch';
  printMode?: 'letter' | 'thermal';
}

export const PrintContainer: React.FC<PrintContainerProps> = ({
  currentLabel,
  queue,
  printTarget,
  printMode = 'letter',
}) => {
  const labelsToPrint: LabelData[] = [];

  if (printTarget === 'single') {
    const count = Math.max(1, currentLabel.copias || 1);
    for (let i = 0; i < count; i++) {
      labelsToPrint.push({
        ...currentLabel,
        id: \`print-single-\${i}\`,
      });
    }
  } else {
    queue.forEach((item, itemIdx) => {
      const count = Math.max(1, item.copias || 1);
      for (let c = 0; c < count; c++) {
        labelsToPrint.push({
          ...item,
          id: \`print-batch-\${itemIdx}-\${c}\`,
        });
      }
    });
  }

  // Si se imprime en Hoja Tamaño Carta (Letter)
  if (printMode === 'letter') {
    const chunkSize = 8;
    const letterPages: LabelData[][] = [];
    for (let i = 0; i < labelsToPrint.length; i += chunkSize) {
      letterPages.push(labelsToPrint.slice(i, i + chunkSize));
    }

    return (
      <div className="print-only" id="thermal-print-container">
        {letterPages.map((pageLabels, pageIdx) => (
          <div key={\`letter-page-\${pageIdx}\`} className="print-letter-page">
            {pageLabels.map((label, labelIdx) => (
              <div key={\`\${label.id}-\${labelIdx}\`} className="print-letter-item">
                <ThermalLabel data={label} isPrintVersion />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Si se imprime en Rollo Térmico continuo
  return (
    <div className="print-only" id="thermal-print-container">
      {labelsToPrint.map((label, index) => (
        <div key={\`\${label.id}-\${index}\`} className="print-thermal-page">
          <ThermalLabel data={label} isPrintVersion />
        </div>
      ))}
    </div>
  );
};
`;

// ==========================================
// 4. BatchQueue.tsx (Botones Carta destacados y Rollo)
// ==========================================
const batchQueueContent = `import React from 'react';
import { 
  Trash2, 
  Printer, 
  FileDown, 
  Layers, 
  Edit3, 
  Sparkles,
  FileText,
  Tag
} from 'lucide-react';
import { LabelData } from '../types/label';

interface BatchQueueProps {
  queue: LabelData[];
  onRemoveItem: (id: string) => void;
  onUpdateCopies: (id: string, delta: number) => void;
  onClearQueue: () => void;
  onSelectForEdit: (item: LabelData) => void;
  onPrintBatchLetter: () => void;
  onDownloadBatchPdfLetter: () => void;
  onPrintBatchThermal: () => void;
  onDownloadBatchPdfThermal: () => void;
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
  onPrintBatchLetter,
  onDownloadBatchPdfLetter,
  onPrintBatchThermal,
  onDownloadBatchPdfThermal,
  onLoadAllProducts,
  isGeneratingPdf,
  totalCatalogCount = 104,
}) => {
  const totalLabels = queue.reduce((sum, item) => sum + (item.copias || 1), 0);
  const totalLetterPages = Math.ceil(totalLabels / 8);
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
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
              <span>Total: <strong className="text-amber-400 font-bold">{totalLabels} etiquetas</strong></span>
              <span className="text-slate-600">•</span>
              <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-semibold">
                📄 {totalLetterPages} hojas tamaño Carta (8 por hoja)
              </span>
              <span className="text-slate-600">•</span>
              <span>🏷️ {totalRollLengthMeters}m de rollo térmico</span>
            </div>
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
      <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
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

      {/* SECCIÓN 1: PLANILLAS TAMAÑO CARTA (8 por hoja - Recomendado) */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
              Impresión en Hoja Tamaño Carta ({totalLetterPages} páginas • 8 por hoja)
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Con Guías de Corte
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <button
            type="button"
            onClick={onDownloadBatchPdfLetter}
            disabled={isGeneratingPdf}
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black py-3 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <FileDown className="w-4 h-4 text-slate-950" />
            <span>{isGeneratingPdf ? 'Generando PDF...' : \`📄 Descargar PDF Carta (\${totalLetterPages} Hojas)\`}</span>
          </button>

          <button
            type="button"
            onClick={onPrintBatchLetter}
            className="bg-slate-800 hover:bg-slate-750 text-amber-300 font-bold py-3 px-4 rounded-xl border border-amber-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ Imprimir en Carta</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN 2: ROLLO TÉRMICO CONTINUO (100mm x 60mm) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
        <span className="text-slate-400 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-slate-500" />
          ¿Tienes impresora térmica de rollo continuo autoadherible?
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrintBatchThermal}
            className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Rollo</span>
          </button>

          <button
            type="button"
            onClick={onDownloadBatchPdfThermal}
            disabled={isGeneratingPdf}
            className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>PDF Rollo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
`;

// ==========================================
// 5. LabelPreviewCard.tsx (Con modo vista previa Carta 8x)
// ==========================================
const labelPreviewCardContent = `import React, { useState } from 'react';
import { 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  Ruler,
  FileText,
  Tag
} from 'lucide-react';
import { LabelData } from '../types/label';
import { ThermalLabel } from './ThermalLabel';
import { PRESET_PRODUCTS } from '../data/presets';

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
  const [viewFormat, setViewFormat] = useState<'single' | 'letter'>('single');

  // Muestra de 8 productos para la vista previa de hoja carta
  const sampleLetterLabels: LabelData[] = [
    data,
    ...(PRESET_PRODUCTS.slice(1, 8).map((p, i) => ({
      id: \`sample-\${i}\`,
      color: p.color,
      dimensiones: p.dimensiones,
      sku: p.sku,
      barcode: p.barcode,
      precio: p.precio,
      copias: 1,
    }))),
  ].slice(0, 8);

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
              {viewFormat === 'single'
                ? 'Formato Térmico Estándar 100mm x 60mm a escala exacta'
                : 'Planilla Tamaño Carta (215.9 x 279.4 mm • 8 etiquetas por hoja)'}
            </p>
          </div>
        </div>

        {/* Selector de Modo de Vista (Individual vs Hoja Carta) */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setViewFormat('single')}
            className={\`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer \${
              viewFormat === 'single'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }\`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>100×60mm</span>
          </button>

          <button
            type="button"
            onClick={() => setViewFormat('letter')}
            className={\`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer \${
              viewFormat === 'letter'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }\`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Hoja Carta (8x)</span>
          </button>

          <div className="h-4 w-px bg-slate-800 my-auto" />

          {/* Zoom */}
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.max(0.4, +(prev - 0.15).toFixed(2)))}
            disabled={zoomLevel <= 0.4}
            title="Reducir zoom"
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-mono font-semibold text-slate-300 px-1 w-10 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.min(2.0, +(prev + 0.15).toFixed(2)))}
            disabled={zoomLevel >= 2.0}
            title="Aumentar zoom"
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contenedor Visual de la Etiqueta / Hoja */}
      <div className="wood-pattern rounded-xl p-4 sm:p-6 flex items-center justify-center min-h-[380px] overflow-auto relative border border-slate-800/80 shadow-inner">
        {viewFormat === 'single' ? (
          // Vista Individual 100mm x 60mm
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
        ) : (
          // Vista Hoja Carta Completa (215.9 x 279.4 mm a escala)
          <div
            style={{
              transform: \`scale(\${zoomLevel * 0.42})\`,
              transformOrigin: 'center center',
              width: '215.9mm',
              height: '279.4mm',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              borderRadius: '2mm',
              padding: '14mm 6mm',
              boxSizing: 'border-box',
              display: 'grid',
              gridTemplateColumns: '100mm 100mm',
              gridTemplateRows: 'repeat(4, 60mm)',
              columnGap: '3.9mm',
              rowGap: '3.8mm',
              justifyContent: 'center',
              alignContent: 'center',
              color: '#1f2937',
              position: 'relative',
            }}
            className="shrink-0"
          >
            <div className="absolute top-2 left-0 right-0 text-center text-[7pt] text-gray-500 font-mono">
              WPC BAJÍO • PLANILLA DE ETIQUETAS TAMAÑO CARTA (8 ETIQUETAS POR HOJA • 100mm × 60mm)
            </div>
            {sampleLetterLabels.map((sampleItem, i) => (
              <div
                key={i}
                style={{
                  width: '100mm',
                  height: '60mm',
                  outline: '1px dashed #c4b5a0',
                  outlineOffset: '-1px',
                }}
              >
                <ThermalLabel data={sampleItem} isPrintVersion />
              </div>
            ))}
            <div className="absolute bottom-2 left-0 right-0 text-center text-[7pt] text-gray-500 font-mono">
              Líneas punteadas indican guías de corte con regla o guillotina
            </div>
          </div>
        )}
      </div>

      {/* Ficha técnica */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Formato Papel</span>
          <span className="font-semibold text-amber-300">Carta (8 etiquetas)</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Dim. Etiqueta</span>
          <span className="font-semibold text-slate-200">100 x 60 mm</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Guías de Corte</span>
          <span className="font-semibold text-emerald-400">Borde punteado</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Impresoras</span>
          <span className="font-semibold text-slate-200">Láser, Inyección o Térmica</span>
        </div>
      </div>
    </div>
  );
};
`;

// ==========================================
// 6. App.tsx (Integración de modos de impresión y handlers)
// ==========================================
const appContent = `import React, { useState } from 'react';
import { 
  Printer, 
  Sparkles, 
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
import { 
  exportCurrentLabelToPdf, 
  exportBatchQueueToPdf, 
  exportBatchQueueToLetterPdf 
} from './utils/pdfExport';
import { ThermalLabel } from './components/ThermalLabel';
import wpcLogo from './assets/wpc-bajio-logo.jpg';

export const App: React.FC = () => {
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
  const [printMode, setPrintMode] = useState<'letter' | 'thermal'>('letter');
  
  // Estado para diálogos y notificaciones rápidas
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleFieldChange = (field: keyof LabelData, value: any) => {
    setLabelData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

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
    const pages = Math.ceil(fullCatalogQueue.length / 8);
    showToast(\`¡\${fullCatalogQueue.length} etiquetas cargadas (\${pages} hojas tamaño carta)!\`, 'success');
  };

  const handleAddToQueue = () => {
    const newItem: LabelData = {
      ...labelData,
      id: \`queue-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
    };

    setQueue((prev) => [...prev, newItem]);
    showToast(\`Modelo \${labelData.sku} agregado a la cola (\${labelData.copias} copias)\`, 'success');
  };

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

  const handleRemoveFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    showToast('Etiqueta eliminada de la cola', 'info');
  };

  const handleClearQueue = () => {
    if (window.confirm('¿Seguro que deseas vaciar toda la cola de impresión?')) {
      setQueue([]);
      showToast('Cola de impresión vaciada', 'info');
    }
  };

  const handleSelectForEdit = (item: LabelData) => {
    setLabelData({
      ...item,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(\`Editando \${item.sku}\`, 'info');
  };

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

  // 1. Impresión Directa Individual
  const handleDirectPrint = () => {
    setPrintTarget('single');
    setPrintMode('thermal');
    document.body.className = 'print-thermal-mode';
    showToast('Abriendo cuadro de diálogo de impresión...', 'info');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // 2. Descarga PDF Individual
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

  // 3. Impresión en Hoja Tamaño Carta (8 por hoja)
  const handlePrintBatchLetter = () => {
    if (queue.length === 0) {
      showToast('La cola de impresión está vacía', 'error');
      return;
    }
    const total = queue.reduce((sum, i) => sum + (i.copias || 1), 0);
    const pages = Math.ceil(total / 8);
    setPrintTarget('batch');
    setPrintMode('letter');
    document.body.className = 'print-letter-mode';
    showToast(\`Preparando \${pages} hojas tamaño carta (\${total} etiquetas)...\`, 'info');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // 4. Descarga PDF Hoja Tamaño Carta (8 por hoja)
  const handleDownloadBatchPdfLetter = async () => {
    if (queue.length === 0) {
      showToast('La cola de impresión está vacía', 'error');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      showToast('Generando documento PDF en tamaño Carta (8 etiquetas por hoja)...', 'info');
      await exportBatchQueueToLetterPdf('batch-export-container', queue);
      showToast('¡PDF tamaño Carta generado y descargado con éxito!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Ocurrió un error al generar el PDF en hoja carta', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 5. Impresión en Rollo Térmico Continuo
  const handlePrintBatchThermal = () => {
    if (queue.length === 0) {
      showToast('La cola de impresión está vacía', 'error');
      return;
    }
    const total = queue.reduce((sum, i) => sum + (i.copias || 1), 0);
    setPrintTarget('batch');
    setPrintMode('thermal');
    document.body.className = 'print-thermal-mode';
    showToast(\`Preparando impresión de \${total} etiquetas térmicas en rollo...\`, 'info');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // 6. Descarga PDF Rollo Térmico Continuo
  const handleDownloadBatchPdfThermal = async () => {
    if (queue.length === 0) {
      showToast('La cola de impresión está vacía', 'error');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      showToast('Generando PDF para rollo térmico continuo (100mm x 60mm)...', 'info');
      await exportBatchQueueToPdf('batch-export-container', queue);
      showToast('¡PDF de rollo térmico descargado con éxito!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Ocurrió un error al generar el PDF del lote térmico', 'error');
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
                  Generador de Etiquetas
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Formatos: Hoja Tamaño Carta (8 por hoja) y Rollo Térmico 100mm × 60mm
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
            onPrintBatchLetter={handlePrintBatchLetter}
            onDownloadBatchPdfLetter={handleDownloadBatchPdfLetter}
            onPrintBatchThermal={handlePrintBatchThermal}
            onDownloadBatchPdfThermal={handleDownloadBatchPdfThermal}
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
        printMode={printMode}
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

// Escribir los archivos actualizados con pure UTF-8
fs.writeFileSync(path.join(baseDir, 'utils/pdfExport.ts'), pdfExportContent, 'utf8');
console.log('[OK] utils/pdfExport.ts actualizado con exportBatchQueueToLetterPdf');

fs.writeFileSync(path.join(baseDir, 'index.css'), indexCssContent, 'utf8');
console.log('[OK] index.css actualizado con estilos @media print para Hoja Carta');

fs.writeFileSync(path.join(baseDir, 'components/PrintContainer.tsx'), printContainerContent, 'utf8');
console.log('[OK] PrintContainer.tsx actualizado para agrupar en páginas de 8 etiquetas');

fs.writeFileSync(path.join(baseDir, 'components/BatchQueue.tsx'), batchQueueContent, 'utf8');
console.log('[OK] BatchQueue.tsx actualizado con acciones destacadas para Hoja Carta');

fs.writeFileSync(path.join(baseDir, 'components/LabelPreviewCard.tsx'), labelPreviewCardContent, 'utf8');
console.log('[OK] LabelPreviewCard.tsx actualizado con preview de Hoja Carta (8x)');

fs.writeFileSync(path.join(baseDir, 'App.tsx'), appContent, 'utf8');
console.log('[OK] App.tsx actualizado con soporte completo de Hoja Carta');

console.log('=== Implementación de Hoja Carta completada con éxito ===');
