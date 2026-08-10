import { apiClient } from './apiClient';
import { SalesSummaryReport, TopProductReport, AuditLog, InventorySummaryReport } from '../types/reports';

interface ReportFilters {
  startDate?: string;
  endDate?: string;
}

interface AuditFilters extends ReportFilters {
  correlationId?: string;
  user?: string;
  action?: string;
}

const appendFilters = <T extends object>(url: string, filters: T) => {
  const params = new URLSearchParams();
  Object.entries(filters as Record<string, string | undefined>).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  return params.size > 0 ? `${url}?${params.toString()}` : url;
};

export const reportsService = {
  getSalesSummary: (filters: ReportFilters = {}) =>
    apiClient.request<SalesSummaryReport>(appendFilters('/reports/sales-summary', filters)),
  getTopProducts: (top = 10, filters: ReportFilters = {}) =>
    apiClient.request<TopProductReport[]>(appendFilters('/reports/top-products', { ...filters, top: String(top) })),
  getInventorySummary: () => apiClient.request<InventorySummaryReport>('/reports/inventory-summary'),
  getAuditLogs: (filters: AuditFilters = {}) =>
    apiClient.request<AuditLog[]>(appendFilters('/audit/logs', filters))
};
