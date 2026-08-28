import React from 'react';
import { ExportReportConfig } from './exportTypes';
import { buildExportFileName, downloadBlob, loadOfficialLogoDataUrl, normalizeExportValue } from './formatters';
import { formatOperationalDateTime } from '../../utils/operationalDate';
import { exportTheme } from './exportTheme';

let isFontRegistered = false;

const ensureChineseFont = (Font: any) => {
  if (isFontRegistered) return;
  Font.register({
    family: 'Noto Sans SC',
    src: typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/fonts/NotoSansSC-Regular.woff`
      : 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff'
  });
  isFontRegistered = true;
};

export const buildPdfReportBlob = async <T,>(config: ExportReportConfig<T>, rows: T[], logo: string) => {
  const renderer = await import('@react-pdf/renderer');
  const { Document, Image, Page, StyleSheet, Text, View, pdf, Font } = renderer;
  ensureChineseFont(Font);

  const columnCount = config.columns.length;
  const styles = StyleSheet.create({
    page: { fontFamily: 'Noto Sans SC', paddingTop: 28, paddingHorizontal: 28, paddingBottom: 42, color: exportTheme.text, backgroundColor: exportTheme.surface, fontSize: columnCount > 8 ? 6.5 : 8 },
    header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: exportTheme.borderSubtle },
    logo: { width: 54, height: 54, objectFit: 'cover', borderRadius: 27, marginRight: 12 },
    company: { fontSize: 15, fontWeight: 700, color: exportTheme.primary },
    system: { fontSize: 8, color: exportTheme.textSecondary, marginTop: 2 },
    module: { fontSize: 9, color: exportTheme.textSecondary, marginTop: 7 },
    title: { fontSize: 13, fontWeight: 700, color: exportTheme.text, marginTop: 2 },
    generated: { marginLeft: 'auto', textAlign: 'right', fontSize: 7.5, color: exportTheme.textSecondary },
    filters: { backgroundColor: exportTheme.container, borderWidth: 1, borderColor: exportTheme.borderSubtle, borderRadius: 5, padding: 8, marginBottom: 10 },
    filtersTitle: { fontSize: 8, fontWeight: 700, color: exportTheme.primary, marginBottom: 4 },
    filterRow: { flexDirection: 'row', marginTop: 2 },
    filterLabel: { width: 88, fontWeight: 700 },
    table: { width: '100%', borderWidth: 1, borderColor: exportTheme.borderSubtle },
    tableHeader: { flexDirection: 'row', backgroundColor: exportTheme.primary, color: exportTheme.contrastText, fontWeight: 700 },
    tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: exportTheme.borderSubtle, minHeight: 18 },
    alternateRow: { backgroundColor: exportTheme.container },
    cell: { paddingVertical: 4, paddingHorizontal: 3, borderRightWidth: 1, borderRightColor: exportTheme.borderSubtle },
    footer: { position: 'absolute', left: 28, right: 28, bottom: 18, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: exportTheme.textSecondary, borderTopWidth: 1, borderTopColor: exportTheme.borderSubtle, paddingTop: 5 }
  });

  const activeFilters = (config.filters ?? []).filter(filter => filter.value !== null && filter.value !== undefined && filter.value !== '');
  const document = (
    <Document title={config.title} author="WPC Bajío">
      <Page size="A4" orientation={config.orientation ?? (columnCount > 6 ? 'landscape' : 'portrait')} style={styles.page} wrap>
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <View>
            <Text style={styles.company}>WPC BAJÍO</Text>
            <Text style={styles.system}>Sistema Punto de Venta e Inventario</Text>
            <Text style={styles.module}>{config.moduleName}</Text>
            <Text style={styles.title}>{config.title}</Text>
          </View>
          <View style={styles.generated}>
            <Text>Generado:</Text>
            <Text>{formatOperationalDateTime(new Date())}</Text>
            <Text>{rows.length} registro(s)</Text>
          </View>
        </View>

        {activeFilters.length > 0 && <View style={styles.filters}>
          <Text style={styles.filtersTitle}>Filtros aplicados</Text>
          {activeFilters.map(filter => <View key={filter.label} style={styles.filterRow}>
            <Text style={styles.filterLabel}>{filter.label}:</Text>
            <Text>{normalizeExportValue(filter.value)}</Text>
          </View>)}
        </View>}

        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            {config.columns.map(column => <Text key={column.key} style={[styles.cell, { flexGrow: column.width ?? 1, flexBasis: 0 }]}>{column.label}</Text>)}
          </View>
          {rows.map((row, rowIndex) => <View key={rowIndex} style={[styles.tableRow, ...(rowIndex % 2 ? [styles.alternateRow] : [])]} wrap={false}>
            {config.columns.map(column => <Text key={column.key} style={[styles.cell, { flexGrow: column.width ?? 1, flexBasis: 0 }]}>
              {normalizeExportValue(column.value(row), column.type)}
            </Text>)}
          </View>)}
        </View>

        <View style={styles.footer} fixed>
          <Text>Generado desde Sistema Punto de Venta WPC Bajío</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );

  return pdf(document).toBlob();
};

export const generatePdfReport = async <T,>(config: ExportReportConfig<T>, rows: T[]) => {
  const logo = await loadOfficialLogoDataUrl();
  const blob = await buildPdfReportBlob(config, rows, logo);
  downloadBlob(blob, buildExportFileName(config.fileName, 'pdf', config.dateRange));
};
