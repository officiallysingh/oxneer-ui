'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuctionWorkflowStep, BankDetailVM, BankVM, bankDetailsApi, masterApi } from '@repo/api';
import { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import { Loader2, Landmark, Plus, ArrowRight, AlertCircle } from 'lucide-react';
import { parseApiError } from '@/lib/api-errors';

interface BankDetailFormStepProps {
  step: AuctionWorkflowStep;
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
}

export function BankDetailFormStep({ step, onSubmit, submitting, error }: BankDetailFormStepProps) {
  const [bankDetails, setBankDetails] = useState<BankDetailVM[]>([]);
  const [banks, setBanks] = useState<BankVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [details, bankList] = await Promise.all([
        bankDetailsApi.getAll(),
        masterApi.getBanks(),
      ]);
      setBankDetails(details);
      setBanks(bankList);
      const primary = details.find((d) => d.primary);
      if (primary) setSelectedId(primary.id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
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

      {bankDetails.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center space-y-3">
          <Landmark className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">No bank accounts saved yet.</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-xs"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-4 w-4" />
            Add Bank Account
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {bankDetails.map((d) => (
            <label
              key={d.id}
              className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                selectedId === d.id
                  ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20'
                  : 'border-border/70 bg-card hover:border-border'
              }`}
            >
              <input
                type="radio"
                name="bankDetail"
                value={d.id}
                checked={selectedId === d.id}
                onChange={() => setSelectedId(d.id)}
                className="accent-primary cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{d.bank?.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  IFSC: {d.ifscCode} · A/C: ···{d.accountNo.slice(-4)}
                </p>
              </div>
              {d.primary && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 shrink-0 border border-emerald-500/30">
                  Primary
                </span>
              )}
            </label>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Another Account
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {bankDetails.length > 0 && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={() => onSubmit({ bankDetailId: selectedId })}
            disabled={!selectedId || submitting}
            className="gap-2 min-w-[140px] rounded-xl text-xs font-semibold py-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}

      {showAdd && (
        <AddBankDialog
          banks={banks}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

interface BankFormState {
  bankId: string;
  ifscCode: string;
  accountNo: string;
  cancelCheck: string;
  primary: boolean;
}

const EMPTY_BANK: BankFormState = {
  bankId: '',
  ifscCode: '',
  accountNo: '',
  cancelCheck: '',
  primary: true,
};

function AddBankDialog({
  banks,
  onClose,
  onSaved,
}: {
  banks: BankVM[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<BankFormState>(EMPTY_BANK);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof BankFormState>(k: K, v: BankFormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bankId || !form.ifscCode || !form.accountNo) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await bankDetailsApi.create({
        bank: form.bankId,
        ifscCode: form.ifscCode,
        accountNo: form.accountNo,
        cancelCheck: form.cancelCheck || undefined,
        primary: form.primary,
      });
      onSaved();
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.general ?? 'Failed to save bank account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Add Bank Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Bank Name *</Label>
            <select
              value={form.bankId}
              onChange={(e) => set('bankId', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            >
              <option value="">Select bank…</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">IFSC Code *</Label>
            <Input
              value={form.ifscCode}
              onChange={(e) => set('ifscCode', e.target.value.toUpperCase())}
              placeholder="e.g. SBIN0001234"
              className="rounded-xl font-mono text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Account Number *</Label>
            <Input
              value={form.accountNo}
              onChange={(e) => set('accountNo', e.target.value)}
              placeholder="Account number"
              className="rounded-xl font-mono text-sm"
              required
            />
          </div>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="rounded-xl text-xs gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Bank Account
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
