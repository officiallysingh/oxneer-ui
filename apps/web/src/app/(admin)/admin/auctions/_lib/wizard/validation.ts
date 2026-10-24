import type {
  AwardState,
  BasicsState,
  OfferState,
  ParticipationState,
  ScheduleState,
  WizardState,
} from './types';
import { STEP_LABELS } from './steps';
import { endTimeFor, formatMoney, parseDuration } from './summary';

export { STEP_LABELS };

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

const windowMinutes = (duration: string) => {
  const { hours, minutes } = parseDuration(duration);
  return hours * 60 + minutes;
};

export function validateOffer(offer: OfferState): Record<string, string> {
  const errors: Record<string, string> = {};
  // Clock and sealed auctions don't use the open-bidding price windows.
  if (offer.mechanism !== 'OPEN') return errors;
  if (!offer.windows.length) {
    errors.windows = 'Add at least one price window.';
    return errors;
  }
  for (const [index, window] of offer.windows.entries()) {
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
    const last = index === offer.windows.length - 1;
    if (!last && windowMinutes(window.duration) <= 0) {
      errors.windows = `Window ${index + 1}: give it a length, or remove the windows after it.`;
      break;
    }
  }
  return errors;
}

export function validateSchedule(
  schedule: ScheduleState,
  { allowPastStart = false }: { allowPastStart?: boolean } = {},
): Record<string, string> {
  const errors: Record<string, string> = {};
  const start = schedule.startTime ? new Date(schedule.startTime) : null;
  if (!start || Number.isNaN(start.getTime())) {
    errors.startTime = 'Pick when bidding opens.';
  } else if (!allowPastStart && start.getTime() <= Date.now()) {
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
  if (participation.minimumEnabled && !(parseInt(participation.minimumCount, 10) >= 2)) {
    errors.general = 'Minimum participants: an auction needs at least 2.';
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
  if (award.confirmation === 'MANUAL' && !(parseInt(award.confirmDays, 10) >= 1)) {
    errors.confirmDays = 'Allow at least 1 day to confirm the result.';
  }
  return errors;
}

/** Validates one setup step. Used by the shared "Next" action. */
export function validateStep(
  step: number,
  state: WizardState,
  options: { published?: boolean } = {},
): Record<string, string> {
  switch (step) {
    case 1:
      return validateBasics(state.basics);
    case 2:
      return validateOffer(state.offer);
    case 3:
      return validateSchedule(state.schedule, { allowPastStart: options.published });
    case 4:
      return validateParticipation(state.participation);
    case 5: {
      // The reserve issue is fixed in Basics, so it doesn't block leaving Award.
      const errors = validateAward(state.award, state.basics);
      delete errors.general;
      return errors;
    }
    default:
      return {};
  }
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

function biddingMinutes(schedule: ScheduleState): number {
  const start = new Date(schedule.startTime).getTime();
  const end = new Date(endTimeFor(schedule)).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
}

/** Every blocking and advisory issue in the current wizard state. Shared by the
 *  step rail, the before-you-publish card, each step's "In this section" list
 *  and the review screen. */
export function collectIssues(
  state: WizardState,
  { published = false }: { published?: boolean } = {},
): ReviewIssue[] {
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
  const forward = state.basics.direction === 'FORWARD';
  const noun = forward ? 'bid' : 'ask';

  const basics = validateBasics(state.basics);
  if (basics.title) add(1, 'must-fix', 'Add an auction title.');
  if (basics.unitName) add(1, 'must-fix', 'Name the unit.');
  if (basics.items) add(1, 'must-fix', basics.items);
  if (basics.openingPrice) {
    add(1, 'must-fix', `Set the ${forward ? 'opening' : 'starting'} price.`);
  }
  if (basics.reserveAmount) add(1, 'must-fix', 'Enter a reserve above zero, or switch it off.');
  const opening = parseFloat(state.basics.openingPrice);
  const reserve = parseFloat(state.basics.reserveAmount);
  if (state.basics.reserveEnabled && opening > 0 && reserve > 0) {
    const money = formatMoney(reserve, state.basics.currencyUnit);
    if (forward && reserve < opening) {
      add(1, 'check', `The reserve (${money}) is below the opening price, so it has no effect.`);
    } else if (!forward && reserve > opening) {
      add(1, 'check', `The reserve (${money}) is above the starting price, so it has no effect.`);
    }
  }

  const offer = validateOffer(state.offer);
  if (offer.windows) add(2, 'must-fix', `Price progression: ${offer.windows}`);
  if (state.offer.mechanism === 'OPEN' && state.offer.windows.length > 1) {
    const used = state.offer.windows
      .slice(0, -1)
      .reduce((total, window) => total + windowMinutes(window.duration), 0);
    const open = biddingMinutes(state.schedule);
    if (open > 0 && used >= open) {
      const last = state.offer.windows.length;
      add(
        2,
        'check',
        `Windows 1 to ${last - 1} add up to ${used} min, but bidding is open for ${open} min. Window ${last} would never run.`,
      );
    }
  }
  if (state.offer.mechanism === 'OPEN' && state.offer.withdrawal === 'ALLOWED') {
    add(
      2,
      'check',
      `Allowing withdrawal invites ${noun}s that are pulled at the last moment. The withdrawer pays any shortfall.`,
    );
  }

  const schedule = validateSchedule(state.schedule, { allowPastStart: published });
  if (schedule.startTime) add(3, 'must-fix', 'Set a start time in the future.');
  if (schedule.endTime) add(3, 'must-fix', schedule.endTime);
  if (schedule.general) add(3, 'must-fix', schedule.general);

  const participation = validateParticipation(state.participation);
  if (participation.general) add(4, 'must-fix', participation.general);

  const award = validateAward(state.award, state.basics);
  if (award.general) add(5, 'must-fix', award.general, 1);
  if (award.confirmDays) add(5, 'must-fix', award.confirmDays);

  return issues;
}

export function issuesByStep(issues: ReviewIssue[]): Record<number, ReviewIssue[]> {
  return issues.reduce<Record<number, ReviewIssue[]>>((acc, issue) => {
    acc[issue.step] = [...(acc[issue.step] ?? []), issue];
    return acc;
  }, {});
}
