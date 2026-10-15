import { ACCOUNT_NO_REGEX, IFSC_REGEX, type BankDetailVM, type BankVM } from '@repo/api';

export const IFSC_LENGTH = 11;
export const IFSC_ERROR = 'IFSC has 11 characters: 4 letters, 0, then 6 letters or digits';
export const ACCOUNT_NO_ERROR = 'Account number must be 9–18 digits, numbers only';

/** "•••• 4521" — full account numbers are never shown after saving. */
export function maskAccountNo(accountNo: string) {
  return `•••• ${accountNo.slice(-4)}`;
}

/** Short tile label for a bank, e.g. "ICICI Bank" → "ICICI". */
export function bankShortName(bank: Pick<BankVM, 'name' | 'ifscPrefix'> | undefined) {
  if (!bank) return '?';
  const first = bank.name.split(/\s+/)[0] ?? '';
  return first.length <= 5 ? first.toUpperCase() : bank.ifscPrefix || first.slice(0, 4);
}

/** "HDFC Bank •••• 0098" */
export function accountLabel(account: BankDetailVM) {
  return `${account.bank?.name ?? 'Bank'} ${maskAccountNo(account.accountNo)}`;
}

/** The bank whose IFSC prefix matches the first 4 characters of the code. */
export function findBankByIfsc(banks: BankVM[], ifsc: string): BankVM | undefined {
  const prefix = ifsc.slice(0, 4).toUpperCase();
  if (prefix.length < 4) return undefined;
  return banks.find((b) => b.ifscPrefix?.toUpperCase() === prefix);
}

export function isValidIfsc(ifsc: string) {
  return IFSC_REGEX.test(ifsc.toUpperCase());
}

export function isValidAccountNo(accountNo: string) {
  return ACCOUNT_NO_REGEX.test(accountNo);
}

/** Whether a cancelled cheque is stored (older records use the string "false" for none). */
export function hasCheque(account: Pick<BankDetailVM, 'cancelCheck'>) {
  return !!account.cancelCheck && account.cancelCheck !== 'false';
}
