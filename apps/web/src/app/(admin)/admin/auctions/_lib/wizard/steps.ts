import type { BasicsState, WizardState } from './types';

export type WizardStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface WizardStepMeta {
  id: WizardStepId;
  label: string;
  /** Lead paragraph under the step title. Some steps word it by direction. */
  lead: (ctx: { forward: boolean; isPrivate: boolean }) => string;
  /** Step 7 sits under an "After publishing" heading in the rail. */
  afterPublishing?: boolean;
}

export const WIZARD_STEPS: readonly WizardStepMeta[] = [
  {
    id: 1,
    label: 'Basics and unit',
    lead: ({ forward }) =>
      `Pick the auction type and direction first. They decide what the next steps show. Then describe what you’re ${forward ? 'selling' : 'buying'}.`,
  },
  {
    id: 2,
    label: 'Offer rules',
    lead: ({ forward }) =>
      `How ${forward ? 'bids' : 'asks'} are made, how the price may move over time, and what ${forward ? 'bidders' : 'suppliers'} see.`,
  },
  {
    id: 3,
    label: 'Schedule and closing',
    lead: ({ forward }) =>
      `When bidding runs, how it ends, and whether late ${forward ? 'bids' : 'asks'} extend it.`,
  },
  {
    id: 4,
    label: 'Participation',
    lead: () =>
      'How many people must be ready for the auction to go live, and what each of them must do first.',
  },
  {
    id: 5,
    label: 'Award',
    lead: () =>
      'Three policies run at the close: who wins, how ties break, and the winning price. Then the winner completes the steps after the auction.',
  },
  {
    id: 6,
    label: 'Review and publish',
    lead: ({ isPrivate }) =>
      `Check that every step is complete and the rules read right, then publish. Publishing locks the rules${isPrivate ? '. After that, you invite people.' : '.'}`,
  },
  {
    id: 7,
    label: 'Invite participants',
    afterPublishing: true,
    lead: () =>
      'Invite the people who can take part, then check the details they send and approve or reject them.',
  },
];

export const STEP_LABELS: Record<number, string> = Object.fromEntries(
  WIZARD_STEPS.map((step) => [step.id, step.label]),
);

/** The five steps that make up the rules. Publishing needs every one opened,
 *  reviewed and free of must-fix issues, and locks them afterwards. */
export const SETUP_STEPS: readonly WizardStepId[] = [1, 2, 3, 4, 5];

export const isSetupStep = (step: number): boolean => step >= 1 && step <= 5;

/** Why a step was flagged for another look after an upstream choice changed. */
export type ReviewReason = 'direction' | 'mechanism' | 'preset';

export type ReviewFlags = Partial<Record<WizardStepId, ReviewReason>>;

export const REVIEW_REASON_TEXT: Record<ReviewReason, string> = {
  direction:
    'You changed the direction, so wording, limits and defaults here changed too. Check that these settings still fit.',
  mechanism:
    'You changed the mechanism, so the options here changed. Check that these settings still fit.',
  preset: 'A preset changed several settings here. Check that they still fit.',
};

/** Steps that depend on each upstream choice. */
const DEPENDENTS: Record<ReviewReason, WizardStepId[]> = {
  direction: [2, 3, 4, 5],
  mechanism: [3, 5],
  preset: [2, 3, 4, 5],
};

/** Flags the already-visited dependents of a change, so the admin rechecks them
 *  before publishing. The step being edited is never flagged. */
export function flagDependents(
  flags: ReviewFlags,
  reason: ReviewReason,
  visited: ReadonlySet<number>,
  current: number,
): ReviewFlags {
  const next = { ...flags };
  for (const step of DEPENDENTS[reason]) {
    if (visited.has(step) && step !== current) next[step] = reason;
  }
  return next;
}

export const PRESETS = [
  { value: 'none', label: 'None: I’ll set everything myself' },
  { value: 'english', label: 'English: forward, open bidding, winner pays own bid' },
  { value: 'reverseL1', label: 'Reverse L1: reverse, open bidding, rank only' },
] as const;

/** Applies a preset on top of the current state. It only fills Offer rules and
 *  Award; everything else stays as the admin set it. */
export function applyPreset(state: WizardState, preset: string): WizardState {
  const basics: BasicsState = { ...state.basics, preset };
  if (preset === 'english') {
    return {
      ...state,
      basics: { ...basics, direction: 'FORWARD' },
      offer: { ...state.offer, mechanism: 'OPEN', offerVisibility: 'FULL' },
      award: { ...state.award, winnerKth: '1', winnerPriceKth: '1' },
    };
  }
  if (preset === 'reverseL1') {
    return {
      ...state,
      basics: { ...basics, direction: 'REVERSE' },
      offer: { ...state.offer, mechanism: 'OPEN', offerVisibility: 'RANK' },
      award: { ...state.award, winnerKth: '1', winnerPriceKth: '1' },
    };
  }
  return { ...state, basics };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** "2 issues to fix, 1 step not opened yet and 1 step to review". */
export function blockerSummary({
  mustFix,
  unopened,
  toReview,
}: {
  mustFix: number;
  unopened: number;
  toReview: number;
}): string {
  const parts = [
    mustFix ? `${plural(mustFix, 'issue', 'issues')} to fix` : '',
    unopened ? `${plural(unopened, 'step', 'steps')} not opened yet` : '',
    toReview ? `${plural(toReview, 'step', 'steps')} to review` : '',
  ].filter(Boolean);
  if (parts.length === 0) return '';
  const text =
    parts.length > 1
      ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
      : parts[0]!;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
