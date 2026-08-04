import { apiClient } from './apiClient';
import { CashShift } from '../types/reports';

export const cashShiftService = {
  getCurrentShift: () => apiClient.request<CashShift>('/cashshifts/current'),
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
  closeShift: (actualClosingAmount: number, notes: string) =>
    apiClient.request<CashShift>('/cashshifts/close', {
      method: 'POST',
      body: JSON.stringify({ actualClosingAmount, notes })
    }),
  getShiftHistory: () => apiClient.request<CashShift[]>('/cashshifts/history')
};
