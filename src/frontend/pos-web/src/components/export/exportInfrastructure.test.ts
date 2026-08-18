import { describe, expect, it, vi } from 'vitest';
import { buildExportFileName, normalizeExportValue, sanitizeSheetName } from './formatters';
import { getOperationalDateInputValue, toOperationalUtcBoundary } from '../../utils/operationalDate';
import { appendPaging, loadAllPages } from '../../utils/pagedExport';
import { buildExcelReportBuffer } from './excelExporter';
import { buildPdfReportBlob } from './PdfReport';
import { ExportReportConfig } from './exportTypes';

interface SampleRow {
  idVenta: number;
  createdAtUtc: string;
  total: number;
}

const sampleConfig: ExportReportConfig<SampleRow> = {
  moduleName: 'Histórico de ventas',
  title: 'Ventas del día',
  fileName: 'Ventas',
  sheetName: 'Ventas',
  orientation: 'landscape',
  dateRange: { startDate: '2026-08-17', endDate: '2026-08-17' },
  filters: [{ label: 'Periodo', value: '2026-08-17' }],
  columns: [
    { key: 'idVenta', label: 'Id Venta', type: 'number', value: row => row.idVenta },
    { key: 'date', label: 'Fecha', type: 'datetime', value: row => row.createdAtUtc },
    { key: 'total', label: 'Total', type: 'currency', value: row => row.total }
  ]
};

describe('export infrastructure', () => {
  it('uses the Mexico operational day instead of the UTC calendar day', () => {
    expect(getOperationalDateInputValue(new Date('2026-08-17T04:30:00.000Z'))).toBe('2026-08-16');
    expect(toOperationalUtcBoundary('2026-08-17')).toBe('2026-08-17T06:00:00.000Z');
    expect(toOperationalUtcBoundary('2026-08-17', true)).toBe('2026-08-18T05:59:59.999Z');
  });

  it('builds standardized file and sheet names from the active date range', () => {
    expect(buildExportFileName('Movimientos de Caja', 'xlsx', { startDate: '2026-08-01', endDate: '2026-08-17' }))
      .toBe('Movimientos_de_Caja_2026-08-01_2026-08-17.xlsx');
    expect(buildExportFileName('Ventas', 'pdf', { startDate: '2026-08-17', endDate: '2026-08-17' }))
      .toBe('Ventas_2026-08-17.pdf');
    expect(sanitizeSheetName('Ventas/[Agosto]*?')).toBe('VentasAgosto');
  });

  it('formats administrative values without exposing technical representations', () => {
    expect(normalizeExportValue(47, 'number')).toBe('47');
    expect(normalizeExportValue(42.83, 'currency')).toContain('42.83');
    expect(normalizeExportValue(true)).toBe('Sí');
  });

  it('loads every page in bounded batches for export', async () => {
    const source = Array.from({ length: 1_253 }, (_, index) => index + 1);
    const loader = vi.fn(async ({ page, pageSize }: { page: number; pageSize: number }) =>
      source.slice((page - 1) * pageSize, page * pageSize));

    const result = await loadAllPages(loader);

    expect(result).toEqual(source);
    expect(loader).toHaveBeenCalledTimes(3);
    expect(loader).toHaveBeenNthCalledWith(1, { page: 1, pageSize: 500 });
    expect(loader).toHaveBeenNthCalledWith(3, { page: 3, pageSize: 500 });
  });

  it('stops an export that exceeds the configured safe row limit', async () => {
    const loader = async () => Array.from({ length: 10 }, (_, index) => index);
    await expect(loadAllPages(loader, { pageSize: 10, maximumRows: 15 }))
      .rejects.toThrow('límite seguro');
  });

  it('adds pagination without replacing active filters', () => {
    const params = new URLSearchParams({ search: 'RECIBO-47' });
    appendPaging(params, { page: 3, pageSize: 500 });
    expect(params.get('search')).toBe('RECIBO-47');
    expect(params.get('page')).toBe('3');
    expect(params.get('pageSize')).toBe('500');
  });

  it('creates a real XLSX workbook with typed cells, formatting, filters and frozen headers', async () => {
    const buffer = await buildExcelReportBuffer(sampleConfig, [{ idVenta: 47, createdAtUtc: '2026-08-17T18:30:00.000Z', total: 42.83 }]);
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet('Ventas');

    expect(worksheet).toBeDefined();
    expect(worksheet!.getRow(8).getCell(1).value).toBe('Id Venta');
    expect(worksheet!.getRow(9).getCell(1).value).toBe(47);
    expect(worksheet!.getRow(9).getCell(2).value).toBeInstanceOf(Date);
    expect(worksheet!.getRow(9).getCell(3).value).toBe(42.83);
    expect(worksheet!.getRow(9).getCell(3).numFmt).toContain('$');
    expect(worksheet!.autoFilter).toBeTruthy();
    expect(worksheet!.views[0].state).toBe('frozen');
  }, 30_000);

  it('creates a valid multipage-capable PDF report document', async () => {
    const rows = Array.from({ length: 75 }, (_, index) => ({
      idVenta: index + 1,
      createdAtUtc: '2026-08-17T18:30:00.000Z',
      total: 42.83 + index
    }));
    const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const blob = await buildPdfReportBlob(sampleConfig, rows, transparentPixel);
    const signature = new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 8));

    expect(signature).toContain('%PDF-');
    expect(blob.size).toBeGreaterThan(1_000);
  }, 30_000);
});
