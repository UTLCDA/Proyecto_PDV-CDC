export type ExportValue = string | number | boolean | Date | null | undefined;
export type ExportColumnType = 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'percentage';
export type ExportOrientation = 'portrait' | 'landscape';

export interface ExportColumn<T> {
  key: string;
  label: string;
  type?: ExportColumnType;
  width?: number;
  value: (row: T) => ExportValue;
}

export interface ExportFilter {
  label: string;
  value: ExportValue;
}

export interface ExportDateRange {
  startDate?: string;
  endDate?: string;
}

export interface ExportReportConfig<T> {
  moduleName: string;
  title: string;
  fileName: string;
  sheetName: string;
  orientation?: ExportOrientation;
  columns: ExportColumn<T>[];
  filters?: ExportFilter[];
  dateRange?: ExportDateRange;
}
