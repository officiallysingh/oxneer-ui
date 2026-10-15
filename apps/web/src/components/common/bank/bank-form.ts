import type { BankDetailCreationRQ, BankDetailUpdationRQ, BankDetailVM } from '@repo/api';
import {
  ACCOUNT_NO_ERROR,
  hasCheque,
  IFSC_ERROR,
  IFSC_LENGTH,
  isValidAccountNo,
  isValidIfsc,
} from './bank-utils';

export interface BankFormValues {
  ifscCode: string;
  /** Picked bank; detected from the IFSC unless the user overrides it. */
  bankId: string;
  accountNo: string;
  confirmAccountNo: string;
  cancelCheck: string;
  primary: boolean;
}

export type BankFormField = keyof BankFormValues;
export type BankFormErrors = Partial<Record<BankFormField, string>>;

export function initialBankForm(
  account: BankDetailVM | null,
  makePrimary: boolean,
): BankFormValues {
  return {
    ifscCode: account?.ifscCode ?? '',
    bankId: account?.bank?.id ?? '',
    accountNo: '',
    confirmAccountNo: '',
    cancelCheck: account && hasCheque(account) ? account.cancelCheck : '',
    primary: account ? account.primary : makePrimary,
  };
}

/**
 * @param changingAccountNo false when editing and the stored number is kept.
 */
export function validateBankForm(v: BankFormValues, changingAccountNo: boolean): BankFormErrors {
  const errors: BankFormErrors = {};
  if (!isValidIfsc(v.ifscCode))
    errors.ifscCode = `${IFSC_ERROR} (${v.ifscCode.length}/${IFSC_LENGTH})`;
  else if (!v.bankId) errors.bankId = 'Choose the bank for this IFSC';
  if (changingAccountNo) {
    if (!isValidAccountNo(v.accountNo)) errors.accountNo = ACCOUNT_NO_ERROR;
    else if (v.confirmAccountNo !== v.accountNo)
      errors.confirmAccountNo = 'Account numbers don’t match';
  }
  return errors;
}

export function toCreateRequest(v: BankFormValues): BankDetailCreationRQ {
  return {
    bank: v.bankId,
    ifscCode: v.ifscCode.toUpperCase(),
    accountNo: v.accountNo,
    cancelCheck: v.cancelCheck || undefined,
    primary: v.primary,
  };
}

/** Only what changed; the account number only when it is being replaced. */
export function toUpdateRequest(
  v: BankFormValues,
  original: BankFormValues,
  changingAccountNo: boolean,
): BankDetailUpdationRQ {
  const patch: BankDetailUpdationRQ = {};
  if (v.bankId !== original.bankId) patch.bank = v.bankId;
  if (v.ifscCode.toUpperCase() !== original.ifscCode.toUpperCase())
    patch.ifscCode = v.ifscCode.toUpperCase();
  if (changingAccountNo) patch.accountNo = v.accountNo;
  if (v.cancelCheck !== original.cancelCheck) patch.cancelCheck = v.cancelCheck;
  if (v.primary !== original.primary) patch.primary = v.primary;
  return patch;
}

/** API violation property → form field. */
export function mapBankApiErrors(apiErrors: Record<string, string>): BankFormErrors {
  const map: Record<string, BankFormField> = {
    ifscCode: 'ifscCode',
    bank: 'bankId',
    accountNo: 'accountNo',
    cancelCheck: 'cancelCheck',
  };
  const errors: BankFormErrors = {};
  for (const [key, message] of Object.entries(apiErrors)) {
    const field = map[key];
    if (field) errors[field] = message;
  }
  return errors;
}
