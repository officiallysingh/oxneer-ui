import type { ListingSummaryVM } from '@repo/api';

export type AuctionMechanism = 'OPEN' | 'CLOCK' | 'SEALED';
export type OfferVisibilityChoice = 'FULL' | 'RANK' | 'NOTHING';
export type ParticipantVisibilityChoice = 'ALIAS' | 'REAL' | 'HIDDEN';
export type ReserveVisibility = 'HIDDEN' | 'SHOWN' | 'MET_ONLY';
export type PriceMoveType = 'STEP' | 'PERCENT' | 'RANGE';

export interface SelectedListing {
  id: string;
  name: string;
  description?: string;
  quantity: string;
  availableQuantity?: number;
  summary?: ListingSummaryVM;
}

export interface BasicsState {
  format: 'SIMPLE';
  direction: 'FORWARD' | 'REVERSE';
  accessibility: 'PUBLIC' | 'PRIVATE';
  preset: string;
  title: string;
  description: string;
  referenceId: string;
  currencyUnit: string;
  timeZone: string;
  precision: string;
  roundingMode: string;
  unitType: 'SINGLE_UNIT' | 'BUNDLE';
  unitName: string;
  items: SelectedListing[];
  openingPrice: string;
  reserveEnabled: boolean;
  reserveAmount: string;
  reserveVisibility: ReserveVisibility;
}

export interface PriceWindow {
  id: string;
  type: PriceMoveType;
  /** ISO-8601 duration for the window. The last window always runs to the close. */
  duration: string;
  /** Step amount or percentage value. */
  value: string;
  /** Optional upper bound for percentage-range windows. */
  maxValue: string;
  /** Jump multipliers allowed for step-based windows. */
  steps: number[];
  /** Clock-only values. */
  clockEveryMinutes: string;
  clockStopAt: string;
}

export interface OfferState {
  mechanism: AuctionMechanism;
  windows: PriceWindow[];
  firstBidMayEqual: boolean;
  offerVisibility: OfferVisibilityChoice;
  participantVisibility: ParticipantVisibilityChoice;
  withdrawal: 'NOT_ALLOWED' | 'ALLOWED';
  withdrawalMinutes: string;
  sealedRevision: boolean;
  sealedOpening: 'ON_CLOSE' | 'AFTER_CLOSE';
  clockResponseSeconds: string;
}

export interface ScheduleState {
  startTime: string;
  endMode: 'DURATION' | 'FIXED';
  durationHours: string;
  durationMinutes: string;
  endTime: string;
  softCloseEnabled: boolean;
  extendMinutes: string;
  extensionReference: 'FROM_AUCTION_END_TIME' | 'FROM_LATEST_OFFER_TIME';
  limitEnabled: boolean;
  extensionLimit: string;
}

export interface ParticipationState {
  minimumEnabled: boolean;
  minimumCount: string;
  checkDays: string;
  checkHours: string;
  checkMinutes: string;
  workflowCount: number;
}

export type TieChoice = 'EARLIEST' | 'RANDOM' | 'REBID';
export type NoSaleAction = 'UNSOLD' | 'REAUCTION' | 'ACCEPT_BEST';
export type ResultConfirmation = 'AUTOMATIC' | 'MANUAL';

export interface AwardState {
  winnerType: string;
  winnerKth: string;
  winnerPriceType: string;
  winnerPriceKth: string;
  /** How a tie for the winning rank is broken. */
  ties: TieChoice;
  /** What happens when no bid meets the reserve, or nobody bids. */
  noSale: NoSaleAction;
  /** Whether the result is final at the close or needs an admin to confirm it. */
  confirmation: ResultConfirmation;
  /** Days the admin has to confirm the result when `confirmation` is MANUAL. */
  confirmDays: string;
}

export interface WizardState {
  basics: BasicsState;
  offer: OfferState;
  schedule: ScheduleState;
  participation: ParticipationState;
  award: AwardState;
}

/** Live counts from the Step 7 invitation workspace, used by the sidebar. */
export interface InviteStats {
  invited: number;
  ready: number;
  review: number;
}

export const DEFAULT_WINDOWS: PriceWindow[] = [
  {
    id: 'window-1',
    type: 'STEP',
    duration: 'PT1H',
    value: '1000',
    maxValue: '',
    steps: [1, 2, 3, 5, 10],
    clockEveryMinutes: '2',
    clockStopAt: '',
  },
  {
    id: 'window-2',
    type: 'PERCENT',
    duration: 'PT30M',
    value: '2',
    maxValue: '',
    steps: [1, 2, 3, 5, 10],
    clockEveryMinutes: '2',
    clockStopAt: '',
  },
  {
    id: 'window-3',
    type: 'STEP',
    duration: 'PT0S',
    value: '500',
    maxValue: '',
    steps: [1, 2, 3, 5, 10],
    clockEveryMinutes: '2',
    clockStopAt: '',
  },
];

function inTwoHours(): { start: string; end: string } {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 2);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return { start: localInput(start), end: localInput(end) };
}

export function localInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function addMinutes(value: string, minutes: number): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() + minutes);
  return localInput(date);
}

const times = inTwoHours();

export const initialWizardState: WizardState = {
  basics: {
    format: 'SIMPLE',
    direction: 'FORWARD',
    accessibility: 'PUBLIC',
    preset: 'none',
    title: '',
    description: '',
    referenceId: '',
    currencyUnit: 'INR',
    timeZone: 'Asia/Kolkata',
    precision: '2',
    roundingMode: 'UP',
    unitType: 'SINGLE_UNIT',
    unitName: '',
    items: [],
    openingPrice: '',
    reserveEnabled: false,
    reserveAmount: '',
    reserveVisibility: 'HIDDEN',
  },
  offer: {
    mechanism: 'OPEN',
    windows: DEFAULT_WINDOWS,
    firstBidMayEqual: true,
    offerVisibility: 'FULL',
    participantVisibility: 'ALIAS',
    withdrawal: 'NOT_ALLOWED',
    withdrawalMinutes: '30',
    sealedRevision: true,
    sealedOpening: 'ON_CLOSE',
    clockResponseSeconds: '30',
  },
  schedule: {
    startTime: times.start,
    endMode: 'DURATION',
    durationHours: '2',
    durationMinutes: '0',
    endTime: times.end,
    softCloseEnabled: true,
    extendMinutes: '2',
    extensionReference: 'FROM_AUCTION_END_TIME',
    limitEnabled: true,
    extensionLimit: '5',
  },
  participation: {
    minimumEnabled: true,
    minimumCount: '3',
    checkDays: '0',
    checkHours: '0',
    checkMinutes: '30',
    workflowCount: 0,
  },
  award: {
    winnerType: 'KTH_PRICE_WINNER_DETERMINATION_POLICY',
    winnerKth: '1',
    winnerPriceType: 'KTH_WINNER_PRICE_DETERMINATION_POLICY',
    winnerPriceKth: '1',
    ties: 'EARLIEST',
    noSale: 'UNSOLD',
    confirmation: 'AUTOMATIC',
    confirmDays: '3',
  },
};

/** A fresh, deep-copied starting state with a start time relative to now. */
export function createInitialWizardState(): WizardState {
  const { start, end } = inTwoHours();
  return {
    basics: { ...initialWizardState.basics, items: [] },
    offer: {
      ...initialWizardState.offer,
      windows: initialWizardState.offer.windows.map((window) => ({
        ...window,
        steps: [...window.steps],
      })),
    },
    schedule: { ...initialWizardState.schedule, startTime: start, endTime: end },
    participation: { ...initialWizardState.participation },
    award: { ...initialWizardState.award },
  };
}
