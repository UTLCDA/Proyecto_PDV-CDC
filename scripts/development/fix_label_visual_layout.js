const fs = require('fs');
const path = require('path');

const filePath = 'D:/Visozr Etiquetas/src/components/ThermalLabel.tsx';

const code = `import React from 'react';
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
  const colorFontSize = colorLen > 38 ? '7.8pt' : colorLen > 24 ? '9pt' : '10.5pt';
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
        {/* 1. ENCABEZADO: Logo + WPC Bajío (SIEMPRE EN UN SOLO RENGLÓN) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1.2px solid rgba(58, 35, 18, 0.2)',
            paddingBottom: '2.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <img
              src={wpcBajioLogo}
              alt="Logo WPC Bajío"
              style={{
                width: '7.5mm',
                height: '7.5mm',
                borderRadius: '9999px',
                objectFit: 'cover',
                border: '1px solid rgba(58, 35, 18, 0.3)',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                letterSpacing: '0.04em',
                color: '#3A2312',
                fontWeight: 900,
                fontFamily: "'Outfit', 'Arial Black', sans-serif",
                fontSize: '12.5pt',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                display: 'inline-block',
              }}
            >
              WPC Bajío
            </span>
          </div>
        </div>

        {/* 2. CUERPO CENTRAL: COLOR, DIMENSIONES Y SKU */}
        <div style={{ margin: 'auto 0', padding: '3px 0', display: 'flex', flexDirection: 'column', gap: '4.5px' }}>
          {/* Fila Color: Multilínea con ajuste dinámico */}
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

        {/* 3. PIE INFERIOR (FOOTER): Código de barras (izq) y Precio (der) con espacio limpio */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingTop: '3px',
            borderTop: '1px solid rgba(58, 35, 18, 0.2)',
            minHeight: '13mm',
          }}
        >
          {/* Izquierda: Código de barras */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, overflow: 'hidden' }}>
            <span
              style={{
                fontSize: '6pt',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'rgba(58, 35, 18, 0.7)',
                lineHeight: 1.2,
                marginBottom: '2px',
                whiteSpace: 'nowrap',
              }}
            >
              CÓDIGO DE BARRAS
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#3A2312',
                lineHeight: 1.1,
                fontSize: '11.5pt',
                whiteSpace: 'nowrap',
              }}
            >
              {data.barcode || '000000000000'}
            </span>
          </div>

          {/* Derecha: Bloque de precio con IVA sin amontonarse */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
              flexShrink: 0,
              textAlign: 'right',
              paddingLeft: '8px',
            }}
          >
            <span
              style={{
                fontSize: '6.2pt',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'rgba(58, 35, 18, 0.8)',
                lineHeight: 1.2,
                marginBottom: '2px',
                whiteSpace: 'nowrap',
              }}
            >
              PRECIO P/PZA
            </span>
            <span
              style={{
                fontSize: '13.5pt',
                fontWeight: 900,
                fontFamily: "'Outfit', 'Arial Black', sans-serif",
                color: '#3A2312',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                margin: '1px 0',
                whiteSpace: 'nowrap',
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
                letterSpacing: '0.04em',
                lineHeight: 1.1,
                marginTop: '2px',
                whiteSpace: 'nowrap',
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

fs.writeFileSync(filePath, code, 'utf8');
console.log('[OK] ThermalLabel.tsx actualizado con WPC Bajio en 1 renglon y precio con espacio optimo.');
