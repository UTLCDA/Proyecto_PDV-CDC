const fs = require('fs');
const path = require('path');

const srcDir = 'D:/Visozr Etiquetas/src';

console.log('=== Aplicando Textura de Mármol Blanco al Fondo de la Etiqueta ===');

// 1. ThermalLabel.tsx
const thermalPath = path.join(srcDir, 'components/ThermalLabel.tsx');
let thermalCode = fs.readFileSync(thermalPath, 'utf8');

// Agregar import de marbleBg si no existe
if (!thermalCode.includes("import marbleBg from '../assets/label-marble-bg.jpg';")) {
  thermalCode = thermalCode.replace(
    "import wpcBajioLogo from '../assets/wpc-bajio-logo.jpg';",
    "import wpcBajioLogo from '../assets/wpc-bajio-logo.jpg';\nimport marbleBg from '../assets/label-marble-bg.jpg';"
  );
}

// Actualizar estilo del contenedor exterior
const outerOldStyleRegex = /width:\s*'100mm',\s*height:\s*'60mm',\s*backgroundColor:\s*'#FFFFFF',[\s\S]*?fontFamily:\s*"'Inter',\s*sans-serif",/;
const outerNewStyle = `width: '100mm',
        height: '60mm',
        backgroundImage: \`linear-gradient(rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.18)), url(\${marbleBg})\`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#FFFFFF',
        color: '#2A1A0E',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",`;

thermalCode = thermalCode.replace(outerOldStyleRegex, outerNewStyle);

// Actualizar estilo del contenedor interior (borde perimetral y fondo transparente/ligero para ver el mármol)
const innerOldStyleRegex = /margin:\s*'3mm',\s*border:\s*'1\.5mm solid #E2E8F0',[\s\S]*?backgroundColor:\s*'#FFFFFF',/;
const innerNewStyle = `margin: '2.5mm',
          border: '1.4mm solid rgba(185, 168, 145, 0.55)',
          borderRadius: '2mm',
          boxSizing: 'border-box',
          height: 'calc(100% - 5mm)',
          width: 'calc(100% - 5mm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '2.5mm 3.5mm',
          backgroundColor: 'rgba(255, 255, 255, 0.35)',
          backdropFilter: 'blur(0.5px)',`;

thermalCode = thermalCode.replace(innerOldStyleRegex, innerNewStyle);

fs.writeFileSync(thermalPath, thermalCode, 'utf8');
console.log('[OK] ThermalLabel.tsx actualizado con fondo de textura de mármol blanco.');

// 2. pdfExport.ts
const pdfPath = path.join(srcDir, 'utils/pdfExport.ts');
let pdfCode = fs.readFileSync(pdfPath, 'utf8');
// Asegurar que html-to-image soporte fondo transparente/imagen sin sobrescribir en blanco plano
pdfCode = pdfCode.replace(/backgroundColor:\s*'#FFFFFF'/g, "backgroundColor: undefined");
fs.writeFileSync(pdfPath, pdfCode, 'utf8');
console.log('[OK] pdfExport.ts actualizado.');

console.log('=== Textura aplicada exitosamente ===');
