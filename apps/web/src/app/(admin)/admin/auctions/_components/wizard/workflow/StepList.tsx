'use client';

import { useState } from 'react';
import { AlertTriangle, Lock, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react';
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
import {
  draftFromStep,
  emptyDraft,
  paymentsMissingBank,
  type StepDraft,
} from '../../../_lib/wizard/stepDraft';
import { parseApiError } from '@/lib/api-errors';
import { ISSUE_ANCHOR } from '../../../_lib/wizard/validation';
import {
  WORKFLOW_TYPE_LABEL,
  headsSummary,
  stepFields,
  stepTitle,
} from '../../../_lib/wizard/workflow';
import { StepEditor } from './StepEditor';
import { STEP_ICON } from './stepIcons';

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

/** A fixed place in the workflow for one step type. Steps always run in slot
 *  order, so there is nothing to reorder. */
interface Slot {
  type: WorkflowStepType;
  /** Several steps of this type are allowed. */
  multi: boolean;
  empty: string;
  text: string;
  /** The slot is recommended for this auction, so its empty state warns. */
  warn?: boolean;
  add: string;
  more?: string;
}

function slotsFor(pre: boolean, forward: boolean): Slot[] {
  if (pre) {
    return [
      {
        type: 'TNC_FORM_STEP',
        multi: false,
        empty: 'No terms and conditions',
        text: 'Participants tick to accept your terms before anything else.',
        add: 'Add terms',
      },
      {
        type: 'PARTICIPATION_FORM_STEP',
        multi: false,
        empty: 'No participation form',
        text: 'Ask who is taking part, and approve each one if you want to.',
        add: 'Add participation form',
      },
      {
        type: 'FORM_STEP',
        multi: true,
        empty: 'No custom forms',
        text: 'Collect extra details participants fill in.',
        add: 'Add custom form',
        more: 'Add another custom form',
      },
      {
        type: 'BANK_DETAIL_FORM_STEP',
        multi: false,
        empty: 'No bank details',
        text: 'Where refundable deposits are returned.',
        add: 'Add bank details',
      },
      {
        type: 'PAYMENT_STEP',
        multi: true,
        empty: 'No payments',
        text: 'Collect a deposit or fee before the auction.',
        add: 'Add payment',
        more: 'Add another payment',
      },
    ];
  }
  return [
    {
      type: 'BANK_DETAIL_FORM_STEP',
      multi: false,
      empty: 'No bank details',
      text: forward
        ? 'Where payouts to the winner are sent.'
        : 'The platform pays the winning supplier, so they need to give bank details.',
      warn: !forward,
      add: 'Add bank details',
    },
    {
      type: 'PAYMENT_STEP',
      multi: true,
      empty: 'No payments',
      text: forward
        ? 'No step collects the winning amount yet.'
        : 'Collect a fee from the winning supplier.',
      warn: forward,
      add: 'Add payment',
      more: 'Add another payment',
    },
    {
      type: 'FORM_STEP',
      multi: true,
      empty: 'No custom forms',
      text: 'Collect extra details the winner fills in.',
      add: 'Add custom form',
      more: 'Add another custom form',
    },
  ];
}

/** One phase of the workflow ("Before the auction" or "After the auction"):
 *  a fixed slot per step type, in the order the steps run. Empty slots offer
 *  an Add button; saved steps are summary rows that open into their editor. */
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
}) {
  const pre = phase === 'PRE_AUCTION';
  const steps = pre ? workflow.pre : workflow.post;
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StepDraft | null>(null);
  const [deleting, setDeleting] = useState<AuctionWorkflowStep | null>(null);
  const [arranging, setArranging] = useState(false);
  const deadlines = effectiveDeadlines(workflow.pre);

  const slots = slotsFor(pre, forward);
  const typeOf = (step: AuctionWorkflowStep) => resolveStr(step.type) as WorkflowStepType;
  const rank = (type: WorkflowStepType) => {
    const index = slots.findIndex((slot) => slot.type === type);
    return index === -1 ? slots.length : index;
  };
  // Steps in slot order; types without a slot trail at the end.
  const ordered = slots
    .flatMap((slot) => steps.filter((step) => typeOf(step) === slot.type))
    .concat(steps.filter((step) => rank(typeOf(step)) === slots.length));
  const outOfOrder = ordered.some((step, index) => step.id !== steps[index]?.id);

  /** Where a new step of `type` is saved: after every step in its own and earlier slots. */
  const insertionOrder = (type: WorkflowStepType) => {
    const next = steps.findIndex((step) => rank(typeOf(step)) > rank(type));
    return (pre ? 0 : workflow.pre.length) + (next === -1 ? steps.length : next) + 1;
  };
  const has = (type: string, list = workflow.steps) =>
    list.some((step) => resolveStr(step.type) === type);
  // Bank details may appear once per auction, across both phases (the API
  // refuses a second one with WORKFLOW_STEP_ALREADY_EXISTS).
  const bankInOtherPhase = !has('BANK_DETAIL_FORM_STEP', steps) && has('BANK_DETAIL_FORM_STEP');
  const canAdd = (type: WorkflowStepType) => {
    const allowed = allowedStepTypesAt(
      workflow.steps,
      insertionOrder(type),
      has('TNC_FORM_STEP'),
      has('BANK_DETAIL_FORM_STEP'),
      has('PARTICIPATION_FORM_STEP'),
    );
    if (type === 'TNC_FORM_STEP') return allowed.tnc;
    if (type === 'PARTICIPATION_FORM_STEP') return allowed.participationForm;
    if (type === 'BANK_DETAIL_FORM_STEP') {
      return pre ? allowed.bank : !has('BANK_DETAIL_FORM_STEP');
    }
    if (type === 'PAYMENT_STEP') return pre ? allowed.prePayment : allowed.postPayment;
    return pre ? allowed.formPreAuction : allowed.formPostAuction;
  };

  const [fixingBank, setFixingBank] = useState(false);
  const unbanked = pre ? paymentsMissingBank(workflow.steps) : [];
  const hasPreBank = has('BANK_DETAIL_FORM_STEP', workflow.pre);

  // One new step at a time, so an unsaved one is never silently replaced.
  const startNew = (type: WorkflowStepType) => {
    if (draft) return;
    setOpenId(null);
    setDraft(emptyDraft(type, phase));
  };

  const putInOrder = async () => {
    setArranging(true);
    try {
      await workflow.arrange(
        !pre,
        ordered.map((step) => step.id),
      );
    } finally {
      setArranging(false);
    }
  };

  const addBank = async () => {
    setFixingBank(true);
    try {
      await workflow.addBankBefore(insertionOrder('BANK_DETAIL_FORM_STEP'));
    } catch (err) {
      workflow.setError(parseApiError(err).summary);
    } finally {
      setFixingBank(false);
    }
  };

  const renderStep = (step: AuctionWorkflowStep) => {
    const type = typeOf(step);
    const StepIcon = STEP_ICON[type] ?? Pencil;
    const n = ordered.findIndex((item) => item.id === step.id) + 1;
    const order = workflow.steps.findIndex((item) => item.id === step.id) + 1;
    if (openId === step.id) {
      return (
        <StepEditor
          key={step.id}
          initial={draftFromStep(step)}
          step={step}
          n={n}
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
                  // Bank details goes in its own slot, ahead of every payment.
                  const fresh = await workflow.addBankBefore(
                    insertionOrder('BANK_DETAIL_FORM_STEP'),
                  );
                  await workflow.update(fresh.find((s) => s.id === step.id) ?? step, next);
                  setOpenId(null);
                }
              : undefined
          }
          onCancel={() => setOpenId(null)}
        />
      );
    }
    const index = workflow.pre.findIndex((item) => item.id === step.id);
    const due = pre ? preStepDue(step, deadlines[index]!, start) : postStepDue(step, closing);
    const name = stepTitle(step);
    return (
      <div
        key={step.id}
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-background px-3 py-2.5 sm:flex-nowrap"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
          {n}
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
  };

  const renderDraft = (type: WorkflowStepType) => {
    if (draft?.type !== type) return null;
    const order = insertionOrder(type);
    return (
      <StepEditor
        key={`new-${type}`}
        initial={draft}
        n={ordered.filter((step) => rank(typeOf(step)) <= rank(type)).length + 1}
        context={{ workflow: workflow.steps, order }}
        start={start}
        closing={closing}
        currencyUnit={currencyUnit}
        openingPrice={openingPrice}
        forward={forward}
        onSave={async (next) => {
          await workflow.add(next, order);
          setDraft(null);
        }}
        onAddBankFirst={
          pre
            ? async (next) => {
                // Bank details' slot comes before this one, so the new step moves down one.
                await workflow.addBankBefore(insertionOrder('BANK_DETAIL_FORM_STEP'));
                await workflow.add(next, order + 1);
                setDraft(null);
              }
            : undefined
        }
        onCancel={() => setDraft(null)}
      />
    );
  };

  const unslotted = ordered.filter((step) => rank(typeOf(step)) === slots.length);

  return (
    <section
      id={pre ? ISSUE_ANCHOR.stepsBeforeAuction : undefined}
      tabIndex={pre ? -1 : undefined}
      aria-label={title}
      className="scroll-mt-4 overflow-hidden rounded-none border border-border bg-card focus-visible:outline-none"
    >
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
        {!workflow.loading && outOfOrder && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] leading-snug text-foreground"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
            <span className="min-w-0 flex-1">
              These steps were saved in a different order from the one shown here.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={arranging}
              className="h-7 text-[11px]"
              onClick={() => void putInOrder()}
            >
              Put in order
            </Button>
          </div>
        )}

        {pre && !workflow.loading && !outOfOrder && unbanked.length > 0 && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] leading-snug text-foreground"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
            <span className="min-w-0 flex-1">
              “{stepTitle(unbanked[0]!)}” needs a Bank details step before it so deposits can be
              refunded.
            </span>
            {!hasPreBank && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={fixingBank}
                className="h-7 text-[11px]"
                onClick={() => void addBank()}
              >
                Add bank details
              </Button>
            )}
          </div>
        )}

        {workflow.loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading steps">
            {slots.map((slot) => (
              <div key={slot.type} className="h-[60px] animate-pulse rounded-md bg-muted/50" />
            ))}
          </div>
        ) : (
          <>
            {slots.map((slot) => {
              const filled = steps.filter((step) => typeOf(step) === slot.type);
              const allowed = canAdd(slot.type);
              // Already collected in the other phase: nothing to add here.
              const bankElsewhere = slot.type === 'BANK_DETAIL_FORM_STEP' && bankInOtherPhase;
              const SlotIcon = STEP_ICON[slot.type] ?? Pencil;
              const drafting = draft?.type === slot.type;
              return (
                <div key={slot.type} className="space-y-2">
                  {filled.map(renderStep)}
                  {renderDraft(slot.type)}
                  {!filled.length && !drafting && (
                    <div
                      className={cn(
                        'flex flex-wrap items-center gap-3 rounded-md border border-dashed px-3 py-2.5',
                        slot.warn && !bankElsewhere
                          ? 'border-warning/50 bg-warning/5'
                          : 'border-border',
                      )}
                    >
                      <SlotIcon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          slot.warn && !bankElsewhere ? 'text-warning' : 'text-muted-foreground',
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {bankElsewhere
                            ? pre
                              ? 'Bank details are collected after the auction'
                              : 'Bank details are already collected before the auction'
                            : slot.empty}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {bankElsewhere
                            ? pre
                              ? 'An auction asks for bank details once. To collect them before it starts, remove the step after the auction first.'
                              : 'An auction asks for bank details once, and the same details are used for payouts and refunds.'
                            : slot.text}
                        </p>
                      </div>
                      {!bankElsewhere && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={Boolean(draft) || !allowed}
                          onClick={() => startNew(slot.type)}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                          {slot.add}
                        </Button>
                      )}
                    </div>
                  )}
                  {slot.multi && filled.length > 0 && !drafting && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={Boolean(draft) || !allowed}
                      onClick={() => startNew(slot.type)}
                      className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      {slot.more}
                    </Button>
                  )}
                </div>
              );
            })}
            {unslotted.map(renderStep)}
          </>
        )}

        {draft && (
          <p className="text-[11px] text-muted-foreground">
            Save or discard the new step before adding another.
          </p>
        )}

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
