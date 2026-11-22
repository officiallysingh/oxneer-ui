import type { AuctionVM, AuctionWorkflowStep } from '@repo/api';
import type { PillTone } from '@/components/common/admin/Pill';
import { resolveStr } from '@/components/common/admin/format';
import { effectiveDeadlines } from '../../../_lib/wizard/deadlines';
import { formatShortDate, formatTime } from '../../../_lib/wizard/summary';

/** Where the auction is in its life, from the admin's point of view. */
export type AuctionStage =
  | 'draft'
  | 'registration'
  | 'bidding'
  | 'closed'
  | 'completed'
  | 'cancelled';

export const STAGE_META: Record<AuctionStage, { label: string; tone: PillTone }> = {
  draft: { label: 'Draft', tone: 'muted' },
  registration: { label: 'Registration open', tone: 'info' },
  bidding: { label: 'Bidding live', tone: 'success' },
  closed: { label: 'Bidding closed', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'destructive' },
};

export interface AuctionTimes {
  start: Date | null;
  end: Date | null;
}

function toDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Start and end as real instants. Uses the raw ISO values from the API, not the
 *  wizard's wall-clock inputs, so comparisons with "now" are time-zone safe. */
export function auctionTimes(auction: AuctionVM): AuctionTimes {
  return {
    start: toDate(auction.schedule?.startTime ?? auction.startTime),
    end: toDate(auction.schedule?.endTime ?? auction.endTime),
  };
}

export function auctionStage(auction: AuctionVM, now: Date): AuctionStage {
  const status = resolveStr(auction.status).toUpperCase();
  if (status === 'DRAFT') return 'draft';
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'COMPLETED' || status === 'AWARDED') return 'completed';
  if (status === 'LIVE') return 'bidding';

  // PUBLISHED / SCHEDULED: the status may lag the clock, so read the times.
  const { start, end } = auctionTimes(auction);
  if (start && now < start) return 'registration';
  if (end && now >= end) return 'closed';
  if (start) return 'bidding';
  return 'registration';
}

/** When the last step before the auction is due: the start minus the shortest
 *  lead time any step has. Null when there are no steps or no start. */
export function registrationEndsAt(
  preSteps: AuctionWorkflowStep[],
  start: Date | null,
): Date | null {
  if (!start || preSteps.length === 0) return null;
  const offsets = effectiveDeadlines(preSteps).map((deadline) => deadline.offset);
  const latestDue = Math.min(...offsets);
  return new Date(start.getTime() - latestDue * 60_000);
}

// ── Progress stepper ─────────────────────────────────────────────────────────

export type ProgressState = 'done' | 'current' | 'upcoming';

export interface ProgressStep {
  key: 'setup' | 'published' | 'registration' | 'bidding' | 'result' | 'handover';
  label: string;
  when: string;
  state: ProgressState;
}

interface ProgressInput {
  stage: AuctionStage;
  times: AuctionTimes;
  registrationEnds: Date | null;
  createdAt?: string;
  hasPreSteps: boolean;
  hasPostSteps: boolean;
}

function currentKey(input: ProgressInput): ProgressStep['key'] | null {
  switch (input.stage) {
    case 'draft':
      return 'setup';
    case 'registration':
      return input.hasPreSteps ? 'registration' : 'published';
    case 'bidding':
      return 'bidding';
    case 'closed':
      return 'result';
    default:
      return null;
  }
}

function biddingWhen({ start, end }: AuctionTimes): string {
  if (!start) return 'Not scheduled';
  const day = formatShortDate(start.toISOString());
  if (!end) return `${day}, ${formatTime(start.toISOString())}`;
  return `${day}, ${formatTime(start.toISOString())}–${formatTime(end.toISOString())}`;
}

/** The six (or fewer) milestones shown under "What is happening now". */
export function progressSteps(input: ProgressInput): ProgressStep[] {
  const { times, registrationEnds, createdAt } = input;
  const steps: Omit<ProgressStep, 'state'>[] = [
    { key: 'setup', label: 'Set up', when: createdAt ? formatShortDate(createdAt) : '' },
    { key: 'published', label: 'Published', when: '' },
  ];
  if (input.hasPreSteps) {
    steps.push({
      key: 'registration',
      label: 'Registration',
      when: registrationEnds ? `until ${formatShortDate(registrationEnds.toISOString())}` : '',
    });
  }
  steps.push(
    { key: 'bidding', label: 'Bidding', when: biddingWhen(times) },
    { key: 'result', label: 'Result', when: 'when bidding closes' },
  );
  if (input.hasPostSteps) {
    steps.push({ key: 'handover', label: 'Payment & handover', when: 'after the result' });
  }

  const current = currentKey(input);
  const currentIndex = current ? steps.findIndex((step) => step.key === current) : -1;
  const allDone = input.stage === 'completed';

  return steps.map((step, index) => {
    let state: ProgressState = 'upcoming';
    if (allDone || (currentIndex >= 0 && index < currentIndex)) state = 'done';
    else if (index === currentIndex) state = 'current';
    return { ...step, state };
  });
}

// ── Countdown ────────────────────────────────────────────────────────────────

export interface Countdown {
  label: string;
  remaining: string;
  at: Date;
}

/** "3 days 23 hrs", "22 hrs 34 min", "12 min". */
export function formatRemaining(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  if (totalMinutes < 1) return 'under a minute';
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const unit = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  if (days > 0)
    return hours > 0
      ? `${unit(days, 'day', 'days')} ${unit(hours, 'hr', 'hrs')}`
      : unit(days, 'day', 'days');
  if (hours > 0)
    return minutes > 0 ? `${unit(hours, 'hr', 'hrs')} ${minutes} min` : unit(hours, 'hr', 'hrs');
  return `${minutes} min`;
}

/** The time box in the header: until bidding opens, or until it ends. */
export function countdownFor(
  stage: AuctionStage,
  times: AuctionTimes,
  now: Date,
): Countdown | null {
  if (stage === 'registration' && times.start) {
    return {
      label: 'Bidding opens in',
      remaining: formatRemaining(times.start.getTime() - now.getTime()),
      at: times.start,
    };
  }
  if (stage === 'bidding' && times.end) {
    return {
      label: 'Bidding ends in',
      remaining: formatRemaining(times.end.getTime() - now.getTime()),
      at: times.end,
    };
  }
  return null;
}
