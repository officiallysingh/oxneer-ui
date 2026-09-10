'use client';

/**
 * WorkflowWizard — guides a logged-in participant through their pre-auction
 * workflow steps one at a time.
 *
 * Supported step types:
 *   TNC_FORM_STEP           — display T&C HTML, require explicit acceptance
 *   BANK_DETAIL_FORM_STEP   — pick (or add) one of the user's saved bank accounts
 *   PARTICIPATION_FORM_STEP — fill in a custom form (PropertyDef[])
 *   FORM_STEP               — fill in a custom form (PropertyDef[])
 *   PAYMENT_STEP            — informational only (payment is handled externally)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  auctionsApi,
  bankDetailsApi,
  masterApi,
  participantsApi,
  type AuctionWorkflowStep,
  type BankDetailVM,
  type BankVM,
  type ParticipantVM,
  type PropertyDef,
} from '@repo/api';
import { IFSC_REGEX, ACCOUNT_NO_REGEX } from '@repo/api';
import { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import { resolveStr, formatLabel } from '@/components/common/admin/format';
import {
  Loader2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Landmark,
  ShieldCheck,
  UserCheck,
  FileText,
  AlertCircle,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { parseApiError } from '@/lib/api-errors';

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveStepType(step: AuctionWorkflowStep): string {
  return resolveStr(step.type);
}

function stepIsCompleted(step: AuctionWorkflowStep, participant: ParticipantVM | null): boolean {
  if (!participant?.workflowStatus) return false;
  const entry = participant.workflowStatus[step.id];
  if (!entry) return false;
  const t = resolveStr(entry.type);
  return t === 'COMPLETED' || t === 'DONE' || t === 'APPROVED';
}

const STEP_ICON_MAP: Record<string, React.ElementType> = {
  TNC_FORM_STEP: ShieldCheck,
  BANK_DETAIL_FORM_STEP: Landmark,
  PARTICIPATION_FORM_STEP: UserCheck,
  FORM_STEP: FileText,
  PAYMENT_STEP: CreditCard,
};

function StepIcon({ type, className }: { type: string; className?: string }) {
  const Icon = STEP_ICON_MAP[type] ?? FileText;
  return <Icon className={className} />;
}

// ── Shared error banner ───────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}

// ── T&C Step ─────────────────────────────────────────────────────────────────

function TnCForm({
  step,
  onSubmit,
  submitting,
  error,
}: {
  step: AuctionWorkflowStep;
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [accepted, setAccepted] = useState(false);
  const html = step.tncText ?? '';

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">{step.name || 'Terms & Conditions'}</h3>
        {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
      </div>

      {html ? (
        <div className="rounded-xl border border-border bg-muted/20 max-h-72 overflow-y-auto">
          <div
            className="prose prose-sm dark:prose-invert max-w-none p-5
              [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No terms text provided.</p>
      )}

      <label className="flex items-start gap-3 cursor-pointer select-none group">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span className="text-sm text-foreground group-hover:text-foreground/80">
          I have read and agree to the terms and conditions above.
        </span>
      </label>

      <ErrorBanner message={error} />

      <div className="flex justify-end">
        <Button
          onClick={() => onSubmit({ accepted: true })}
          disabled={!accepted || submitting}
          className="gap-2 min-w-[140px]"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Accept & Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Bank Detail Step ──────────────────────────────────────────────────────────

function BankDetailForm({
  step,
  onSubmit,
  submitting,
  error,
}: {
  step: AuctionWorkflowStep;
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
}) {
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
      // Auto-select primary if present
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
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading bank accounts…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">{step.name || 'Bank Details'}</h3>
        <p className="text-sm text-muted-foreground">
          {step.description ||
            'Select a saved bank account to receive refunds and payouts related to this auction.'}
        </p>
      </div>

      {bankDetails.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-8 text-center">
          <Landmark className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No bank accounts saved yet.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add bank account
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {bankDetails.map((d) => (
            <label
              key={d.id}
              className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                selectedId === d.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <input
                type="radio"
                name="bankDetail"
                value={d.id}
                checked={selectedId === d.id}
                onChange={() => setSelectedId(d.id)}
                className="accent-primary"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{d.bank?.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  IFSC: {d.ifscCode} · A/C: ···{d.accountNo.slice(-4)}
                </p>
              </div>
              {d.primary && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 shrink-0">
                  Primary
                </span>
              )}
            </label>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add another
          </Button>
        </div>
      )}

      <ErrorBanner message={error} />

      {bankDetails.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => onSubmit({ bankDetailId: selectedId })}
            disabled={!selectedId || submitting}
            className="gap-2 min-w-[140px]"
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

      {/* Add bank account inline dialog */}
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

// ── Add bank account dialog (re-used from profile page pattern) ───────────────

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof BankFormState>(k: K, v: BankFormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));
  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.bankId) errs.bankId = 'Please select a bank.';
    if (!IFSC_REGEX.test(form.ifscCode.toUpperCase()))
      errs.ifscCode = 'Invalid IFSC (e.g. ICIC0000733).';
    if (!ACCOUNT_NO_REGEX.test(form.accountNo))
      errs.accountNo = 'Account number must be 9–18 digits.';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setSaving(true);
    try {
      await bankDetailsApi.create({
        bank: form.bankId,
        ifscCode: form.ifscCode.toUpperCase(),
        accountNo: form.accountNo,
        cancelCheck: form.cancelCheck || undefined,
        primary: form.primary,
      });
      onSaved();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to save bank detail.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add bank account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bank select */}
          <div className="space-y-1.5">
            <Label className={fieldErrors.bankId ? 'text-destructive' : ''}>Bank</Label>
            <select
              value={form.bankId}
              onChange={(e) => {
                set('bankId', e.target.value);
                clearErr('bankId');
              }}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${fieldErrors.bankId ? 'border-destructive' : 'border-input'}`}
            >
              <option value="">Select a bank…</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {fieldErrors.bankId && <p className="text-xs text-destructive">{fieldErrors.bankId}</p>}
          </div>

          {/* IFSC */}
          <div className="space-y-1.5">
            <Label className={fieldErrors.ifscCode ? 'text-destructive' : ''}>IFSC code</Label>
            <Input
              value={form.ifscCode}
              onChange={(e) => {
                set('ifscCode', e.target.value.toUpperCase());
                clearErr('ifscCode');
              }}
              placeholder="ICIC0000733"
              maxLength={11}
              className={fieldErrors.ifscCode ? 'border-destructive' : ''}
            />
            {fieldErrors.ifscCode && (
              <p className="text-xs text-destructive">{fieldErrors.ifscCode}</p>
            )}
          </div>

          {/* Account number */}
          <div className="space-y-1.5">
            <Label className={fieldErrors.accountNo ? 'text-destructive' : ''}>
              Account number
            </Label>
            <Input
              value={form.accountNo}
              onChange={(e) => {
                set('accountNo', e.target.value);
                clearErr('accountNo');
              }}
              placeholder="9–18 digit account number"
              maxLength={18}
              className={fieldErrors.accountNo ? 'border-destructive' : ''}
            />
            {fieldErrors.accountNo && (
              <p className="text-xs text-destructive">{fieldErrors.accountNo}</p>
            )}
          </div>

          {/* Primary */}
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.primary}
              onChange={(e) => set('primary', e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Set as primary account
          </label>

          <ErrorBanner message={error} />

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Custom Form Step (FORM_STEP / PARTICIPATION_FORM_STEP) — replaced by
//    ParticipantCustomForm below which owns its own state properly. ───────────

// ── Payment Step (informational only) ────────────────────────────────────────

function PaymentStepInfo({
  step,
  onSubmit,
  submitting,
  error,
}: {
  step: AuctionWorkflowStep;
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
}) {
  const heads = step.heads ?? step.policy?.heads ?? [];
  const mode = resolveStr(step.mode);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">{step.name || 'Payment'}</h3>
        <p className="text-sm text-muted-foreground">
          {step.description ||
            'Complete the payment below. After payment is processed, this step will be marked as done.'}
        </p>
      </div>

      {/* Payment details */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        {mode && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment mode</span>
            <span className="font-medium text-foreground">{formatLabel(mode)}</span>
          </div>
        )}
        {heads.map((h, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-sm border-t border-border/50 pt-3"
          >
            <span className="text-muted-foreground">
              {h.name || `Head ${i + 1}`}
              {h.refundable && (
                <span className="ml-2 text-[10px] rounded-full bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5">
                  refundable
                </span>
              )}
            </span>
            <span className="font-semibold text-foreground">
              {h.basis === 'PERCENTAGE_BASED'
                ? `${h.value}%`
                : `₹${(h.value ?? 0).toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Payment processing is handled externally. Once your payment is confirmed, click the button
        below to mark this step as acknowledged.
      </p>

      <ErrorBanner message={error} />

      <div className="flex justify-end">
        <Button
          onClick={() => onSubmit({ acknowledged: true })}
          disabled={submitting}
          className="gap-2 min-w-[140px]"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Acknowledge & Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Step progress sidebar ─────────────────────────────────────────────────────

function StepSidebar({
  steps,
  currentIndex,
  participant,
}: {
  steps: AuctionWorkflowStep[];
  currentIndex: number;
  participant: ParticipantVM | null;
}) {
  return (
    <ol className="space-y-1">
      {steps.map((step, i) => {
        const done = stepIsCompleted(step, participant);
        const active = i === currentIndex;
        const future = i > currentIndex && !done;
        const type = resolveStepType(step);

        return (
          <li
            key={step.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? 'bg-primary/10 text-primary font-semibold'
                : done
                  ? 'text-emerald-600'
                  : future
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground'
            }`}
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : done
                    ? 'bg-emerald-500/20 text-emerald-600'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate leading-tight">{step.name || formatLabel(type)}</p>
            </div>
            {active && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          </li>
        );
      })}
    </ol>
  );
}

// ── Main Wizard Component ─────────────────────────────────────────────────────

export interface WorkflowWizardProps {
  auctionId: string;
  /** Called when all steps are done or user dismisses. */
  onClose: () => void;
}

export function WorkflowWizard({ auctionId, onClose }: WorkflowWizardProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [steps, setSteps] = useState<AuctionWorkflowStep[]>([]);
  const [participant, setParticipant] = useState<ParticipantVM | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);

  // Load workflow + participant on mount
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      auctionsApi.getAuctionWorkflow(auctionId),
      participantsApi.getSelfParticipant(auctionId).catch(() => null),
    ])
      .then(([wf, p]) => {
        if (cancelled) return;
        // Only PRE_AUCTION steps need to be completed before bidding
        const preSteps = wf.filter((s) => {
          const phase = resolveStr(s.phase);
          // TNC / BANK / PARTICIPATION are always pre-auction
          const type = resolveStepType(s);
          const alwaysPre = [
            'TNC_FORM_STEP',
            'BANK_DETAIL_FORM_STEP',
            'PARTICIPATION_FORM_STEP',
          ].includes(type);
          return alwaysPre || phase === 'PRE_AUCTION' || !phase;
        });
        // Sort by order
        const sorted = [...preSteps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setSteps(sorted);
        setParticipant(p);

        // Find first incomplete step
        const firstIncomplete = sorted.findIndex((s) => !stepIsCompleted(s, p));
        if (firstIncomplete === -1) {
          setAllDone(true);
        } else {
          setCurrentIndex(firstIncomplete);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Failed to load workflow. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auctionId]);

  const currentStep = steps[currentIndex];

  const handleStepSubmit = useCallback(
    async (formData: Record<string, unknown>) => {
      if (!currentStep) return;
      setSubmitting(true);
      setStepError(null);

      const type = resolveStepType(currentStep);

      // Build the request
      const rq: import('@repo/api').ParticipantWorkflowStepRQ = {
        id: currentStep.id,
      };

      if (type === 'TNC_FORM_STEP') {
        // rq.accepted = true;
      } else if (type === 'BANK_DETAIL_FORM_STEP') {
        rq.bankDetailId = formData.bankDetailId as string;
      } else {
        // FORM_STEP / PARTICIPATION_FORM_STEP / PAYMENT_STEP / other
        rq.data = (formData.data as Record<string, unknown>) ?? formData;
      }

      const isAlreadySubmitted = stepIsCompleted(currentStep, participant);

      try {
        if (isAlreadySubmitted) {
          await participantsApi.updateWorkflowStep(auctionId, rq);
        } else {
          await participantsApi.completeWorkflowStep(auctionId, rq);
        }

        // Refresh participant to get updated workflowStatus
        const updated = await participantsApi
          .getSelfParticipant(auctionId)
          .catch(() => participant);
        setParticipant(updated);

        // Advance to next incomplete step
        const nextIncomplete = steps.findIndex(
          (s, i) => i > currentIndex && !stepIsCompleted(s, updated),
        );
        if (nextIncomplete === -1) {
          setAllDone(true);
        } else {
          setCurrentIndex(nextIncomplete);
          setStepError(null);
        }
      } catch (err) {
        const parsed = parseApiError(err);
        setStepError(parsed.general ?? 'Failed to submit step. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [auctionId, currentIndex, currentStep, participant, steps],
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading your workflow…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <AlertCircle className="h-10 w-10 text-destructive/60" />
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  // ── All done ───────────────────────────────────────────────────────────────
  if (allDone || steps.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">All steps completed!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {steps.length === 0
              ? 'No pre-auction steps are required for this auction.'
              : 'You have completed all required pre-auction steps. You are now eligible to participate.'}
          </p>
        </div>
        <Button onClick={onClose} className="mt-2">
          Done
        </Button>
      </div>
    );
  }

  // ── Main wizard UI ─────────────────────────────────────────────────────────
  const type = currentStep ? resolveStepType(currentStep) : '';

  return (
    <div className="flex flex-col md:flex-row gap-0 min-h-0 overflow-hidden">
      {/* Sidebar — step list */}
      <div className="md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Steps
        </p>
        <StepSidebar steps={steps} currentIndex={currentIndex} participant={participant} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-5">
          <StepIcon type={type} className="h-5 w-5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            Step {currentIndex + 1} of {steps.length}
          </p>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(currentIndex / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step form */}
        {currentStep && type === 'TNC_FORM_STEP' && (
          <TnCForm
            step={currentStep}
            onSubmit={handleStepSubmit}
            submitting={submitting}
            error={stepError}
          />
        )}
        {currentStep && type === 'BANK_DETAIL_FORM_STEP' && (
          <BankDetailForm
            step={currentStep}
            onSubmit={handleStepSubmit}
            submitting={submitting}
            error={stepError}
          />
        )}
        {currentStep && (type === 'FORM_STEP' || type === 'PARTICIPATION_FORM_STEP') && (
          <ParticipantCustomForm
            step={currentStep}
            onSubmit={handleStepSubmit}
            submitting={submitting}
            error={stepError}
          />
        )}
        {currentStep && type === 'PAYMENT_STEP' && (
          <PaymentStepInfo
            step={currentStep}
            onSubmit={handleStepSubmit}
            submitting={submitting}
            error={stepError}
          />
        )}
        {currentStep &&
          ![
            'TNC_FORM_STEP',
            'BANK_DETAIL_FORM_STEP',
            'FORM_STEP',
            'PARTICIPATION_FORM_STEP',
            'PAYMENT_STEP',
          ].includes(type) &&
          (currentStep.embedded?.properties?.length ?? 0) > 0 && (
            <ParticipantCustomForm
              step={currentStep}
              onSubmit={handleStepSubmit}
              submitting={submitting}
              error={stepError}
            />
          )}
        {currentStep &&
          ![
            'TNC_FORM_STEP',
            'BANK_DETAIL_FORM_STEP',
            'FORM_STEP',
            'PARTICIPATION_FORM_STEP',
            'PAYMENT_STEP',
          ].includes(type) &&
          (currentStep.embedded?.properties?.length ?? 0) === 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">{currentStep.name || formatLabel(type)}</h3>
              <ErrorBanner message={stepError} />
              <Button onClick={() => handleStepSubmit({})} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
      </div>
    </div>
  );
}

// ── Controlled custom form that owns its state ────────────────────────────────

/**
 * Unlike `CustomFormStep` which naively wraps `PropertyFormPreview`, this
 * component owns the values and passes them through `onSubmit`.
 */
function ParticipantCustomForm({
  step,
  onSubmit,
  submitting,
  error,
}: {
  step: AuctionWorkflowStep;
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
}) {
  const properties: PropertyDef[] = step.embedded?.properties ?? [];
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Build a controlled version of each field — we manage a flat values map
  // and pass setField into a minimal form renderer below.
  const setField = (name: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = () => {
    const missing = properties.filter((p) => {
      const req =
        p.required ||
        (p.validators ?? []).some((v) => {
          const t = resolveStr(v.type as unknown);
          return t === 'NOT_NULL';
        });
      const val = values[p.name];
      return req && (val === undefined || val === '' || val === null);
    });
    if (missing.length > 0) {
      setValidationError(`Please fill in: ${missing.map((p) => p.label).join(', ')}`);
      return;
    }
    setValidationError(null);
    onSubmit({ data: values });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">
          {step.name || formatLabel(resolveStepType(step))}
        </h3>
        {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
        {resolveStepType(step) === 'PARTICIPATION_FORM_STEP' && step.manualApproval && (
          <p className="text-xs text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-lg">
            Your registration will be reviewed and approved manually before you can participate.
          </p>
        )}
      </div>

      {properties.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/10 p-5 space-y-5">
          {properties.map((prop) => (
            <SingleField
              key={prop.name}
              prop={prop}
              value={values[prop.name]}
              onChange={(v) => setField(prop.name, v)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic py-4">No form fields for this step.</p>
      )}

      <ErrorBanner message={validationError ?? error} />

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting} className="gap-2 min-w-[140px]">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Submit & Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Minimal single-field renderer (STRING, NUMBER, BOOLEAN, DATE, FILE) ───────

function SingleField({
  prop,
  value,
  onChange,
}: {
  prop: PropertyDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const dt = resolveStr(prop.dataType as unknown);
  const isReq =
    prop.required ||
    (prop.validators ?? []).some((v) => {
      const t = resolveStr(v.type as unknown);
      return t === 'NOT_NULL';
    });
  const strVal = value !== undefined && value !== null ? String(value) : '';
  const attrs = prop.attributes ?? {};
  const options = attrs['style:options']
    ? attrs['style:options'].split(',').map((o) => {
        const [label, val] = o.trim().split(':');
        return { label: label?.trim() ?? '', value: val?.trim() ?? label?.trim() ?? '' };
      })
    : null;

  const inputBase =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

  const label = (
    <Label className="text-sm font-medium">
      {prop.label}
      {isReq && <span className="text-destructive ml-0.5">*</span>}
    </Label>
  );

  let input: React.ReactNode;

  if (options) {
    input = (
      <select value={strVal} onChange={(e) => onChange(e.target.value)} className={inputBase}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (dt === 'BOOLEAN') {
    input = (
      <div className="flex gap-4">
        {[
          { label: 'Yes', val: 'true' },
          { label: 'No', val: 'false' },
        ].map(({ label: l, val }) => (
          <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={`wf-${prop.name}`}
              value={val}
              checked={strVal === val}
              onChange={() => onChange(val)}
              className="accent-primary"
            />
            {l}
          </label>
        ))}
      </div>
    );
  } else if (dt === 'LOCAL_DATE') {
    input = (
      <input
        type="date"
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        className={inputBase}
      />
    );
  } else if (dt === 'LOCAL_DATE_TIME') {
    input = (
      <input
        type="datetime-local"
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        className={inputBase}
      />
    );
  } else if (
    ['INTEGER', 'LONG', 'FLOAT', 'DOUBLE', 'BIG_DECIMAL', 'SHORT', 'BYTE', 'BIG_INTEGER'].includes(
      dt,
    )
  ) {
    input = (
      <input
        type="number"
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={attrs['html:placeholder'] ?? `Enter ${prop.label.toLowerCase()}…`}
        min={attrs['html:min']}
        max={attrs['html:max']}
        step={
          attrs['html:step'] ??
          (dt.includes('DECIMAL') || dt === 'FLOAT' || dt === 'DOUBLE' ? 'any' : '1')
        }
        className={`${inputBase} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
      />
    );
  } else if (dt === 'FILE') {
    input = (
      <input
        type="file"
        accept={attrs['html:accept']}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => onChange(reader.result as string);
          reader.readAsDataURL(file);
        }}
        className="w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
      />
    );
  } else if (
    attrs['ui:component'] === 'textarea' ||
    (dt === 'STRING' && attrs['ui:multiline'] === 'true')
  ) {
    input = (
      <textarea
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={attrs['html:placeholder'] ?? `Enter ${prop.label.toLowerCase()}…`}
        rows={Number(attrs['ui:rows'] ?? 3)}
        className={`${inputBase} resize-none`}
      />
    );
  } else {
    input = (
      <input
        type="text"
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={attrs['html:placeholder'] ?? `Enter ${prop.label.toLowerCase()}…`}
        maxLength={attrs['html:maxlength'] ? Number(attrs['html:maxlength']) : undefined}
        pattern={attrs['html:pattern']}
        className={inputBase}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {label}
      {input}
      {attrs['form:helper-text'] && (
        <p className="text-xs text-muted-foreground/70">{attrs['form:helper-text']}</p>
      )}
    </div>
  );
}
