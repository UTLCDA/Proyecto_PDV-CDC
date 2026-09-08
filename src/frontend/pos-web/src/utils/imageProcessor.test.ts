import { describe, it, expect } from 'vitest';
import { isImageFile, isHeicFile } from './imageProcessor';

describe('imageProcessor utils', () => {
  it('correctly identifies standard and extended image files', () => {
    const jpgFile = new File(['content'], 'foto.jpg', { type: 'image/jpeg' });
    const pngFile = new File(['content'], 'foto.png', { type: 'image/png' });
    const webpFile = new File(['content'], 'foto.webp', { type: 'image/webp' });
    const jfifFile = new File(['content'], 'foto.jfif', { type: '' });

    expect(isImageFile(jpgFile)).toBe(true);
    expect(isImageFile(pngFile)).toBe(true);
    expect(isImageFile(webpFile)).toBe(true);
    expect(isImageFile(jfifFile)).toBe(true);
  });

  it('correctly detects HEIC and HEIF files even when browser reports empty type', () => {
    const heicWithType = new File(['heic'], 'IMG_1234.heic', { type: 'image/heic' });
    const heicWithoutType = new File(['heic'], 'IMG_1234.HEIC', { type: '' });
    const heifFile = new File(['heif'], 'foto.heif', { type: 'image/heif' });

    expect(isImageFile(heicWithType)).toBe(true);
    expect(isImageFile(heicWithoutType)).toBe(true);
    expect(isHeicFile(heicWithType)).toBe(true);
    expect(isHeicFile(heicWithoutType)).toBe(true);
    expect(isHeicFile(heifFile)).toBe(true);
  });

  it('rejects non-image files', () => {
    const pdfFile = new File(['pdf'], 'documento.pdf', { type: 'application/pdf' });
    const txtFile = new File(['txt'], 'archivo.txt', { type: 'text/plain' });

    expect(isImageFile(pdfFile)).toBe(false);
    expect(isImageFile(txtFile)).toBe(false);
    expect(isHeicFile(pdfFile)).toBe(false);
  });
});
