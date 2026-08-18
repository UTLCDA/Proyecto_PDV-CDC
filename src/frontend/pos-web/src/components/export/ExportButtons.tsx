import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExportReportConfig } from './exportTypes';
import { generatePdfReport } from './PdfReport';
import { generateExcelReport } from './excelExporter';
import './ExportButtons.css';

interface ExportButtonsProps<T> {
  data: T[];
  config: ExportReportConfig<T>;
  onLoadAllData?: (kind: 'pdf' | 'excel') => Promise<T[]>;
}

type ExportKind = 'pdf' | 'excel' | null;

export const ExportButtons = <T,>({ data, config, onLoadAllData }: ExportButtonsProps<T>) => {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState<ExportKind>(null);
  const [error, setError] = useState('');
  const disabled = data.length === 0 || generating !== null;

  const runExport = async (kind: Exclude<ExportKind, null>) => {
    if (disabled) return;
    setGenerating(kind);
    setError('');
    try {
      const rows = onLoadAllData ? await onLoadAllData(kind) : data;
      if (rows.length === 0) throw new Error(t('noExportData'));
      if (kind === 'pdf') await generatePdfReport(config, rows);
      else await generateExcelReport(config, rows);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : t('exportFailed'));
    } finally {
      setGenerating(null);
    }
  };

  return <div className="export-control">
    <div className="export-buttons" aria-label={t('exportActions')}>
      <button type="button" className="export-button export-button--pdf" disabled={disabled} title={data.length === 0 ? t('noExportData') : t('exportPdf')} onClick={() => void runExport('pdf')}>
        <span aria-hidden="true">📄</span><span>{generating === 'pdf' ? t('generatingExport') : t('exportPdf')}</span>
      </button>
      <button type="button" className="export-button export-button--excel" disabled={disabled} title={data.length === 0 ? t('noExportData') : t('exportExcel')} onClick={() => void runExport('excel')}>
        <span aria-hidden="true">📊</span><span>{generating === 'excel' ? t('generatingExport') : t('exportExcel')}</span>
      </button>
    </div>
    {error && <small className="export-error" role="alert">{error}</small>}
  </div>;
};

export default ExportButtons;
