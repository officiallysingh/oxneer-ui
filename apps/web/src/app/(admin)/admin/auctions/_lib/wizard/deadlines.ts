import type { AuctionWorkflowStep } from '@repo/api';
import { paymentStepData, resolveStr } from '../../_components/PolicyShared';
import { formatDateTime } from './summary';
import { offsetMinutes } from './workflow';

/** 1 d 2 h 30 min */
export function dhm(total: number): string {
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  const parts = [
    days ? `${days} d` : '',
    hours ? `${hours} h` : '',
    minutes ? `${minutes} min` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return parts || '0 min';
}

/** Only the participation form and payments carry a deadline of their own. */
export function ownOffset(step: AuctionWorkflowStep): number | null {
  const type = resolveStr(step.type);
  if (type === 'PARTICIPATION_FORM_STEP') return offsetMinutes(step.preStartDeadlineDuration);
  if (type === 'PAYMENT_STEP') return offsetMinutes(paymentStepData(step).offset);
  return null;
}

export interface EffectiveDeadline {
  /** Minutes before the start the step must be done. */
  offset: number;
  /** True when the step has a deadline of its own. */
  own: boolean;
  /** Index of the later step whose deadline this one inherits. */
  ref: number | null;
}

/** A step without a deadline of its own must be done before the next step that
 *  has one, or by the start when none follows. */
export function effectiveDeadlines(preSteps: AuctionWorkflowStep[]): EffectiveDeadline[] {
  const own = preSteps.map(ownOffset);
  return preSteps.map((_, index) => {
    if (own[index] !== null) return { offset: own[index]!, own: true, ref: null };
    const next = own.findIndex((offset, j) => j > index && offset !== null);
    return next >= 0
      ? { offset: own[next]!, own: false, ref: next }
      : { offset: 0, own: false, ref: null };
  });
}

function shift(start: string, minutes: number): string {
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return '';
  return formatDateTime(new Date(date.getTime() + minutes * 60_000).toISOString());
}

/** When a step before the auction is due: an absolute time and a relative note. */
export function preStepDue(
  step: AuctionWorkflowStep,
  deadline: EffectiveDeadline,
  start: string,
): { main: string; sub: string } {
  const at = start ? shift(start, -deadline.offset) : '';
  const relative = deadline.offset ? `${dhm(deadline.offset)} before start` : 'by the start';
  const main = at || (deadline.offset ? `${dhm(deadline.offset)} before start` : 'By the start');
  if (deadline.own) {
    return { main, sub: start ? relative : 'set the start to see the date' };
  }
  const lead = resolveStr(step.type) === 'TNC_FORM_STEP' ? 'first step' : 'no deadline of its own';
  return {
    main,
    sub: `${lead} · ${deadline.ref !== null ? `before step ${deadline.ref + 1} is due` : 'by the start'}`,
  };
}

/** When a step after the auction is due. Payments open at the close. */
export function postStepDue(
  step: AuctionWorkflowStep,
  closing: string,
): { main: string; sub: string } {
  if (resolveStr(step.type) !== 'PAYMENT_STEP') {
    return { main: 'After the close', sub: 'winner only · no deadline of its own' };
  }
  const offset = offsetMinutes(paymentStepData(step).offset);
  const at = closing ? shift(closing, offset) : '';
  return {
    main: `close → ${at || `+${dhm(offset)}`}`,
    sub: `opens at the close · ${dhm(offset)} to pay`,
  };
}
