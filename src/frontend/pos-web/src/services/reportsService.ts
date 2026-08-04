import { apiClient } from './apiClient';
import { SalesSummaryReport, TopProductReport, AuditLog } from '../types/reports';

export const reportsService = {
  getSalesSummary: (startDate?: string, endDate?: string) => {
    let url = '/reports/sales-summary';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return apiClient.request<SalesSummaryReport>(url);
  },
  getTopProducts: (top: number = 10) => apiClient.request<TopProductReport[]>(`/reports/top-products?top=${top}`),
  getAuditLogs: (correlationId?: string, action?: string) => {
    let url = '/audit/logs';
    const params = new URLSearchParams();
    if (correlationId) params.append('correlationId', correlationId);
    if (action) params.append('action', action);
    if (params.toString()) url += `?${params.toString()}`;
    return apiClient.request<AuditLog[]>(url);
  }
};
