const fs = require('fs');
const path = require('path');

const srcDir = 'D:/Visozr Etiquetas/src';

console.log('=== Actualizando Color de Fondo de Etiqueta (Blanco Cálido / Marfil) ===');

// 1. ThermalLabel.tsx
const thermalPath = path.join(srcDir, 'components/ThermalLabel.tsx');
let thermalCode = fs.readFileSync(thermalPath, 'utf8');

// Reemplazar color de fondo #FEE2B8 por un blanco-amarillo suave (#FFFDF0 / #FFFBEA)
// Y el borde perimetral por un beige suave acorde (#E8DEC8)
thermalCode = thermalCode.replace(/backgroundColor:\s*'#FEE2B8'/g, "backgroundColor: '#FFFDF0'");
thermalCode = thermalCode.replace(/border:\s*'1\.8mm solid #E6D8C5'/g, "border: '1.8mm solid #E8DEC8'");

// Limpiar cualquier mojibake en textos de comentarios o etiquetas
thermalCode = thermalCode.replace(/tÃ©rmica/g, 'térmica');
thermalCode = thermalCode.replace(/WPC BajÃ­o/g, 'WPC Bajío');
thermalCode = thermalCode.replace(/RENGLÃ“N/g, 'RENGLÓN');
thermalCode = thermalCode.replace(/CÃ³digo/g, 'Código');

fs.writeFileSync(thermalPath, thermalCode, 'utf8');
console.log('[OK] ThermalLabel.tsx actualizado con fondo blanco-marfil (#FFFDF0) y borde (#E8DEC8).');

// 2. pdfExport.ts
const pdfPath = path.join(srcDir, 'utils/pdfExport.ts');
let pdfCode = fs.readFileSync(pdfPath, 'utf8');
pdfCode = pdfCode.replace(/backgroundColor:\s*'#FEE2B8'/g, "backgroundColor: '#FFFDF0'");
pdfCode = pdfCode.replace(/definiciÃ³n/g, 'definición');
pdfCode = pdfCode.replace(/encontrÃ³/g, 'encontró');
fs.writeFileSync(pdfPath, pdfCode, 'utf8');
console.log('[OK] pdfExport.ts actualizado con fondo blanco-marfil.');

// 3. LabelPreviewCard.tsx
const cardPath = path.join(srcDir, 'components/LabelPreviewCard.tsx');
let cardCode = fs.readFileSync(cardPath, 'utf8');
cardCode = cardCode.replace(/#E6D8C5/g, '#E8DEC8');
fs.writeFileSync(cardPath, cardCode, 'utf8');
console.log('[OK] LabelPreviewCard.tsx actualizado con borde #E8DEC8.');

console.log('=== Color actualizado exitosamente ===');
