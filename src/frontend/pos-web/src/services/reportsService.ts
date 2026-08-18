import { apiClient } from './apiClient';
import { SalesSummaryReport, TopProductReport, AuditLog, InventorySummaryReport } from '../types/reports';
import { PagingRequest } from '../utils/pagedExport';

interface ReportFilters {
  startDate?: string;
  endDate?: string;
}

interface AuditFilters extends ReportFilters {
  correlationId?: string;
  user?: string;
  action?: string;
  idVenta?: string;
  module?: string;
  eventType?: string;
  resultStatus?: string;
}

const appendFilters = <T extends object>(url: string, filters: T) => {
  const params = new URLSearchParams();
  Object.entries(filters as Record<string, string | number | undefined>).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.append(key, String(value));
  });
  return params.size > 0 ? `${url}?${params.toString()}` : url;
};

export const reportsService = {
  getSalesSummary: (filters: ReportFilters = {}) =>
    apiClient.request<SalesSummaryReport>(appendFilters('/reports/sales-summary', filters)),
  getTopProducts: (top = 10, filters: ReportFilters = {}) =>
    apiClient.request<TopProductReport[]>(appendFilters('/reports/top-products', { ...filters, top: String(top) })),
  getInventorySummary: () => apiClient.request<InventorySummaryReport>('/reports/inventory-summary'),
  getAuditLogs: (filters: AuditFilters = {}, paging?: PagingRequest) =>
    apiClient.request<AuditLog[]>(appendFilters('/audit/logs', { ...filters, ...paging }))
};
