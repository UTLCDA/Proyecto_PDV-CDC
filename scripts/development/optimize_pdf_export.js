const fs = require('fs');
const filePath = 'D:/Visozr Etiquetas/src/utils/pdfExport.ts';

const content = `import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { LabelData } from '../types/label';

/**
 * Renderiza un elemento HTML a PNG en alta definición usando html-to-image
 * Con skipFonts: true para evitar bloqueos por CORS de hojas de estilo externas (Google Fonts)
 */
async function renderElementToImage(el: HTMLElement): Promise<string> {
  return await toPng(el, {
    pixelRatio: 2,
    backgroundColor: '#FEE2B8',
    skipFonts: true,
    cacheBust: false,
  });
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
    // Ceder control al navegador brevemente
    await new Promise(r => setTimeout(r, 5));
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
    
    // Notificar avance por página
    if (onProgress && (i % labelsPerPage === 0 || i === totalLabels - 1)) {
      const pageNum = Math.floor(i / labelsPerPage) + 1;
      onProgress(pageNum, totalPages);
      // Ceder brevemente al navegador para actualizar la UI del Toast
      await new Promise(r => setTimeout(r, 10));
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

    pdf.addImage(imgData, 'PNG', x, y, labelWidth, labelHeight, undefined, 'FAST');

    // Guía de corte punteada sutil
    pdf.setDrawColor(195, 185, 175);
    pdf.setLineDashPattern([1.5, 1.5], 0);
    pdf.setLineWidth(0.18);
    pdf.rect(x, y, labelWidth, labelHeight);

    // Encabezado y pie de página
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

fs.writeFileSync(filePath, content, 'utf8');
console.log('[OK] pdfExport.ts optimizado exitosamente.');
