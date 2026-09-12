const fs = require('fs');
const path = require('path');

const baseDir = 'D:/Visozr Etiquetas/src';

// ==========================================
// 1. ThermalLabel.tsx (Colores explícitos RGBA/HEX sin Tailwind opacity mix)
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
  const formattedPrice = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(data.precio || 0);

  const cleanDimensions = (data.dimensiones || '290 cm x 16 cm x 2.2 cm')
    .replace(/\\u00D7/g, 'x');

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
          backgroundColor: '#FEE2B8',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 1. ENCABEZADO: Logo + WPC Bajío */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid rgba(58, 35, 18, 0.2)',
            paddingBottom: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src={wpcBajioLogo}
              alt="Logo WPC Bajío"
              style={{
                width: '8.5mm',
                height: '8.5mm',
                borderRadius: '9999px',
                objectFit: 'cover',
                border: '1px solid rgba(58, 35, 18, 0.3)',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                letterSpacing: '0.05em',
                color: '#3A2312',
                fontWeight: 900,
                fontFamily: "'Outfit', sans-serif",
                fontSize: '13.5pt',
                lineHeight: 1,
              }}
            >
              WPC Bajío
            </span>
          </div>
        </div>

        {/* 2. CUERPO CENTRAL: COLOR, DIMENSIONES Y SKU */}
        <div style={{ margin: 'auto 0', padding: '3px 0', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {/* Fila Color: Multilínea sin cortes */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <span
              style={{
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                color: 'rgba(58, 35, 18, 0.8)',
                flexShrink: 0,
                paddingTop: '2px',
                fontSize: '7.5pt',
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
                maxHeight: '18mm',
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
              }}
            >
              {data.sku || 'LAM-000-00'}
            </span>
          </div>
        </div>

        {/* 3. PIE INFERIOR (FOOTER): Código de barras (izq) y Precio (der) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingTop: '3px',
            borderTop: '1px solid rgba(58, 35, 18, 0.2)',
          }}
        >
          {/* Izquierda: Código de barras */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '58%', overflow: 'hidden' }}>
            <span
              style={{
                fontSize: '6pt',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: 'rgba(58, 35, 18, 0.7)',
                lineHeight: 1,
                marginBottom: '3px',
              }}
            >
              CÓDIGO DE BARRAS
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: '#3A2312',
                lineHeight: 1.1,
                fontSize: '12pt',
              }}
            >
              {data.barcode || '000000000000'}
            </span>
          </div>

          {/* Derecha: Bloque de precio con IVA */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingLeft: '4px', flexShrink: 0 }}>
            <span
              style={{
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'rgba(58, 35, 18, 0.8)',
                lineHeight: 1,
                fontSize: '6pt',
              }}
            >
              PRECIO P/PZA
            </span>
            <span
              style={{
                fontWeight: 900,
                fontFamily: "'Outfit', sans-serif",
                color: '#3A2312',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                margin: '2px 0',
                fontSize: '15pt',
              }}
            >
              {formattedPrice}
            </span>
            <span
              style={{
                fontSize: '5.5pt',
                fontWeight: 700,
                color: 'rgba(58, 35, 18, 0.75)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                lineHeight: 1,
              }}
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
// 2. pdfExport.ts (Basado en html-to-image)
// ==========================================
const pdfExportContent = `import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { LabelData } from '../types/label';

/**
 * Renderiza un elemento HTML a imagen base64 en alta definición usando html-to-image
 * (100% compatible con CSS Color 4, oklch y Tailwind v4)
 */
async function renderElementToImage(el: HTMLElement): Promise<string> {
  return await toPng(el, {
    pixelRatio: 2.2,
    backgroundColor: '#FEE2B8',
    cacheBust: true,
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

  // Expandir cola considerando número de copias
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

// ==========================================
// 3. App.tsx (batch-export-container visible para html-to-image pero fuera de pantalla)
// ==========================================
const appFilePath = path.join(baseDir, 'App.tsx');
let appContent = fs.readFileSync(appFilePath, 'utf8');

// Actualizar el contenedor oculto para que no tenga opacity: 0
appContent = appContent.replace(
  /<div\s+id="batch-export-container"[\s\S]*?className="thermal-label-container"/m,
  '<div id="batch-export-container"'
);

// Reemplazar la sección del batch-export-container en App.tsx
const exportContainerRegex = /\{\/\* Contenedor Oculto para Renderizado de PDF por Lote \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*\);\s*};\s*export default App;/;
const newExportContainerBlock = `{/* Contenedor Oculto para Renderizado de PDF por Lote (Visible para html-to-image pero fuera de pantalla) */}
      <div
        id="batch-export-container"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '100mm',
          pointerEvents: 'none',
          zIndex: -999,
        }}
      >
        {queue.map((item) => (
          <div
            key={item.id}
            data-batch-item
            data-copies={item.copias || 1}
            style={{ width: '100mm', height: '60mm', overflow: 'hidden', marginBottom: '10px' }}
          >
            <ThermalLabel data={item} isPrintVersion />
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;`;

if (appContent.match(exportContainerRegex)) {
  appContent = appContent.replace(exportContainerRegex, newExportContainerBlock);
}

// Actualizar handleDownloadBatchPdfLetter con reporte de progreso
const oldHandler = /const handleDownloadBatchPdfLetter = async \(\) => \{[\s\S]*?finally \{\s*setIsGeneratingPdf\(false\);\s*\}\s*\};/;
const newHandler = `const handleDownloadBatchPdfLetter = async () => {
    if (queue.length === 0) {
      showToast('La cola de impresión está vacía', 'error');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      showToast('Iniciando procesamiento de hoja Carta (8 etiquetas por hoja)...', 'info');
      await exportBatchQueueToLetterPdf('batch-export-container', queue, (curr, tot) => {
        showToast(\`Generando hoja Carta \${curr} de \${tot}...\`, 'info');
      });
      showToast('¡PDF de 13 hojas Carta descargado con éxito!', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || 'Ocurrió un error al generar el PDF en hoja carta', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };`;

if (appContent.match(oldHandler)) {
  appContent = appContent.replace(oldHandler, newHandler);
}

fs.writeFileSync(path.join(baseDir, 'components/ThermalLabel.tsx'), thermalLabelContent, 'utf8');
console.log('[OK] ThermalLabel.tsx actualizado con estilos inline seguros');

fs.writeFileSync(path.join(baseDir, 'utils/pdfExport.ts'), pdfExportContent, 'utf8');
console.log('[OK] utils/pdfExport.ts actualizado con html-to-image');

fs.writeFileSync(appFilePath, appContent, 'utf8');
console.log('[OK] App.tsx actualizado con progreso y contenedor sin opacidad 0');

console.log('=== Corrección de descarga PDF completada ===');
