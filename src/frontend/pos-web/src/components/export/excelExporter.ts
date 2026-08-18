import { ExportColumnType, ExportReportConfig, ExportValue } from './exportTypes';
import { buildExportFileName, downloadBlob, normalizeExportValue, sanitizeSheetName } from './formatters';
import { formatOperationalDateTime } from '../../utils/operationalDate';
import { exportTheme, toExcelArgb } from './exportTheme';

const excelValue = (value: ExportValue, type: ExportColumnType = 'text') => {
  if (value === null || value === undefined || value === '') return null;
  if (type === 'date' || type === 'datetime') {
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date;
  }
  if (type === 'number' || type === 'currency' || type === 'percentage') {
    return typeof value === 'number' ? value : Number(value);
  }
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  return String(value);
};

const numberFormat = (type: ExportColumnType = 'text') => {
  if (type === 'currency') return '$#,##0.00;[Red]-$#,##0.00';
  if (type === 'percentage') return '0.00%';
  if (type === 'number') return '#,##0.####';
  if (type === 'date') return 'dd/mm/yyyy';
  if (type === 'datetime') return 'dd/mm/yyyy hh:mm';
  return undefined;
};

export const buildExcelReportBuffer = async <T,>(config: ExportReportConfig<T>, rows: T[]) => {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema Punto de Venta WPC Bajío';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet(sanitizeSheetName(config.sheetName), {
    pageSetup: { orientation: config.orientation ?? (config.columns.length > 6 ? 'landscape' : 'portrait'), fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  const lastColumn = Math.max(1, config.columns.length);
  worksheet.mergeCells(1, 1, 1, lastColumn);
  worksheet.getCell(1, 1).value = 'WPC BAJÍO — Sistema Punto de Venta e Inventario';
  worksheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: toExcelArgb(exportTheme.primary) } };
  worksheet.mergeCells(2, 1, 2, lastColumn);
  worksheet.getCell(2, 1).value = config.title.toUpperCase();
  worksheet.getCell(2, 1).font = { bold: true, size: 13, color: { argb: toExcelArgb(exportTheme.text) } };
  worksheet.mergeCells(3, 1, 3, lastColumn);
  worksheet.getCell(3, 1).value = `${config.moduleName} · Generado ${formatOperationalDateTime(new Date())}`;
  worksheet.getCell(3, 1).font = { italic: true, color: { argb: toExcelArgb(exportTheme.textSecondary) } };

  let currentRow = 5;
  const activeFilters = (config.filters ?? []).filter(filter => filter.value !== null && filter.value !== undefined && filter.value !== '');
  if (activeFilters.length > 0) {
    worksheet.getCell(currentRow, 1).value = 'Filtros aplicados';
    worksheet.getCell(currentRow, 1).font = { bold: true, color: { argb: toExcelArgb(exportTheme.primary) } };
    currentRow += 1;
    activeFilters.forEach(filter => {
      worksheet.getCell(currentRow, 1).value = filter.label;
      worksheet.getCell(currentRow, 1).font = { bold: true };
      worksheet.getCell(currentRow, 2).value = normalizeExportValue(filter.value);
      currentRow += 1;
    });
    currentRow += 1;
  }

  const headerRowNumber = currentRow;
  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.values = config.columns.map(column => column.label);
  headerRow.height = 24;
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toExcelArgb(exportTheme.primary) } };
    cell.font = { bold: true, color: { argb: toExcelArgb(exportTheme.contrastText) } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: { style: 'thin', color: { argb: toExcelArgb(exportTheme.borderInput) } }, bottom: { style: 'thin', color: { argb: toExcelArgb(exportTheme.borderInput) } }, left: { style: 'thin', color: { argb: toExcelArgb(exportTheme.borderInput) } }, right: { style: 'thin', color: { argb: toExcelArgb(exportTheme.borderInput) } } };
  });

  rows.forEach((row, index) => {
    const excelRow = worksheet.addRow(config.columns.map(column => excelValue(column.value(row), column.type)));
    excelRow.alignment = { vertical: 'top', wrapText: true };
    excelRow.eachCell((cell, columnNumber) => {
      const column = config.columns[columnNumber - 1];
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toExcelArgb(exportTheme.container) } };
      cell.border = { bottom: { style: 'hair', color: { argb: toExcelArgb(exportTheme.borderSubtle) } } };
      const format = numberFormat(column.type);
      if (format) cell.numFmt = format;
      if (column.type === 'currency' || column.type === 'number' || column.type === 'percentage') cell.alignment = { vertical: 'top', horizontal: 'right' };
    });
  });

  config.columns.forEach((column, index) => {
    const worksheetColumn = worksheet.getColumn(index + 1);
    const sampleLengths = rows.slice(0, 500).map(row => normalizeExportValue(column.value(row), column.type).length);
    worksheetColumn.width = Math.min(45, Math.max(12, column.label.length + 2, ...sampleLengths) + 1);
  });
  worksheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
  worksheet.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: headerRowNumber + rows.length, column: lastColumn } };
  worksheet.properties.defaultRowHeight = 18;

  return workbook.xlsx.writeBuffer();
};

export const generateExcelReport = async <T,>(config: ExportReportConfig<T>, rows: T[]) => {
  const buffer = await buildExcelReportBuffer(config, rows);
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), buildExportFileName(config.fileName, 'xlsx', config.dateRange));
};
