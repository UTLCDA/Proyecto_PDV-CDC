import { apiClient } from './apiClient';
import { CashGeneralMovement, CashShift } from '../types/reports';
import { appendPaging, appendSorting, PagingRequest } from '../utils/pagedExport';
import { PagedResult } from '../types/pagination';

export const cashShiftService = {
  getCurrentShift: () => apiClient.request<CashShift | null>('/cashshifts/current'),
  openShift: (openingAmount: number, notes: string) =>
    apiClient.request<CashShift>('/cashshifts/open', {
      method: 'POST',
      body: JSON.stringify({ openingAmount, notes })
    }),
  registerWithdrawal: (amount: number, reason: string) =>
    apiClient.request<CashShift>('/cashshifts/withdrawal', {
      method: 'POST',
      body: JSON.stringify({ amount, reason })
    }),
  registerDeposit: (amount: number, reason: string) =>
    apiClient.request<CashShift>('/cashshifts/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount, reason })
    }),
  generateXReport: () => apiClient.request<CashShift>('/cashshifts/x-report', { method: 'POST' }),
  closeShift: (actualClosingAmount: number, notes: string) =>
    apiClient.request<CashShift>('/cashshifts/close', {
      method: 'POST',
      body: JSON.stringify({ actualClosingAmount, notes })
    }),
  getShiftHistory: (paging?: PagingRequest, sortBy?: string | null, sortDirection?: 'asc' | 'desc' | null) => {
    const params = new URLSearchParams();
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<PagedResult<CashShift>>(`/cashshifts/history${query}`);
  },
  getGeneralMovements: (paging?: PagingRequest, sortBy?: string | null, sortDirection?: 'asc' | 'desc' | null) => {
    const params = new URLSearchParams();
    appendPaging(params, paging);
    appendSorting(params, sortBy, sortDirection);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<PagedResult<CashGeneralMovement>>(`/cashshifts/general-movements${query}`);
  }
};
