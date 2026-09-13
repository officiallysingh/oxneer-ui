import { apiClient } from './client';
import type { BankVM } from './master';

// ── View Models ───────────────────────────────────────────────────────────────

export interface BankDetailVM {
  id: string;
  bank: BankVM;
  ifscCode: string;
  accountNo: string;
  cancelCheck: string;
  primary: boolean;
}

// ── Request Models ────────────────────────────────────────────────────────────

export interface BankDetailCreationRQ {
  bank: string;
  ifscCode: string;
  accountNo: string;
  cancelCheck?: string;
  primary?: boolean;
}

export interface BankDetailUpdationRQ {
  bank?: string;
  ifscCode?: string;
  accountNo?: string;
  cancelCheck?: string;
  primary?: boolean;
}

// ── Validation ────────────────────────────────────────────────────────────────
// IFSC:       ^[A-Z]{4}0[A-Z0-9]{6}$
// Account No: ^\d{9,18}$

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_NO_REGEX = /^\d{9,18}$/;

// ── API ───────────────────────────────────────────────────────────────────────

export const bankDetailsApi = {
  /** GET /api/v1/users/me/bank-details — list all bank details for the authenticated user */
  getAll: async (): Promise<BankDetailVM[]> => {
    const response = await apiClient.get('/api/v1/users/me/bank-details');
    return response.data;
  },

  /** GET /api/v1/users/{username}/bank-details — list all bank details for a given user (admin) */
  getByUsername: async (username: string): Promise<BankDetailVM[]> => {
    const response = await apiClient.get(`/api/v1/users/${username}/bank-details`);
    return response.data;
  },

  /** POST /api/v1/users/me/bank-details — create a bank detail */
  create: async (data: BankDetailCreationRQ): Promise<void> => {
    await apiClient.post('/api/v1/users/me/bank-details', data);
  },

  /** PATCH /api/v1/users/me/bank-details/{id} — update a bank detail */
  update: async (id: string, data: BankDetailUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/users/me/bank-details/${id}`, data);
  },

  /** DELETE /api/v1/users/me/bank-details/{id} — delete a bank detail */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/users/me/bank-details/${id}`);
  },
};
