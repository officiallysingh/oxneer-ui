import type {
  AddWorkflowStepRQ,
  AuctionWorkflowStep,
  PolicyHeadRQ,
  WorkflowStepPhase,
  WorkflowStepType,
} from '@repo/api';
import {
  formatOffsetDuration,
  parseOffsetDuration,
  paymentStepData,
  resolveStr,
} from '../../_components/PolicyShared';
import { WORKFLOW_TYPE_LABEL, stepTitle } from './workflow';
import { STEP_LABELS } from './steps';
import { ISSUE_ANCHOR, type ReviewIssue } from './validation';

/** Everything the inline step editor can change, for a saved step or a new one. */
export interface StepDraft {
  type: WorkflowStepType;
  phase: WorkflowStepPhase;
  name: string;
  description: string;
  mandatory: boolean;
  /** TNC_FORM_STEP */
  tncSource: 'TEXT' | 'DOCUMENT';
  tncText: string;
  tncFile: File | null;
  /** FORM_STEP / PARTICIPATION_FORM_STEP managed form template. */
  typeId: string;
  typeName: string;
  /** PARTICIPATION_FORM_STEP */
  manualApproval: boolean;
  /** Participation form "submit by" (before the start) or payment "due by". */
  days: string;
  hours: string;
  minutes: string;
  /** PAYMENT_STEP */
  mode: string;
  heads: PolicyHeadRQ[];
}

export function emptyHead(): PolicyHeadRQ {
  return { name: '', description: '', basis: 'AMOUNT_BASED', value: 0, refundable: false };
}

/** Tiptap emits "<p></p>" for an empty doc, so strip tags to check for content. */
export function isRichTextEmpty(html: string): boolean {
  return !html.replace(/<[^>]*>/g, '').trim();
}

/** Normalises any ISO duration into days, hours (0–23) and minutes. */
function durationFields(iso?: string): Pick<StepDraft, 'days' | 'hours' | 'minutes'> {
  const raw = parseOffsetDuration(iso);
  const fromRaw = Number(raw.days) * 1440 + Number(raw.hours) * 60 + Number(raw.minutes);
  // parseOffsetDuration only reads P#DT#H#M; fall back for PT72H style values.
  const total =
    fromRaw ||
    Number(iso?.match(/(\d+)D/)?.[1] ?? 0) * 1440 +
      Number(iso?.match(/(\d+)H/)?.[1] ?? 0) * 60 +
      Number(iso?.match(/(\d+)M/)?.[1] ?? 0);
  return {
    days: String(Math.floor(total / 1440)),
    hours: String(Math.floor((total % 1440) / 60)),
    minutes: String(total % 60),
  };
}

export function draftMinutes(draft: Pick<StepDraft, 'days' | 'hours' | 'minutes'>): number {
  return (
    (parseInt(draft.days, 10) || 0) * 1440 +
    (parseInt(draft.hours, 10) || 0) * 60 +
    (parseInt(draft.minutes, 10) || 0)
  );
}

export function setDraftMinutes(total: number): Pick<StepDraft, 'days' | 'hours' | 'minutes'> {
  return {
    days: String(Math.floor(total / 1440)),
    hours: String(Math.floor((total % 1440) / 60)),
    minutes: String(total % 60),
  };
}

export function draftFromStep(step: AuctionWorkflowStep): StepDraft {
  const type = resolveStr(step.type) as WorkflowStepType;
  const payment = paymentStepData(step);
  const phase = (resolveStr(step.phase) || payment.phase || 'PRE_AUCTION') as WorkflowStepPhase;
  const deadline = durationFields(
    type === 'PAYMENT_STEP' ? payment.offset : step.preStartDeadlineDuration,
  );
  return {
    type,
    phase,
    name: step.name ?? '',
    description: step.description ?? '',
    mandatory: step.mandatory !== false,
    tncSource: step.tncText ? 'TEXT' : 'DOCUMENT',
    tncText: step.tncText ?? '',
    tncFile: null,
    typeId: step.embedded?.typeId ?? step.typeId ?? '',
    typeName: '',
    manualApproval: Boolean(step.manualApproval),
    ...deadline,
    mode: payment.mode,
    heads: payment.heads.length ? payment.heads : [],
  };
}

export function emptyDraft(type: WorkflowStepType, phase: WorkflowStepPhase): StepDraft {
  const name =
    type === 'PAYMENT_STEP'
      ? phase === 'POST_AUCTION'
        ? 'Post Payment'
        : 'Pre Payment'
      : type === 'BANK_DETAIL_FORM_STEP'
        ? 'Bank Details'
        : (WORKFLOW_TYPE_LABEL[type] ?? '');
  return {
    type,
    phase,
    name,
    description:
      type === 'BANK_DETAIL_FORM_STEP' ? 'Participant provides bank details for payouts' : '',
    mandatory: true,
    tncSource: 'TEXT',
    tncText: '',
    tncFile: null,
    typeId: '',
    typeName: '',
    manualApproval: true,
    ...(type === 'PAYMENT_STEP' && phase === 'POST_AUCTION'
      ? setDraftMinutes(2 * 1440)
      : type === 'PARTICIPATION_FORM_STEP' || type === 'PAYMENT_STEP'
        ? setDraftMinutes(1440)
        : setDraftMinutes(0)),
    mode: '',
    heads: type === 'PAYMENT_STEP' ? [emptyHead()] : [],
  };
}

export interface DraftContext {
  /** Saved steps, sorted by order. */
  workflow: AuctionWorkflowStep[];
  /** Where a new step goes, or the saved step's own order. */
  order: number;
  /** The saved step being edited; absent for a new one. */
  step?: AuctionWorkflowStep;
}

export interface DraftProblem {
  message: string;
  /** The editor can fix this one itself by adding a Bank details step first. */
  fix?: 'ADD_BANK_FIRST';
}

/** Returns the first problem that stops the draft from saving, or null. */
export function validateDraft(draft: StepDraft, context: DraftContext): DraftProblem | null {
  const message = draftMessage(draft, context);
  if (!message) return null;
  return message === NEEDS_BANK ? { message, fix: 'ADD_BANK_FIRST' } : { message };
}

const NEEDS_BANK =
  'A payment before the auction needs a Bank details step before it, so deposits can be refunded.';
const BANK_TOO_LATE =
  'A payment before the auction needs the Bank details step before it. Move Bank details above this payment.';

const isPreBank = (step: AuctionWorkflowStep) =>
  resolveStr(step.type) === 'BANK_DETAIL_FORM_STEP' &&
  (resolveStr(step.phase) || 'PRE_AUCTION') === 'PRE_AUCTION';

function hasBankStep(workflow: AuctionWorkflowStep[], phase: WorkflowStepPhase): boolean {
  return workflow.some(
    (step) =>
      resolveStr(step.type) === 'BANK_DETAIL_FORM_STEP' &&
      (resolveStr(step.phase) || 'PRE_AUCTION') === phase,
  );
}

/** True when a pre-auction Bank details step sits before `position` (1-based,
 *  in the sorted workflow). Positions, not `order` values, so gaps can't fool it. */
function bankBefore(workflow: AuctionWorkflowStep[], position: number): boolean {
  const index = workflow.findIndex(isPreBank);
  return index >= 0 && index + 1 < position;
}

/** Problems in the saved workflow steps, as review issues for the step rail,
 *  "In this section" and Review. `steps` must be the whole workflow, sorted. */
export function collectWorkflowIssues(steps: AuctionWorkflowStep[]): ReviewIssue[] {
  return paymentsMissingBank(steps).map((step, index) => ({
    id: `workflow-bank-${step.id ?? index}`,
    step: 4,
    scope: STEP_LABELS[4] ?? 'Participation',
    severity: 'must-fix',
    message: `“${stepTitle(step)}” needs a Bank details step before it, so deposits can be refunded.`,
    goto: 4,
    anchor: ISSUE_ANCHOR.stepsBeforeAuction,
  }));
}

/** Saved pre-auction payments with no Bank details step before them. */
export function paymentsMissingBank(workflow: AuctionWorkflowStep[]): AuctionWorkflowStep[] {
  return workflow.filter(
    (step, index) =>
      resolveStr(step.type) === 'PAYMENT_STEP' &&
      (resolveStr(step.phase) || paymentStepData(step).phase || 'PRE_AUCTION') === 'PRE_AUCTION' &&
      !bankBefore(workflow, index + 1),
  );
}

function draftMessage(draft: StepDraft, context: DraftContext): string | null {
  const implicit = Boolean(context.step?.implicit);
  if (implicit) return null;
  switch (draft.type) {
    case 'TNC_FORM_STEP': {
      const hasText = draft.tncSource === 'TEXT' && !isRichTextEmpty(draft.tncText);
      const hasDocument =
        draft.tncSource === 'DOCUMENT' &&
        (draft.tncFile || (context.step && !context.step.tncText));
      if (!hasText && !hasDocument) {
        return 'Add the terms before saving. Participants can’t join without them.';
      }
      return null;
    }
    case 'FORM_STEP':
    case 'PARTICIPATION_FORM_STEP':
      return draft.typeId ? null : 'Pick a form template.';
    case 'PAYMENT_STEP': {
      if (!draft.mode) return 'Choose how they pay.';
      if (!draft.heads.length) return 'Add at least one charge.';
      // "What it's for" is optional: an empty one is sent as the charge's name.
      if (draft.heads.some((head) => !head.name?.trim())) {
        return 'Every charge needs a name.';
      }
      if (
        draft.heads.some(
          (head) =>
            head.basis === 'PERCENTAGE_BASED' &&
            (Number(head.value) < 0 || Number(head.value) > 100),
        )
      ) {
        return 'A percentage charge must be between 0 and 100.';
      }
      if (!draftMinutes(draft)) return 'Must be more than zero. They need some time to pay.';
      // Every payment before the auction needs bank details first, so deposits
      // (and any refundable charge) can be paid back.
      if (draft.phase === 'PRE_AUCTION' && !bankBefore(context.workflow, context.order)) {
        // Only one Bank details step is allowed, so if one exists it just needs moving.
        return hasBankStep(context.workflow, 'PRE_AUCTION') ? BANK_TOO_LATE : NEEDS_BANK;
      }
      return null;
    }
    default:
      return null;
  }
}

const deadline = (draft: StepDraft) => formatOffsetDuration(draft.days, draft.hours, draft.minutes);

const paymentName = (draft: StepDraft) =>
  draft.phase === 'POST_AUCTION' ? 'Post Payment' : 'Pre Payment';

/** The API requires a description on payment steps. */
const paymentDescription = (draft: StepDraft) =>
  draft.phase === 'POST_AUCTION' ? 'Payment due from the winner' : 'Payment due before the auction';

/** The API requires a description on every charge; an empty one falls back to its name. */
function cleanHeads(heads: PolicyHeadRQ[]): PolicyHeadRQ[] {
  return heads.map((head) => {
    const name = head.name?.trim() ?? '';
    return {
      ...head,
      name,
      description: head.description?.trim() || name,
      value: Number(head.value) || 0,
    };
  });
}

/** Request for a step that doesn't exist yet. `tncBlobId` comes from an upload. */
export function toAddRequest(
  draft: StepDraft,
  order: number,
  tncBlobId?: string,
): AddWorkflowStepRQ {
  const name = draft.name.trim();
  const description = draft.description.trim();
  switch (draft.type) {
    case 'TNC_FORM_STEP':
      return {
        type: 'TNC_FORM_STEP',
        name: name || undefined,
        description: description || undefined,
        order,
        mandatory: draft.mandatory,
        tncText:
          draft.tncSource === 'TEXT' && !isRichTextEmpty(draft.tncText) ? draft.tncText : undefined,
        tncBlobId,
      };
    case 'FORM_STEP':
      return {
        type: 'FORM_STEP',
        name: name || draft.typeName,
        description: description || draft.typeName || name,
        order,
        mandatory: draft.mandatory,
        typeId: draft.typeId,
        phase: draft.phase,
      };
    case 'PARTICIPATION_FORM_STEP':
      return {
        type: 'PARTICIPATION_FORM_STEP',
        name: name || draft.typeName,
        description: description || draft.typeName || name,
        order,
        mandatory: draft.mandatory,
        manualApproval: draft.manualApproval,
        preStartDeadlineDuration: deadline(draft),
        typeId: draft.typeId,
      };
    case 'BANK_DETAIL_FORM_STEP':
      return {
        type: 'BANK_DETAIL_FORM_STEP',
        name: name || 'Bank Details',
        description: description || 'Participant provides bank details for payouts',
        order,
        mandatory: draft.mandatory,
        // The step is implicit when it exists only to refund a pre-auction payment.
        implicit: false,
        phase: draft.phase,
      };
    case 'PAYMENT_STEP':
      return {
        type: 'PAYMENT_STEP',
        // Payment steps keep the platform's names (the existing dialogs do the same).
        name: paymentName(draft),
        description: paymentDescription(draft),
        order,
        mandatory: draft.mandatory,
        mode: draft.mode,
        phase: draft.phase,
        offset: deadline(draft),
        heads: cleanHeads(draft.heads),
      };
  }
}

/** Request for a saved step. Implicit steps only change their name and description. */
export function toUpdateRequest(
  draft: StepDraft,
  step: AuctionWorkflowStep,
  tncBlobId?: string,
): Partial<AddWorkflowStepRQ> & { type: WorkflowStepType } {
  const explicit = !step.implicit;
  const isPayment = draft.type === 'PAYMENT_STEP';
  return {
    type: draft.type,
    name: isPayment ? paymentName(draft) : draft.name.trim() || undefined,
    description: isPayment ? paymentDescription(draft) : draft.description.trim() || undefined,
    order: step.order,
    mandatory: draft.mandatory,
    ...(explicit && draft.type === 'TNC_FORM_STEP'
      ? {
          tncText:
            draft.tncSource === 'TEXT' && !isRichTextEmpty(draft.tncText)
              ? draft.tncText
              : undefined,
          tncBlobId,
        }
      : {}),
    ...(explicit && isPayment
      ? {
          mode: draft.mode,
          phase: draft.phase,
          offset: deadline(draft),
          heads: cleanHeads(draft.heads),
        }
      : {}),
    ...(explicit && draft.type === 'PARTICIPATION_FORM_STEP'
      ? { manualApproval: draft.manualApproval, preStartDeadlineDuration: deadline(draft) }
      : {}),
    ...(explicit && draft.type === 'FORM_STEP'
      ? { phase: draft.phase, typeId: draft.typeId || undefined }
      : {}),
  };
}
