import { ExportColumnType, ExportDateRange, ExportValue } from './exportTypes';
import { formatOperationalDateTime, getOperationalDateInputValue, OPERATIONAL_TIME_ZONE } from '../../utils/operationalDate';

export const normalizeExportValue = (value: ExportValue, type: ExportColumnType = 'text') => {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'currency' && typeof value === 'number') {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  }
  if (type === 'number' && typeof value === 'number') {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 }).format(value);
  }
  if (type === 'percentage' && typeof value === 'number') {
    return new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 2 }).format(value);
  }
  if (type === 'date' || type === 'datetime') {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return type === 'datetime'
      ? formatOperationalDateTime(date)
      : new Intl.DateTimeFormat('es-MX', { timeZone: OPERATIONAL_TIME_ZONE, dateStyle: 'medium' }).format(date);
  }
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
};

export const sanitizeSheetName = (name: string) =>
  name.replace(/[\\/*?:\[\]]/g, '').slice(0, 31) || 'Reporte';

export const buildExportFileName = (
  baseName: string,
  extension: 'pdf' | 'xlsx',
  dateRange?: ExportDateRange
) => {
  const safeBase = baseName.trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_').replace(/_+/g, '_');
  const start = dateRange?.startDate;
  const end = dateRange?.endDate;
  const suffix = start && end
    ? (start === end ? start : `${start}_${end}`)
    : start || end || getOperationalDateInputValue();
  return `${safeBase}_${suffix}.${extension}`;
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

let logoPromise: Promise<string> | null = null;

export const loadOfficialLogoDataUrl = () => {
  if (logoPromise) return logoPromise;
  logoPromise = fetch('/logo_wpc_bajio.jpeg')
    .then(response => {
      if (!response.ok) throw new Error('No se pudo cargar el logotipo oficial.');
      return response.blob();
    })
    .then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo leer el logotipo oficial.'));
      reader.readAsDataURL(blob);
    }));
  return logoPromise;
};
