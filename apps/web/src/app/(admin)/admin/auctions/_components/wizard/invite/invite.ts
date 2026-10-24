import type { AuctionWorkflowStep, InvitationStatus, ParticipantVM } from '@repo/api';
import { resolveStr } from '@/components/common/admin/format';
import { fmtLabel } from '../../../_components/PolicyShared';
import { formatDateTime, formatShortDate, formatTime } from '../../../_lib/wizard/summary';
import { stepTitle } from '../../../_lib/wizard/workflow';

// ── Types ────────────────────────────────────────────────────────────────────

export type InviteBucket = 'review' | 'waiting' | 'approved' | 'rejected' | 'cancelled';

export interface InviteDecision {
  decision: 'APPROVED' | 'REJECTED';
  at: string;
  reason?: string;
}

export interface ParticipantStepView {
  id: string;
  title: string;
  type: string;
  state: 'done' | 'review' | 'pending';
  status: string;
  updatedAt?: string;
  fields: Array<{ label: string; value: string }>;
}

export interface ParticipantView {
  participant: ParticipantVM;
  name: string;
  email?: string;
  mobile?: string;
  company?: string;
  kind: 'existing' | 'new';
  platformLine: string;
  bucket: InviteBucket;
  label: string;
  note: string;
  ready: boolean;
  done: number;
  total: number;
  steps: ParticipantStepView[];
  invitationLine: string;
  decision?: InviteDecision;
}

export interface InviteCounts {
  all: number;
  invited: number;
  ready: number;
  review: number;
  waiting: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

// ── Status helpers ───────────────────────────────────────────────────────────

/** Backend sends invitation status as either a string or a `{ KEY: label }` object. */
export function invitationStatus(participant: ParticipantVM): InvitationStatus | string {
  const status = participant.invitation?.status;
  if (!status) return 'NA';
  if (typeof status === 'string') return status;
  const known = [
    'NA',
    'INVITED',
    'PENDING',
    'ACCEPTED',
    'DECLINED',
    'EXPIRED',
    'JOINED',
    'APPROVED',
  ];
  const key = Object.keys(status)[0];
  const value = Object.values(status)[0];
  if (key && known.includes(key)) return key;
  if (value && known.includes(value)) return value;
  return value ?? key ?? 'NA';
}

const DONE_STATUS = new Set(['COMPLETED', 'DONE', 'APPROVED']);
const REVIEW_STATUS = new Set(['SUBMITTED', 'PENDING_REVIEW', 'NEEDS_REVIEW', 'AWAITING_APPROVAL']);

function stepState(
  step: AuctionWorkflowStep,
  status: { type?: string | Record<string, string>; details?: Record<string, string> } | undefined,
): ParticipantStepView['state'] {
  if (!status) return 'pending';
  const type = resolveStr(status.type);
  if (DONE_STATUS.has(type)) {
    // A manual-approval form is submitted, but not approved yet.
    if (
      resolveStr(step.type) === 'PARTICIPATION_FORM_STEP' &&
      step.manualApproval &&
      type !== 'APPROVED'
    ) {
      return 'review';
    }
    return 'done';
  }
  if (REVIEW_STATUS.has(type)) return 'review';
  return 'pending';
}

function statusText(step: AuctionWorkflowStep, state: ParticipantStepView['state']): string {
  const type = resolveStr(step.type);
  if (state === 'review') return 'Sent · waiting for your review';
  if (state === 'pending') {
    if (type === 'PAYMENT_STEP') return 'Not paid yet';
    return 'Not done yet';
  }
  if (type === 'PARTICIPATION_FORM_STEP' && step.manualApproval) return 'Sent · approved by you';
  if (type === 'TNC_FORM_STEP') return 'Accepted';
  if (type === 'BANK_DETAIL_FORM_STEP') return 'Given';
  if (type === 'PAYMENT_STEP') return 'Paid';
  return 'Sent';
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.name === 'string') return record.name;
    if (typeof record.fileName === 'string') return record.fileName;
    try {
      return JSON.stringify(value);
    } catch {
      return '—';
    }
  }
  return String(value);
}

const DETAIL_LABEL: Record<string, string> = {
  gstin: 'GSTIN',
  cin: 'CIN',
  pan: 'PAN',
  ifsc: 'IFSC',
  accountnumber: 'Account number',
  authorisedsignatory: 'Authorised signatory',
  yearsinbusiness: 'Years in business',
};

function detailFields(details: Record<string, string> | undefined) {
  if (!details) return [];
  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => {
      const leaf = key.split('.').pop() ?? key;
      return {
        label: DETAIL_LABEL[leaf.toLowerCase()] ?? fmtLabel(leaf),
        value: displayValue(value),
      };
    });
}

function findCompany(steps: ParticipantStepView[]): string | undefined {
  for (const step of steps) {
    for (const field of step.fields) {
      if (/company|organisation|organization|firm|business/i.test(field.label)) {
        return field.value;
      }
    }
  }
  return undefined;
}

/** "3 h ago" style copy for invitation and review timestamps. */
export function timeAgo(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'just now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDateTime(value);
}

function invitationLine(participant: ParticipantVM): string {
  const issuedAt = participant.invitation?.issuedAt;
  const channel = participant.mobileNo ? 'by email and SMS' : 'by email';
  if (!issuedAt) return `Sent ${channel}`;
  const date = new Date(issuedAt);
  if (Number.isNaN(date.getTime())) return `Sent ${channel}`;
  return `Sent ${formatShortDate(issuedAt)} · ${formatTime(issuedAt)} ${channel}`;
}

// ── View builder ─────────────────────────────────────────────────────────────

export function buildParticipantView(
  participant: ParticipantVM,
  preSteps: AuctionWorkflowStep[],
): ParticipantView {
  const steps = preSteps.map((step) => {
    const status = participant.workflowStatus?.[step.id];
    const state = stepState(step, status);
    return {
      id: step.id,
      title: stepTitle(step),
      type: resolveStr(step.type),
      state,
      status: statusText(step, state),
      updatedAt: status?.updatedAt ?? undefined,
      fields: detailFields(status?.details),
    };
  });

  const raw = invitationStatus(participant);
  const accepted = raw === 'ACCEPTED' || raw === 'JOINED' || raw === 'APPROVED';
  const done = steps.filter((step) => step.state === 'done').length;
  const total = steps.length;
  const anyReview = steps.some((step) => step.state === 'review');
  const anyDone = done > 0;
  const allDone = total > 0 && done === total;
  const company = findCompany(steps);
  const name =
    participant.name || [participant.username, participant.emailId].find(Boolean) || 'Participant';
  const decision: InviteDecision | undefined =
    raw === 'DECLINED'
      ? { decision: 'REJECTED', at: participant.invitation?.respondedAt ?? '' }
      : accepted && (allDone || total === 0)
        ? { decision: 'APPROVED', at: participant.invitation?.respondedAt ?? '' }
        : undefined;

  let bucket: InviteBucket;
  let label: string;
  let note: string;

  if (raw === 'EXPIRED') {
    bucket = 'cancelled';
    label = 'Cancelled';
    note = `Cancelled ${timeAgo(participant.invitation?.respondedAt ?? participant.invitation?.issuedAt)}`;
  } else if (raw === 'DECLINED') {
    bucket = 'rejected';
    label = 'Rejected';
    note = `Rejected ${timeAgo(participant.invitation?.respondedAt ?? participant.invitation?.issuedAt)}`;
  } else if (allDone && !anyReview) {
    bucket = 'approved';
    label = 'Approved';
    note = 'Ready to bid';
  } else if (anyReview) {
    const reviewStep = steps.find((step) => step.state === 'review');
    const when = reviewStep?.updatedAt ? ` ${timeAgo(reviewStep.updatedAt)}` : '';
    bucket = 'review';
    label = 'Needs review';
    note = `Sent their details${when}`;
  } else if (accepted && total === 0) {
    bucket = 'approved';
    label = 'Approved';
    note = 'Ready to bid';
  } else if (anyDone) {
    bucket = 'waiting';
    label = 'In progress';
    note = `${done} of ${total} steps done`;
  } else {
    bucket = 'waiting';
    label = 'Invited';
    note = `Sent ${timeAgo(participant.invitation?.issuedAt)}${
      raw === 'INVITED' || raw === 'PENDING' || raw === 'NA' ? ' · no reply yet' : ''
    }`;
  }

  return {
    participant,
    name,
    email: participant.emailId,
    mobile: participant.mobileNo,
    company,
    kind: participant.username ? 'existing' : 'new',
    platformLine: participant.username
      ? company
        ? `${company} · on the platform`
        : 'On the platform'
      : company
        ? `${company} · joined from the invitation`
        : 'Not on the platform yet',
    bucket,
    label,
    note,
    ready: bucket === 'approved',
    done,
    total,
    steps,
    invitationLine: invitationLine(participant),
    decision,
  };
}

export function buildParticipantViews(
  participants: ParticipantVM[],
  preSteps: AuctionWorkflowStep[],
): ParticipantView[] {
  return participants.map((participant) => buildParticipantView(participant, preSteps));
}

export function inviteCounts(views: ParticipantView[]): InviteCounts {
  const count = (bucket: InviteBucket) => views.filter((view) => view.bucket === bucket).length;
  return {
    all: views.length,
    invited: views.filter((view) => view.bucket !== 'cancelled').length,
    ready: views.filter((view) => view.ready).length,
    review: count('review'),
    waiting: count('waiting'),
    approved: count('approved'),
    rejected: count('rejected'),
    cancelled: count('cancelled'),
  };
}

/** Applies a decision made from the detail sheet. Decisions are local until the
 *  participant review endpoint lands; they still drive the list and counts. */
export function applyDecision(
  view: ParticipantView,
  decision: InviteDecision | undefined,
): ParticipantView {
  if (!decision) return view;
  const approved = decision.decision === 'APPROVED';
  return {
    ...view,
    bucket: approved ? 'approved' : 'rejected',
    label: approved ? 'Approved' : 'Rejected',
    note: approved ? 'Ready to bid' : `Rejected ${decision.at ? timeAgo(decision.at) : 'just now'}`,
    ready: approved,
    decision,
  };
}

export const BUCKET_LABELS: Record<InviteBucket, string> = {
  review: 'Needs review',
  waiting: 'Waiting',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const BUCKET_ORDER: InviteBucket[] = [
  'review',
  'waiting',
  'approved',
  'rejected',
  'cancelled',
];
