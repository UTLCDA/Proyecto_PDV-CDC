import { apiClient } from './apiClient';
import { CashGeneralMovement, CashShift } from '../types/reports';

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
  getShiftHistory: () => apiClient.request<CashShift[]>('/cashshifts/history'),
  getGeneralMovements: () => apiClient.request<CashGeneralMovement[]>('/cashshifts/general-movements')
};
