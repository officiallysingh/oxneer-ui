'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { BankDetailVM } from '@repo/api';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@repo/ui';
import { accountLabel } from './bank-utils';

interface RemoveBankAccountDialogProps {
  account: BankDetailVM;
  /** The user's other accounts — one must become primary when removing the primary. */
  others: BankDetailVM[];
  onCancel: () => void;
  /** Resolves true when removed. */
  onConfirm: (newPrimary?: BankDetailVM) => Promise<boolean>;
}

/** Confirms removal; for the primary account, asks which account takes over payouts. */
export function RemoveBankAccountDialog({
  account,
  others,
  onCancel,
  onConfirm,
}: RemoveBankAccountDialogProps) {
  const needsNewPrimary = account.primary && others.length > 0;
  const [newPrimaryId, setNewPrimaryId] = useState(others[0]?.id ?? '');
  const [removing, setRemoving] = useState(false);

  const confirm = async () => {
    setRemoving(true);
    const removed = await onConfirm(
      needsNewPrimary ? others.find((o) => o.id === newPrimaryId) : undefined,
    );
    setRemoving(false);
    if (removed) onCancel();
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && !removing && onCancel()}>
      <AlertDialogContent className="max-w-[440px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-lg">
            Remove {accountLabel(account)}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {needsNewPrimary
              ? 'This is your primary account. Choose where future payouts should go.'
              : account.primary
                ? 'This is your only account. You’ll need to add another to receive payouts.'
                : 'You can add it again later.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {needsNewPrimary && (
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">New primary account</legend>
            {others.map((o) => {
              const checked = o.id === newPrimaryId;
              return (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md border-[1.5px] p-3 ${checked ? 'border-primary bg-primary/[0.06]' : 'border-border'}`}
                >
                  <input
                    type="radio"
                    name="new-primary"
                    checked={checked}
                    onChange={() => setNewPrimaryId(o.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="flex-1">
                    <span className="block font-semibold">{accountLabel(o)}</span>
                    {checked && (
                      <span className="text-[12.5px] text-muted-foreground">Becomes primary</span>
                    )}
                  </span>
                </label>
              );
            })}
            <p className="text-[12.5px] text-muted-foreground">
              Payouts already in progress still go to the old account.
            </p>
          </fieldset>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={removing}>
            {removing && <Loader2 className="animate-spin" />}
            Remove account
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
