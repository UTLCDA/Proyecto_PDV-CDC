const fs = require('fs');
const path = require('path');

const srcDir = 'D:/Visozr Etiquetas/src';

console.log('=== Aplicando Fondo de Arte Dorado (Montañas / Olas de Oro) a Etiquetas ===');

// 1. ThermalLabel.tsx
const thermalPath = path.join(srcDir, 'components/ThermalLabel.tsx');
let thermalCode = fs.readFileSync(thermalPath, 'utf8');

// Reemplazar o actualizar import de fondo
if (thermalCode.includes("label-marble-bg.jpg")) {
  thermalCode = thermalCode.replace("import marbleBg from '../assets/label-marble-bg.jpg';", "import labelArtBg from '../assets/label-bg-art.png';");
} else if (!thermalCode.includes("label-bg-art.png")) {
  thermalCode = thermalCode.replace(
    "import wpcBajioLogo from '../assets/wpc-bajio-logo.jpg';",
    "import wpcBajioLogo from '../assets/wpc-bajio-logo.jpg';\nimport labelArtBg from '../assets/label-bg-art.png';"
  );
}

// Actualizar estilo del contenedor exterior (100mm x 60mm)
const outerOldStyleRegex = /width:\s*'100mm',\s*height:\s*'60mm',\s*backgroundImage:\s*`linear-gradient[\s\S]*?fontFamily:\s*"'Inter',\s*sans-serif",/;
const outerNewStyle = `width: '100mm',
        height: '60mm',
        backgroundImage: \`linear-gradient(rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.22)), url(\${labelArtBg})\`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 42%',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#FCF8F2',
        color: '#241408',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",`;

thermalCode = thermalCode.replace(outerOldStyleRegex, outerNewStyle);

// Actualizar estilo del contenedor interior (borde dorado fino y fondo translúcido)
const innerOldStyleRegex = /margin:\s*'2\.5mm',\s*border:\s*'1\.4mm solid rgba\(185, 168, 145, 0\.55\)',[\s\S]*?backdropFilter:\s*'blur\(0\.5px\)',/;
const innerNewStyle = `margin: '2.2mm',
          border: '1.4mm solid rgba(205, 165, 75, 0.55)',
          borderRadius: '2.5mm',
          boxSizing: 'border-box',
          height: 'calc(100% - 4.4mm)',
          width: 'calc(100% - 4.4mm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '2.5mm 3.5mm',
          backgroundColor: 'rgba(255, 255, 255, 0.32)',
          boxShadow: 'inset 0 0 10px rgba(212, 175, 55, 0.12)',
          backdropFilter: 'blur(0.4px)',`;

thermalCode = thermalCode.replace(innerOldStyleRegex, innerNewStyle);

// Actualizar borde de la miniatura de producto para armonizar en dorado
thermalCode = thermalCode.replace(
  "border: '1.2px solid rgba(58, 35, 18, 0.35)',",
  "border: '1.2px solid rgba(195, 155, 65, 0.65)',"
);

fs.writeFileSync(thermalPath, thermalCode, 'utf8');
console.log('[OK] ThermalLabel.tsx actualizado con el nuevo arte de fondo dorado.');

console.log('=== Actualización completada con éxito ===');
