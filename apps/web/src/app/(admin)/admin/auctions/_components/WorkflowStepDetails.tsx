'use client';

import { useState } from 'react';
import { CreditCard, Landmark, ShieldCheck, UserCheck, FileText, Upload } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AuctionWorkflowStep } from '@repo/api';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import { resolveStr, fmtLabel, paymentStepData, formatOffsetLabel } from './PolicyShared';
import { PropertyFormPreview } from '@/app/(admin)/admin/metadata/_components/PropertyFormPreview';

/**
 * Per-step-type visual identity and detail rendering, shared between the
 * workflow builder's step cards (AuctionStep5Workflow) and the read-only
 * auction view's workflow timeline — kept in one place so both surfaces stay
 * visually consistent and don't drift when a step type's fields change.
 */

export const STEP_TYPE_META: Record<
  string,
  { Icon: LucideIcon; dot: string; text: string; border: string }
> = {
  PAYMENT_STEP: {
    Icon: CreditCard,
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500',
  },
  BANK_DETAIL_FORM_STEP: {
    Icon: Landmark,
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500',
  },
  TNC_FORM_STEP: {
    Icon: ShieldCheck,
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500',
  },
  PARTICIPATION_FORM_STEP: {
    Icon: UserCheck,
    dot: 'bg-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500',
  },
  FORM_STEP: {
    Icon: FileText,
    dot: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500',
  },
};

const DEFAULT_STEP_META = {
  Icon: FileText,
  dot: 'bg-muted-foreground',
  text: 'text-muted-foreground',
  border: 'border-muted-foreground',
};

export function stepTypeMeta(type?: unknown) {
  return STEP_TYPE_META[resolveStr(type)] ?? DEFAULT_STEP_META;
}

export function StepTypeIcon({ type, className }: { type?: unknown; className?: string }) {
  const { Icon } = stepTypeMeta(type);
  return <Icon className={className} />;
}

/** Every step type except TNC_FORM_STEP / PARTICIPATION_FORM_STEP (hardcoded to
 *  PRE_AUCTION server-side) carries an explicit before/after-auction phase —
 *  badge it consistently wherever a step is shown. Renders nothing if the step
 *  has no phase (e.g. Bank Detail steps). */
export function WorkflowStepPhaseBadge({ phase }: { phase?: unknown }) {
  const value = resolveStr(phase);
  if (!value) return null;
  const isPre = value === 'PRE_AUCTION';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${
        isPre
          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
      }`}
    >
      {isPre ? 'Pre Auction' : 'Post Auction'}
    </span>
  );
}

// ── Payment step ──────────────────────────────────────────────────────────────

export function PaymentStepDetails({ step }: { step: AuctionWorkflowStep }) {
  const { phase, mode, offset, heads } = paymentStepData(step);
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-3 text-xs">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className="text-muted-foreground">
          Phase:{' '}
          <span className="text-foreground font-medium">
            {phase === 'PRE_AUCTION' ? 'Pre Payment' : 'Post Payment'}
          </span>
        </span>
        {mode && (
          <span className="text-muted-foreground">
            Mode: <span className="text-foreground font-medium">{fmtLabel(mode)}</span>
          </span>
        )}
        <span className="text-muted-foreground">
          {phase === 'PRE_AUCTION' ? 'Offset from auction start:' : 'Offset from auction end:'}{' '}
          <span className="text-foreground font-medium">{formatOffsetLabel(offset)}</span>
        </span>
      </div>
      {heads.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {heads.map((h, i) => (
            <div key={i} className="rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{h.name}</span>
                <span className="text-muted-foreground">
                  {h.value}
                  {h.basis === 'PERCENTAGE_BASED' ? '%' : ''}
                </span>
              </div>
              {h.description && <p className="text-muted-foreground mt-0.5">{h.description}</p>}
              {h.refundable && (
                <span className="inline-block mt-1 rounded-full bg-success/10 text-success px-1.5 py-0.5 text-[10px]">
                  Refundable
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bank details (fixed schema, no configurable fields) ─────────────────────

const BANK_DETAIL_FIELDS = [
  { label: 'Bank Name', placeholder: 'e.g. State Bank of India' },
  { label: 'Bank IFSC Code', placeholder: 'ICIC0000733' },
  { label: 'Bank Account Number', placeholder: '003210513654' },
];

export function BankDetailStepDetails() {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-3 text-xs">
      <p className="text-muted-foreground">
        Participant provides these bank details to receive winning-amount refunds/payouts.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BANK_DETAIL_FIELDS.map((f) => (
          <div key={f.label} className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">{f.label}</span>
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-1.5 text-muted-foreground/70">
              {f.placeholder}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <span className="text-[11px] font-medium text-muted-foreground">Cancel Check</span>
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-2 text-muted-foreground/70">
          <Upload className="h-3.5 w-3.5" />
          Cancelled cheque image upload
        </div>
      </div>
    </div>
  );
}

// ── Participation form step ─────────────────────────────────────────────────

export function ParticipationFormStepDetails({ step }: { step: AuctionWorkflowStep }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-3 text-xs">
      <p className="text-muted-foreground">
        Participant submits this registration form to join the auction.
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className="text-muted-foreground">
          Manual approval:{' '}
          <span className="text-foreground font-medium">
            {step.manualApproval ? 'Required' : 'Not required'}
          </span>
        </span>
      </div>

      {(step.embedded?.properties?.length ?? 0) > 0 && (
        <div className="pt-2 border-t border-border/40">
          <p className="text-[11px] font-medium text-muted-foreground mb-2">Form Fields</p>
          <PropertyFormPreview properties={step.embedded!.properties!} disabled={true} />
        </div>
      )}
    </div>
  );
}

// ── Terms & Conditions step ─────────────────────────────────────────────────

export function TnCStepDetails({ step }: { step: AuctionWorkflowStep }) {
  const [open, setOpen] = useState(false);
  const html = step.tncText ?? '';

  if (!html) return null;

  return (
    <>
      <div className="rounded-lg border border-border bg-background">
        <div className="relative max-h-32 overflow-hidden">
          <div
            className="prose prose-sm dark:prose-invert max-w-none p-4
                    [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
        </div>
        <div className="flex justify-center border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-primary"
            onClick={() => setOpen(true)}
          >
            View full Terms &amp; Conditions
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Terms &amp; Conditions</DialogTitle>
          </DialogHeader>
          <div
            className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto flex-1
                    [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Custom form step — its own properties are rendered separately via
//    PropertyFormPreview; this just surfaces the before/after-auction phase. ─

export function FormStepDetails({ step }: { step: AuctionWorkflowStep }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-3 text-xs">
      {step.phase && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Collected:</span>
          <WorkflowStepPhaseBadge phase={step.phase} />
        </div>
      )}

      {(step.embedded?.properties?.length ?? 0) > 0 && (
        <div className="pt-2 border-t border-border/40">
          <p className="text-[11px] font-medium text-muted-foreground mb-2">Form Fields</p>
          <PropertyFormPreview properties={step.embedded!.properties!} disabled={true} />
        </div>
      )}
    </div>
  );
}
