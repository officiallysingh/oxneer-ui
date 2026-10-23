import type { AuctionWorkflowStep, PolicyHeadRQ } from '@repo/api';
import { fmtLabel, paymentStepData, resolveStr } from '../../../_components/PolicyShared';
import { formatMoney, offsetLabelParts } from './summary';

/** Human labels for the workflow step types the simple-auction wizard exposes. */
export const WORKFLOW_TYPE_LABEL: Record<string, string> = {
  TNC_FORM_STEP: 'Terms and conditions',
  PARTICIPATION_FORM_STEP: 'Participation form',
  BANK_DETAIL_FORM_STEP: 'Bank details',
  PAYMENT_STEP: 'Payment',
  FORM_STEP: 'Custom form',
};

export const WORKFLOW_TYPE_DESCRIPTION: Record<string, string> = {
  TNC_FORM_STEP: 'Agreement to take part in the auction. Participants tick to accept.',
  PARTICIPATION_FORM_STEP: 'Tells you who is taking part, and lets you approve them.',
  BANK_DETAIL_FORM_STEP: 'Where refunds and payouts are sent.',
  PAYMENT_STEP: 'Collects the amount due from the winner.',
  FORM_STEP: 'Extra details participants fill in.',
};

export function isPostStep(step: AuctionWorkflowStep): boolean {
  return (resolveStr(step.phase) || resolveStr(step.policy?.phase)) === 'POST_AUCTION';
}

export function stepTitle(step: AuctionWorkflowStep): string {
  if (step.name) return step.name;
  const type = resolveStr(step.type);
  return WORKFLOW_TYPE_LABEL[type] ?? fmtLabel(type) ?? 'Step';
}

export function deadlineFor(step: AuctionWorkflowStep, start: string): string {
  const type = resolveStr(step.type);
  if (type === 'TNC_FORM_STEP') return 'First step · before step 2 is due';
  if (type === 'BANK_DETAIL_FORM_STEP') return 'No deadline of its own';
  const offset =
    type === 'PARTICIPATION_FORM_STEP'
      ? step.preStartDeadlineDuration
      : type === 'PAYMENT_STEP'
        ? step.offset
        : undefined;
  const label = offsetLabelParts(offset ?? undefined, 'start');
  if (label) return label;
  if (start) return 'By the start';
  return 'Set the start to see the date';
}

export function postDeadlineFor(step: AuctionWorkflowStep): string {
  const data = paymentStepData(step);
  const offset = step.offset ?? data.offset;
  const label = offsetLabelParts(offset ?? undefined, 'the close');
  return label ? label.replace('before the close', 'after the close') : 'Opens at the close';
}

export function offsetMinutes(offset: string | undefined): number {
  if (!offset) return 0;
  const days = Number(offset.match(/(\d+)D/)?.[1] ?? 0);
  const hours = Number(offset.match(/(\d+)H/)?.[1] ?? 0);
  const minutes = Number(offset.match(/(\d+)M/)?.[1] ?? 0);
  return days * 1440 + hours * 60 + minutes;
}

export function stepFields(step: AuctionWorkflowStep): string[] {
  const type = resolveStr(step.type);
  if (type === 'BANK_DETAIL_FORM_STEP') {
    return ['Bank name', 'IFSC code', 'Account number', 'Cancelled cheque'];
  }
  if (type === 'FORM_STEP' || type === 'PARTICIPATION_FORM_STEP') {
    return (step.embedded?.properties ?? [])
      .map((property) => property.name)
      .filter(Boolean)
      .slice(0, 5);
  }
  return [];
}

/** Formats a policy head amount for a compact summary (percentages stay %). */
export function headsSummary(heads: PolicyHeadRQ[], currency = 'INR'): string {
  if (!heads.length) return 'No charges';
  return heads
    .map((head) =>
      head.basis === 'PERCENTAGE_BASED' ? `${head.value}%` : formatMoney(head.value ?? 0, currency),
    )
    .join(' + ');
}

/** Explains how heads turn into the amount the winner pays. */
export function paymentTotalNote(
  heads: PolicyHeadRQ[],
  priceLabel: string,
  currency: string,
): string {
  const parts = heads.map((head) =>
    head.basis === 'PERCENTAGE_BASED'
      ? `${head.value}% of ${priceLabel}`
      : formatMoney(head.value ?? 0, currency),
  );
  return parts.length ? parts.join(' + ') : 'No charges';
}

export function headValue(
  head: { basis?: string; value?: number },
  priceLabel = 'winning price',
): string {
  if (head.basis === 'PERCENTAGE_BASED') return `${head.value ?? 0}% of ${priceLabel}`;
  return formatMoney(head.value ?? 0);
}
