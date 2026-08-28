/**
 * Generador de Código de Barras Code 128 B en Canvas / Base64 Data URL.
 * WPC Bajío - Sistema Punto de Venta e Inventario.
 */

// Anchos de barras y espacios para Code 128 (107 símbolos)
const CODE128_PATTERNS: readonly string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Convierte un texto a una cadena binaria de módulo de Code 128 B.
 */
function encodeCode128B(text: string): string {
  const cleanText = text.replace(/[^\x20-\x7E]/g, '');
  if (!cleanText) return '';

  const symbolIndices: number[] = [START_CODE_B];
  let checksum = START_CODE_B;

  for (let i = 0; i < cleanText.length; i++) {
    const charCode = cleanText.charCodeAt(i);
    const code128Val = charCode - 32;
    symbolIndices.push(code128Val);
    checksum += code128Val * (i + 1);
  }

  const checksumIndex = checksum % 103;
  symbolIndices.push(checksumIndex);
  symbolIndices.push(STOP_CODE);

  let binaryBars = '';
  for (const index of symbolIndices) {
    const pattern = CODE128_PATTERNS[index];
    if (!pattern) continue;
    let isBar = true;
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10);
      binaryBars += (isBar ? '1' : '0').repeat(width);
      isBar = !isBar;
    }
  }

  return binaryBars;
}

export interface BarcodeRenderOptions {
  width?: number;
  height?: number;
  barWidth?: number;
  showText?: boolean;
}

/**
 * Genera una imagen Base64 (PNG Data URL) del código de barras especificado.
 */
export function generateBarcodeBase64(text: string, options: BarcodeRenderOptions = {}): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const binaryBars = encodeCode128B(trimmed);
  if (!binaryBars) return '';

  const barModuleWidth = options.barWidth || 2;
  const quietZone = 20;
  const barcodeHeight = options.height || 60;
  const fontSize = 14;
  const textPadding = options.showText !== false ? 20 : 5;

  const totalWidth = binaryBars.length * barModuleWidth + quietZone * 2;
  const totalHeight = barcodeHeight + textPadding + (options.showText !== false ? fontSize : 0);

  if (typeof document === 'undefined') {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Fondo Blanco
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Dibujar Barras Negras
  ctx.fillStyle = '#000000';
  let x = quietZone;

  for (let i = 0; i < binaryBars.length; i++) {
    if (binaryBars[i] === '1') {
      ctx.fillRect(x, 10, barModuleWidth, barcodeHeight);
    }
    x += barModuleWidth;
  }

  // Texto Inferior
  if (options.showText !== false) {
    ctx.font = '600 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1E293B';
    ctx.fillText(trimmed, totalWidth / 2, totalHeight - 6);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Guarda o recupera el código de barras en almacenamiento local (localStorage).
 */
export function saveBarcodeLocally(skuOrId: string, base64: string): void {
  if (typeof window !== 'undefined' && skuOrId && base64) {
    try {
      localStorage.setItem(`lambrin_barcode_${skuOrId.toUpperCase()}`, base64);
    } catch {
      // Ignorar límite de almacenamiento si aplica
    }
  }
}

export function getLocalBarcode(skuOrId: string): string | null {
  if (typeof window !== 'undefined' && skuOrId) {
    return localStorage.getItem(`lambrin_barcode_${skuOrId.toUpperCase()}`);
  }
  return null;
}
