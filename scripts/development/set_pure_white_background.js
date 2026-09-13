const fs = require('fs');
const path = require('path');

const srcDir = 'D:/Visozr Etiquetas/src';

console.log('=== Cambiando Fondo de Etiquetas a Blanco Puro (#FFFFFF) ===');

// 1. ThermalLabel.tsx
const thermalPath = path.join(srcDir, 'components/ThermalLabel.tsx');
let thermalCode = fs.readFileSync(thermalPath, 'utf8');

thermalCode = thermalCode.replace(/backgroundColor:\s*'#FFFDF0'/g, "backgroundColor: '#FFFFFF'");
thermalCode = thermalCode.replace(/border:\s*'1\.8mm solid #E8DEC8'/g, "border: '1.5mm solid #E2E8F0'");
fs.writeFileSync(thermalPath, thermalCode, 'utf8');
console.log('[OK] ThermalLabel.tsx actualizado con fondo 100% blanco (#FFFFFF) y borde sutil (#E2E8F0).');

// 2. pdfExport.ts
const pdfPath = path.join(srcDir, 'utils/pdfExport.ts');
let pdfCode = fs.readFileSync(pdfPath, 'utf8');
pdfCode = pdfCode.replace(/backgroundColor:\s*'#FFFDF0'/g, "backgroundColor: '#FFFFFF'");
fs.writeFileSync(pdfPath, pdfCode, 'utf8');
console.log('[OK] pdfExport.ts actualizado con fondo 100% blanco (#FFFFFF).');

// 3. LabelPreviewCard.tsx
const cardPath = path.join(srcDir, 'components/LabelPreviewCard.tsx');
let cardCode = fs.readFileSync(cardPath, 'utf8');
cardCode = cardCode.replace(/border border-\[#E8DEC8\]\/50/g, 'border border-slate-200/80');
fs.writeFileSync(cardPath, cardCode, 'utf8');
console.log('[OK] LabelPreviewCard.tsx actualizado con borde limpio.');

console.log('=== Cambio a blanco puro completado con éxito ===');
