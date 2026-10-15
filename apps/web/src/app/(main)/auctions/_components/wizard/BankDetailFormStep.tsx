'use client';

import { useState } from 'react';
import type { AuctionWorkflowStep } from '@repo/api';
import { Button } from '@repo/ui';
import { Loader2, Landmark, Plus, ArrowRight, AlertCircle } from 'lucide-react';
import { BankAccountDialog, BankAccountSummary, useBankAccounts } from '@/components/common/bank';

interface BankDetailFormStepProps {
  step: AuctionWorkflowStep;
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
}

export function BankDetailFormStep({ step, onSubmit, submitting, error }: BankDetailFormStepProps) {
  const bank = useBankAccounts('me');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Default to the primary account until the user picks one.
  const selectedId = pickedId ?? bank.primary?.id ?? '';

  if (bank.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading bank accounts…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 bg-muted/30 border border-border/60 rounded-2xl">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">{step.name || 'Bank Details'}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {step.description ||
              'Select a saved bank account to receive refunds and payouts related to this auction.'}
          </p>
        </div>
      </div>

      {bank.accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center space-y-3">
          <Landmark className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">No bank accounts saved yet.</p>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus />
            Add bank account
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5" role="radiogroup" aria-label="Select saved bank account">
          {bank.accounts.map((d) => {
            const radioId = `bank-radio-${d.id}`;
            const checked = selectedId === d.id;
            return (
              <label
                key={d.id}
                htmlFor={radioId}
                className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                  checked
                    ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20'
                    : 'border-border/70 bg-card hover:border-border'
                }`}
              >
                <input
                  id={radioId}
                  type="radio"
                  name="bankDetail"
                  value={d.id}
                  checked={checked}
                  onChange={() => setPickedId(d.id)}
                  className="accent-primary cursor-pointer"
                />
                <BankAccountSummary account={d} />
              </label>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setShowAdd(true)}
          >
            <Plus />
            Add another account
          </Button>
        </div>
      )}

      {(error || bank.error) && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error ?? bank.error}</span>
        </div>
      )}

      {bank.accounts.length > 0 && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={() => onSubmit({ bankDetailId: selectedId })}
            disabled={!selectedId || submitting}
            className="min-w-[140px]"
          >
            {submitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight />
              </>
            )}
          </Button>
        </div>
      )}

      {showAdd && (
        <BankAccountDialog
          account={null}
          banks={bank.banks}
          currentPrimary={bank.primary}
          onClose={() => setShowAdd(false)}
          onSaved={bank.reload}
        />
      )}
    </div>
  );
}
