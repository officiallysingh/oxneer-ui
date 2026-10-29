'use client';

import { useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lock,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Button, cn } from '@repo/ui';
import type { AuctionWorkflowStep, WorkflowStepPhase, WorkflowStepType } from '@repo/api';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import {
  allowedStepTypesAt,
  fmtLabel,
  paymentStepData,
  resolveStr,
} from '../../../_components/PolicyShared';
import type { WorkflowController } from '../../../_hooks/useWorkflow';
import { effectiveDeadlines, postStepDue, preStepDue } from '../../../_lib/wizard/deadlines';
import { draftFromStep, emptyDraft, type StepDraft } from '../../../_lib/wizard/stepDraft';
import {
  WORKFLOW_TYPE_LABEL,
  headsSummary,
  stepFields,
  stepTitle,
} from '../../../_lib/wizard/workflow';
import { StepEditor } from './StepEditor';
import { STEP_ICON } from './stepIcons';
import { selectClass } from '../ui/wizard-ui';

function stepSummary(step: AuctionWorkflowStep, currencyUnit: string): string[] {
  const type = resolveStr(step.type);
  if (type === 'TNC_FORM_STEP') {
    return [step.tncText ? 'Written terms' : 'Word document', 'Tick to accept'];
  }
  if (type === 'PARTICIPATION_FORM_STEP') {
    const fields = stepFields(step);
    return [
      step.manualApproval ? 'You approve each one' : 'Approved automatically',
      fields.length ? `${fields.length} fields` : 'Form',
    ];
  }
  if (type === 'BANK_DETAIL_FORM_STEP') return ['4 fixed fields'];
  if (type === 'PAYMENT_STEP') {
    const data = paymentStepData(step);
    return [fmtLabel(data.mode) || 'Payment', headsSummary(data.heads, currencyUnit)];
  }
  const fields = stepFields(step);
  return [fields.length ? `${fields.length} fields` : 'Custom form'];
}

interface AddOption {
  type: WorkflowStepType;
  label: string;
  allowed: boolean;
}

/** One phase of the workflow ("Before the auction" or "After the auction"):
 *  each step as a summary row that opens into its editor in place, and a select
 *  to add another step. */
export function StepList({
  phase,
  workflow,
  title,
  subtitle,
  range,
  icon: Icon,
  start,
  closing,
  currencyUnit,
  openingPrice,
  forward,
  hints,
}: {
  phase: WorkflowStepPhase;
  workflow: WorkflowController;
  title: string;
  subtitle: string;
  range?: string;
  icon: LucideIcon;
  start: string;
  closing: string;
  currencyUnit: string;
  openingPrice: string;
  forward: boolean;
  /** Suggestions above the list; `add` opens a new step of that type. */
  hints?: (add: (type: WorkflowStepType) => void) => ReactNode;
}) {
  const pre = phase === 'PRE_AUCTION';
  const steps = pre ? workflow.pre : workflow.post;
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StepDraft | null>(null);
  const [deleting, setDeleting] = useState<AuctionWorkflowStep | null>(null);
  const deadlines = effectiveDeadlines(workflow.pre);

  const insertionOrder = pre ? workflow.pre.length + 1 : workflow.steps.length + 1;
  const has = (type: string, list = workflow.steps) =>
    list.some((step) => resolveStr(step.type) === type);
  const allowed = allowedStepTypesAt(
    workflow.steps,
    insertionOrder,
    has('TNC_FORM_STEP'),
    has('BANK_DETAIL_FORM_STEP', workflow.pre),
    has('PARTICIPATION_FORM_STEP'),
  );
  const options: AddOption[] = pre
    ? [
        { type: 'FORM_STEP', label: 'Custom form', allowed: allowed.formPreAuction },
        { type: 'PAYMENT_STEP', label: 'Payment', allowed: allowed.prePayment },
        {
          type: 'PARTICIPATION_FORM_STEP',
          label: 'Participation form (one per auction)',
          allowed: allowed.participationForm,
        },
        {
          type: 'BANK_DETAIL_FORM_STEP',
          label: 'Bank details (one per phase)',
          allowed: allowed.bank,
        },
        {
          type: 'TNC_FORM_STEP',
          label: 'Terms and conditions (one per auction)',
          allowed: allowed.tnc,
        },
      ]
    : [
        { type: 'PAYMENT_STEP', label: 'Payment', allowed: allowed.postPayment },
        { type: 'FORM_STEP', label: 'Custom form', allowed: allowed.formPostAuction },
        {
          type: 'BANK_DETAIL_FORM_STEP',
          label: 'Bank details (one per phase)',
          allowed: !has('BANK_DETAIL_FORM_STEP', workflow.post),
        },
      ];

  // One new step at a time, so an unsaved one is never silently replaced.
  const startNew = (type: WorkflowStepType) => {
    if (draft) return;
    setDraft(emptyDraft(type, phase));
  };

  return (
    <section aria-label={title} className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center gap-2.5 border-b border-border bg-muted/20 px-4 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {range && (
          <span className="ml-auto rounded-full bg-muted px-2.5 py-1 text-[11px] tabular-nums text-muted-foreground">
            {range}
          </span>
        )}
      </header>

      <div className="space-y-2 p-3">
        {hints?.(startNew)}

        {workflow.loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading steps">
            {[0, 1].map((key) => (
              <div key={key} className="h-[60px] animate-pulse rounded-md bg-muted/50" />
            ))}
          </div>
        ) : (
          steps.map((step, index) => {
            const type = resolveStr(step.type) as WorkflowStepType;
            const StepIcon = STEP_ICON[type] ?? Pencil;
            const order = workflow.steps.findIndex((item) => item.id === step.id) + 1;
            if (openId === step.id) {
              return (
                <StepEditor
                  key={step.id}
                  initial={draftFromStep(step)}
                  step={step}
                  n={index + 1}
                  context={{ workflow: workflow.steps, order, step }}
                  start={start}
                  closing={closing}
                  currencyUnit={currencyUnit}
                  openingPrice={openingPrice}
                  forward={forward}
                  onSave={async (next) => {
                    await workflow.update(step, next);
                    setOpenId(null);
                  }}
                  onAddBankFirst={
                    pre
                      ? async (next) => {
                          // Bank details takes this step's place; the payment moves down one.
                          const fresh = await workflow.addBankBefore(order);
                          await workflow.update(fresh.find((s) => s.id === step.id) ?? step, next);
                          setOpenId(null);
                        }
                      : undefined
                  }
                  onCancel={() => setOpenId(null)}
                />
              );
            }
            const due = pre
              ? preStepDue(step, deadlines[index]!, start)
              : postStepDue(step, closing);
            const name = stepTitle(step);
            return (
              <div
                key={step.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-background px-3 py-2.5 sm:flex-nowrap"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
                  {index + 1}
                </span>
                <StepIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <button
                  type="button"
                  aria-expanded={false}
                  onClick={() => setOpenId(step.id)}
                  className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">{name}</span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {WORKFLOW_TYPE_LABEL[type] ?? fmtLabel(type)}
                    </span>
                    {step.mandatory === false && (
                      <span className="rounded-full border border-input px-2 py-0.5 text-[10px] text-muted-foreground">
                        Optional
                      </span>
                    )}
                    {step.implicit && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground px-2 py-0.5 text-[10px] text-muted-foreground">
                        <Lock className="h-2.5 w-2.5" aria-hidden />
                        Set by the platform
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                    {stepSummary(step, currencyUnit).map((text, i) => (
                      <span
                        key={`${text}-${i}`}
                        className={cn(i > 0 && 'before:mr-2 before:content-["·"]')}
                      >
                        {text}
                      </span>
                    ))}
                  </span>
                </button>
                <span className="order-last flex w-full flex-col rounded-md bg-muted/50 px-2.5 py-1 text-[11px] sm:order-none sm:w-auto sm:shrink-0 sm:text-right">
                  <b className="font-semibold tabular-nums text-foreground">{due.main}</b>
                  <span className="text-muted-foreground">{due.sub}</span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Move ${name} earlier`}
                    disabled={index === 0}
                    onClick={() => void workflow.move(step, -1)}
                  >
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Move ${name} later`}
                    disabled={index === steps.length - 1}
                    onClick={() => void workflow.move(step, 1)}
                  >
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Edit ${name}`}
                    onClick={() => setOpenId(step.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  {!step.implicit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${name}`}
                      onClick={() => setDeleting(step)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  )}
                </span>
              </div>
            );
          })
        )}

        {!workflow.loading && steps.length === 0 && !draft && (
          <p className="rounded-md border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
            {pre
              ? 'No steps before the auction. Add terms, a participation form, bank details or a payment.'
              : 'No steps after the auction yet. Add a payment step to collect the winning amount.'}
          </p>
        )}

        {draft && (
          <StepEditor
            key={`new-${draft.type}`}
            initial={draft}
            n={steps.length + 1}
            context={{ workflow: workflow.steps, order: insertionOrder }}
            start={start}
            closing={closing}
            currencyUnit={currencyUnit}
            openingPrice={openingPrice}
            forward={forward}
            onSave={async (next) => {
              await workflow.add(next, insertionOrder);
              setDraft(null);
            }}
            onAddBankFirst={
              pre
                ? async (next) => {
                    await workflow.addBankBefore(insertionOrder);
                    await workflow.add(next, insertionOrder + 1);
                    setDraft(null);
                  }
                : undefined
            }
            onCancel={() => setDraft(null)}
          />
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <label
            htmlFor={`add-${phase}`}
            className="text-[11px] font-semibold text-muted-foreground"
          >
            Add a step {pre ? 'before' : 'after'} the auction
          </label>
          <select
            id={`add-${phase}`}
            value=""
            disabled={Boolean(draft)}
            aria-describedby={draft ? `add-${phase}-busy` : undefined}
            onChange={(event) => {
              if (event.target.value) startNew(event.target.value as WorkflowStepType);
            }}
            className={cn(selectClass, 'h-9 w-auto min-w-[220px]')}
          >
            <option value="">Choose a step…</option>
            {options.map((option) => (
              <option key={option.type} value={option.type} disabled={!option.allowed}>
                {option.label}
              </option>
            ))}
          </select>
          {draft && (
            <span id={`add-${phase}-busy`} className="text-[11px] text-muted-foreground">
              Add or discard the new step above first.
            </span>
          )}
        </div>

        {workflow.error && (
          <p
            role="alert"
            className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-[11px] text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {workflow.error}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting ? stepTitle(deleting) : 'step'}?`}
        description={
          pre
            ? 'Participants will no longer be asked to complete this step.'
            : 'The winner will no longer be asked to complete this step.'
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const step = deleting;
          setDeleting(null);
          if (step) void workflow.remove(step);
        }}
      />
    </section>
  );
}
