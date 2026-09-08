export interface ProcessImageOptions {
  maxDimension?: number;
  quality?: number;
}

/**
 * Checks if a file is an image by MIME type or file extension (including HEIC/HEIF).
 */
export const isImageFile = (file: File): boolean => {
  if (file.type && file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'bmp', 'jfif', 'gif'].includes(ext);
};

/**
 * Checks if a file is in HEIC / HEIF format.
 */
export const isHeicFile = (file: File): boolean => {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ext === 'heic' || ext === 'heif';
};

/**
 * Processes an image file:
 * 1. Converts HEIC/HEIF to JPEG via dynamically loaded heic2any if necessary.
 * 2. Compresses and resizes via HTML5 Canvas (max 1200px by default, JPEG 0.82).
 * 3. Returns a compact Base64 data URL (typically 100KB - 250KB).
 */
export const processAndCompressImage = async (
  file: File,
  options: ProcessImageOptions = {}
): Promise<string> => {
  const { maxDimension = 1200, quality = 0.82 } = options;

  let sourceBlob: Blob = file;

  // Convert HEIC/HEIF to standard image blob dynamically
  if (isHeicFile(file)) {
    try {
      const heic2anyModule = await import('heic2any');
      const heic2any = heic2anyModule.default || heic2anyModule;
      const conversionResult = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.88
      });
      sourceBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
    } catch (err) {
      console.error('Error al convertir imagen HEIC:', err);
      throw new Error('No se pudo procesar la imagen HEIC. Intente exportarla a JPG o PNG.');
    }
  }

  // If in non-DOM environment (e.g. unit tests without canvas), return fallback FileReader
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(sourceBlob);
    });
  }

  // Load image into an HTMLImageElement
  const objectUrl = URL.createObjectURL(sourceBlob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Error al decodificar la imagen seleccionada.'));
      image.src = objectUrl;
    });

    // Resize while keeping aspect ratio
    let { width, height } = img;
    if (width > height) {
      if (width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      }
    } else {
      if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    // Draw on Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo inicializar el contexto de lienzo Canvas.');
    }

    ctx.drawImage(img, 0, 0, width, height);

    // Export as high quality compressed JPEG
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
