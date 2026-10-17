'use client';

import { useMemo, useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { bankDetailsApi, type BankDetailVM, type BankVM } from '@repo/api';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  toast,
} from '@repo/ui';
import { CancelChequeUpload } from '@/components/common/admin/CancelChequeUpload';
import { FormField } from '@/components/common/admin/FormField';
import { SaveButton } from '@/components/common/admin/SaveButton';
import { ToggleField } from '@/components/common/admin/ToggleField';
import { parseApiError } from '@/lib/api-errors';
import { IFSC_TIP } from '@/lib/validation';
import {
  initialBankForm,
  mapBankApiErrors,
  toCreateRequest,
  toUpdateRequest,
  validateBankForm,
  type BankFormErrors,
  type BankFormValues,
} from './bank-form';
import {
  accountLabel,
  bankShortName,
  findBankByIfsc,
  IFSC_LENGTH,
  isValidIfsc,
  maskAccountNo,
} from './bank-utils';

interface BankAccountDialogProps {
  /** The account to edit; null adds a new one. */
  account: BankDetailVM | null;
  banks: BankVM[];
  /** The user's current primary account, if any. */
  currentPrimary?: BankDetailVM;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Add / edit a bank account, IFSC first: the bank is detected from the IFSC prefix.
 * Mount it fresh for each open (render conditionally) so its state starts clean.
 */
export function BankAccountDialog({
  account,
  banks,
  currentPrimary,
  onClose,
  onSaved,
}: BankAccountDialogProps) {
  const editing = !!account;
  const isFirst = !editing && !currentPrimary;
  const original = useMemo(() => initialBankForm(account, isFirst), [account, isFirst]);

  const [values, setValues] = useState<BankFormValues>(original);
  const [errors, setErrors] = useState<BankFormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingAccountNo, setChangingAccountNo] = useState(!editing);
  const [showAccountNo, setShowAccountNo] = useState(false);
  const [pickBankManually, setPickBankManually] = useState(false);

  const detectedBank = findBankByIfsc(banks, values.ifscCode);
  const selectedBank = banks.find((b) => b.id === values.bankId) ?? account?.bank;
  const ifscValid = isValidIfsc(values.ifscCode);
  const accountNosMatch =
    !!values.accountNo && values.accountNo === values.confirmAccountNo && !errors.confirmAccountNo;

  const set = <K extends keyof BankFormValues>(key: K, value: BankFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setIfsc = (raw: string) => {
    const ifscCode = raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, IFSC_LENGTH);
    const detected = findBankByIfsc(banks, ifscCode);
    setValues((prev) => ({
      ...prev,
      ifscCode,
      bankId: pickBankManually ? prev.bankId : (detected?.id ?? ''),
    }));
    setErrors((prev) => ({ ...prev, ifscCode: undefined, bankId: undefined }));
  };

  const patch = editing ? toUpdateRequest(values, original, changingAccountNo) : null;
  const unchanged = !!patch && Object.keys(patch).length === 0;

  const submit = async () => {
    setGeneralError(null);
    const found = validateBankForm(values, changingAccountNo);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      if (account && patch) await bankDetailsApi.update(account.id, patch);
      else await bankDetailsApi.create(toCreateRequest(values));
      toast.success(editing ? 'Bank account updated' : 'Bank account added');
      onSaved();
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      const fieldErrors = mapBankApiErrors(parsed.fieldErrors);
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0)
        setGeneralError(parsed.general ?? 'Couldn’t save the bank account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const primaryHelp = isFirst
    ? 'Your first account becomes primary automatically.'
    : account?.primary
      ? 'This is your primary account. Make another account primary to change it.'
      : currentPrimary
        ? `Payouts go here. ${accountLabel(currentPrimary)} will become secondary.`
        : 'Payouts go to your primary account.';

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="flex max-h-[92vh] max-w-[500px] flex-col gap-0 p-0">
        <DialogHeader className="px-6 pb-1 pt-5 text-left">
          <DialogTitle className="font-display text-xl">
            {account ? `Edit ${accountLabel(account)}` : 'Add bank account'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? 'Changes apply to future payouts.'
              : 'Enter the IFSC first. We’ll fill in the bank.'}
          </DialogDescription>
        </DialogHeader>

        <form
          id="bank-account-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-4 overflow-y-auto px-6 py-4"
        >
          <FormField
            id="bank-ifsc"
            label="IFSC code"
            value={values.ifscCode}
            onChange={setIfsc}
            error={errors.ifscCode}
            tip={IFSC_TIP}
            placeholder="ICIC0000733"
            maxLength={IFSC_LENGTH}
            inputClassName="font-mono uppercase tracking-wider"
            suffix={
              ifscValid ? <Check className="h-4 w-4 text-success" aria-label="Valid IFSC" /> : null
            }
          >
            {ifscValid && selectedBank && !pickBankManually && (
              <div className="flex items-center gap-2.5 rounded-md bg-muted/60 px-3 py-2.5">
                <span className="grid h-8 w-10 shrink-0 place-items-center rounded-md bg-background text-[11px] font-semibold">
                  {bankShortName(selectedBank)}
                </span>
                <span className="min-w-0 flex-1 text-[13.5px] font-semibold">
                  {selectedBank.name}
                </span>
                <button
                  type="button"
                  onClick={() => setPickBankManually(true)}
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Not right?
                </button>
              </div>
            )}
          </FormField>

          {ifscValid && (pickBankManually || !detectedBank) && (
            <div className="space-y-1.5">
              <Label htmlFor="bank-select" className={errors.bankId ? 'text-destructive' : ''}>
                Bank
              </Label>
              <select
                id="bank-select"
                value={values.bankId}
                onChange={(e) => set('bankId', e.target.value)}
                aria-invalid={!!errors.bankId}
                className={`h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring ${errors.bankId ? 'border-destructive' : 'border-input'}`}
              >
                <option value="">Select a bank…</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.bankId && (
                <p className="text-xs font-medium text-destructive">{errors.bankId}</p>
              )}
            </div>
          )}

          {changingAccountNo ? (
            <>
              <FormField
                id="bank-account-no"
                label="Account number"
                type={showAccountNo ? 'text' : 'password'}
                value={values.accountNo}
                onChange={(v) => set('accountNo', v.replace(/\D/g, ''))}
                error={errors.accountNo}
                inputMode="numeric"
                maxLength={18}
                hint="9–18 digits, numbers only."
                inputClassName="tracking-widest"
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowAccountNo((s) => !s)}
                    aria-label={showAccountNo ? 'Hide account number' : 'Show account number'}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showAccountNo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              <FormField
                id="bank-account-no-confirm"
                label="Re-enter account number"
                value={values.confirmAccountNo}
                onChange={(v) => set('confirmAccountNo', v.replace(/\D/g, ''))}
                error={errors.confirmAccountNo}
                inputMode="numeric"
                maxLength={18}
                inputClassName="font-mono tracking-wider"
              >
                {accountNosMatch && (
                  <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-success">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Account numbers match
                  </p>
                )}
              </FormField>
            </>
          ) : (
            account && (
              <div className="space-y-1.5">
                <span className="text-sm font-medium">Account number</span>
                <div className="flex h-10 items-center gap-2.5 rounded-md border border-input bg-muted/60 px-3">
                  <span className="flex-1 font-mono tracking-wider text-muted-foreground">
                    {maskAccountNo(account.accountNo)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setChangingAccountNo(true)}
                    className="text-[12.5px] font-medium text-primary underline underline-offset-4"
                  >
                    Change
                  </button>
                </div>
                <p className="text-[12.5px] text-muted-foreground">
                  Changing the number asks you to enter it twice.
                </p>
              </div>
            )
          )}

          <div className="space-y-1">
            <CancelChequeUpload
              value={values.cancelCheck}
              onChange={(v) => set('cancelCheck', v ?? '')}
              error={errors.cancelCheck}
            />
            <p className="text-[12.5px] text-muted-foreground">
              Helps us check the account if a payout fails.
            </p>
          </div>

          <div className="rounded-md border border-border px-3.5 py-3">
            <ToggleField
              label="Set as primary account"
              description={primaryHelp}
              value={values.primary}
              onChange={(v) => set('primary', v)}
              disabled={isFirst || !!account?.primary}
            />
          </div>

          {generalError && (
            <p role="alert" className="text-sm text-destructive">
              {generalError}
            </p>
          )}
        </form>

        <DialogFooter className="gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <SaveButton
            form="bank-account-form"
            saving={saving}
            label={editing ? 'Save changes' : 'Save account'}
            disabled={unchanged}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
