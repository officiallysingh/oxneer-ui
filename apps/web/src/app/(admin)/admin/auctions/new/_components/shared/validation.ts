import type {
  AwardState,
  BasicsState,
  OfferState,
  ParticipationState,
  ScheduleState,
  WizardState,
} from './types';
import { endTimeFor } from './summary';

export const STEP_LABELS: Record<number, string> = {
  1: 'Basics and unit',
  2: 'Offer rules',
  3: 'Schedule and closing',
  4: 'Participation',
  5: 'Award',
  6: 'Review and publish',
  7: 'Invite participants',
};

export function validateBasics(basics: BasicsState): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = basics.title.trim();
  if (!title) errors.title = 'Title is required.';
  else if (title.length < 5) errors.title = 'Title must be at least 5 characters.';
  else if (title.length > 100) errors.title = 'Title must be at most 100 characters.';

  if (!basics.unitName.trim()) errors.unitName = 'Name the unit bidders will see.';
  if (!basics.items.length) errors.items = 'Add at least one listing.';
  if (basics.unitType === 'SINGLE_UNIT' && basics.items.length > 1) {
    errors.items = 'A Single Unit can only contain one listing. Switch to a Bundle for more.';
  }

  const openingPrice = parseFloat(basics.openingPrice);
  if (!basics.openingPrice || Number.isNaN(openingPrice) || openingPrice <= 0) {
    errors.openingPrice = 'Enter an opening price above zero.';
  }

  if (basics.reserveEnabled) {
    const reserve = parseFloat(basics.reserveAmount);
    if (!basics.reserveAmount || Number.isNaN(reserve) || reserve <= 0) {
      errors.reserveAmount = 'Enter a reserve above zero, or switch the reserve off.';
    }
  }

  const precision = parseInt(basics.precision, 10);
  if (Number.isNaN(precision) || precision < 0 || precision > 3) {
    errors.general = 'Precision must be between 0 and 3.';
  }
  return errors;
}

export function validateOffer(offer: OfferState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!offer.windows.length) {
    errors.windows = 'Add at least one price window.';
    return errors;
  }
  for (const window of offer.windows) {
    const value = parseFloat(window.value);
    if (Number.isNaN(value) || value <= 0) {
      errors.windows = 'Every window needs a positive step or percentage.';
      break;
    }
    if (window.type === 'RANGE') {
      const max = parseFloat(window.maxValue);
      if (Number.isNaN(max) || max <= value) {
        errors.windows = 'The upper end of a percentage range must be above the lower end.';
        break;
      }
    }
  }
  return errors;
}

export function validateSchedule(schedule: ScheduleState): Record<string, string> {
  const errors: Record<string, string> = {};
  const start = schedule.startTime ? new Date(schedule.startTime) : null;
  if (!start || Number.isNaN(start.getTime())) {
    errors.startTime = 'Pick when bidding opens.';
  } else if (start.getTime() <= Date.now()) {
    errors.startTime = 'Bidding must open in the future.';
  }

  const closing = endTimeFor(schedule);
  const end = closing ? new Date(closing) : null;
  if (!end || Number.isNaN(end.getTime())) {
    errors.endTime = 'Set when bidding closes.';
  } else if (start && !Number.isNaN(start.getTime()) && end <= start) {
    errors.endTime = 'Bidding must close after it opens.';
  }

  if (schedule.softCloseEnabled) {
    if (!(parseInt(schedule.extendMinutes, 10) > 0)) {
      errors.general = 'Soft close needs an extension of at least one minute.';
    } else if (schedule.limitEnabled && !(parseInt(schedule.extensionLimit, 10) > 0)) {
      errors.general = 'Set a positive extension limit, or allow unlimited extensions.';
    }
  }
  return errors;
}

export function validateParticipation(participation: ParticipationState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (participation.minimumEnabled && !(parseInt(participation.minimumCount, 10) > 0)) {
    errors.general = 'Minimum participants must be at least 1.';
  }
  return errors;
}

/** The winning-price rule can only work when there is a reserve to fall back on. */
export function awardNeedsReserve(award: AwardState): boolean {
  const kth = parseInt(award.winnerPriceKth, 10) || 1;
  return kth > 1;
}

export function validateAward(award: AwardState, basics: BasicsState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (awardNeedsReserve(award) && !basics.reserveEnabled) {
    errors.general =
      'Winning price: the 2nd-best bid rule needs a reserve price. Set one in Basics and unit.';
  }
  return errors;
}

export type IssueSeverity = 'must-fix' | 'check';

export interface ReviewIssue {
  id: string;
  /** Wizard step the issue belongs to. */
  step: number;
  /** Name shown under the issue ("Basics and unit"). */
  scope: string;
  severity: IssueSeverity;
  message: string;
  /** Step the "Go to" action opens — usually the same as `step`, but the reserve
   *  issue lives in Basics even though it is raised from Award. */
  goto: number;
}

/** Every blocking and advisory issue in the current wizard state. Shared by the
 *  step rail, the before-you-publish card and the review screen. */
export function collectIssues(state: WizardState): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const add = (step: number, severity: IssueSeverity, message: string, goto = step): void => {
    issues.push({
      id: `${step}-${issues.length}`,
      step,
      scope: STEP_LABELS[step] ?? 'Auction',
      severity,
      message,
      goto,
    });
  };

  const basics = validateBasics(state.basics);
  if (basics.title) add(1, 'must-fix', 'Add an auction title.');
  if (basics.unitName) add(1, 'must-fix', 'Name the unit.');
  if (basics.items) add(1, 'must-fix', 'Add at least one listing.');
  if (basics.openingPrice) add(1, 'must-fix', 'Enter an opening price above zero.');
  if (basics.reserveAmount) add(1, 'must-fix', 'Enter a reserve above zero, or switch it off.');

  const offer = validateOffer(state.offer);
  if (offer.windows) add(2, 'must-fix', offer.windows);
  if (state.offer.withdrawal === 'ALLOWED') {
    add(
      2,
      'check',
      'Allowing withdrawal invites bids that are pulled at the last moment. The withdrawer pays any shortfall.',
    );
  }

  const schedule = validateSchedule(state.schedule);
  if (schedule.startTime) add(3, 'must-fix', 'Set a start time in the future.');
  if (schedule.endTime) add(3, 'must-fix', schedule.endTime);
  if (schedule.general) add(3, 'must-fix', schedule.general);

  const participation = validateParticipation(state.participation);
  if (participation.general) add(4, 'must-fix', participation.general);

  const award = validateAward(state.award, state.basics);
  if (award.general) add(5, 'must-fix', award.general, 1);

  return issues;
}

export function issuesByStep(issues: ReviewIssue[]): Record<number, ReviewIssue[]> {
  return issues.reduce<Record<number, ReviewIssue[]>>((acc, issue) => {
    acc[issue.step] = [...(acc[issue.step] ?? []), issue];
    return acc;
  }, {});
}
