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
import { WORKFLOW_TYPE_LABEL } from './workflow';

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
  'A refundable charge needs a Bank details step before this payment, so the refund has somewhere to go.';
const BANK_TOO_LATE =
  'A refundable charge needs the Bank details step before this payment. Move Bank details up, or make the charge non-refundable.';

function hasBankStep(workflow: AuctionWorkflowStep[], phase: WorkflowStepPhase): boolean {
  return workflow.some(
    (step) =>
      resolveStr(step.type) === 'BANK_DETAIL_FORM_STEP' &&
      (resolveStr(step.phase) || 'PRE_AUCTION') === phase,
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
      if (draft.heads.some((head) => !head.name?.trim() || !head.description?.trim())) {
        return 'Every charge needs a name and what it’s for.';
      }
      if (!draftMinutes(draft)) return 'Must be more than zero. They need some time to pay.';
      if (
        draft.phase === 'PRE_AUCTION' &&
        draft.heads.some((head) => head.refundable) &&
        !context.workflow.some(
          (s) => resolveStr(s.type) === 'BANK_DETAIL_FORM_STEP' && (s.order ?? 0) < context.order,
        )
      ) {
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
        name: draft.phase === 'POST_AUCTION' ? 'Post Payment' : 'Pre Payment',
        description: '',
        order,
        mandatory: draft.mandatory,
        mode: draft.mode,
        phase: draft.phase,
        offset: deadline(draft),
        heads: draft.heads,
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
    name: isPayment
      ? draft.phase === 'POST_AUCTION'
        ? 'Post Payment'
        : 'Pre Payment'
      : draft.name.trim() || undefined,
    description: isPayment ? '' : draft.description.trim() || undefined,
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
      ? { mode: draft.mode, phase: draft.phase, offset: deadline(draft), heads: draft.heads }
      : {}),
    ...(explicit && draft.type === 'PARTICIPATION_FORM_STEP'
      ? { manualApproval: draft.manualApproval, preStartDeadlineDuration: deadline(draft) }
      : {}),
    ...(explicit && draft.type === 'FORM_STEP'
      ? { phase: draft.phase, typeId: draft.typeId || undefined }
      : {}),
  };
}
