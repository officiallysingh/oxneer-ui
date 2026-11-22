import type { AuctionWorkflowStep } from '@repo/api';
import { paymentStepData, resolveStr } from '../../../_components/PolicyShared';
import type { WizardState } from '../../../_lib/wizard/types';
import {
  endTimeFor,
  formatMoney,
  formatShortDate,
  formatTime,
  latestCloseFor,
  priceLabel,
  windowSummary,
  winnerBase,
} from '../../../_lib/wizard/summary';
import { strong, type Phrase } from './phrase';

// ── Words that change with the direction ─────────────────────────────────────

export function words(state: WizardState) {
  const forward = state.basics.direction === 'FORWARD';
  return {
    forward,
    bid: forward ? 'bid' : 'ask',
    bids: forward ? 'bids' : 'asks',
    sell: forward ? 'selling' : 'buying',
    sold: forward ? 'sold' : 'bought',
    best: forward ? 'highest' : 'lowest',
    more: forward ? 'more' : 'less',
    higher: forward ? 'higher' : 'lower',
  };
}

// ── Money ────────────────────────────────────────────────────────────────────

export function money(state: WizardState, value: string | number): string {
  return formatMoney(value, state.basics.currencyUnit);
}

export interface Deposit {
  amount: number;
  refundable: boolean;
}

/** Fixed charges a participant pays before bidding. Percentage heads are left
 *  out: before the auction there is no price to take a share of. */
export function depositFor(preSteps: AuctionWorkflowStep[]): Deposit | null {
  const heads = preSteps
    .filter((step) => resolveStr(step.type) === 'PAYMENT_STEP')
    .flatMap((step) => paymentStepData(step).heads)
    .filter((head) => head.basis !== 'PERCENTAGE_BASED');
  if (heads.length === 0) return null;
  return {
    amount: heads.reduce((sum, head) => sum + (head.value ?? 0), 0),
    refundable: heads.every((head) => head.refundable),
  };
}

/** The first price window decides the opening raise; later windows can change it. */
export function minimumRaise(state: WizardState): string | null {
  if (state.offer.mechanism !== 'OPEN') return null;
  const first = state.offer.windows[0];
  if (!first) return null;
  if (first.type === 'STEP') return money(state, first.value || 0);
  return windowSummary(
    first,
    state.basics.currencyUnit === 'INR' ? '₹' : state.basics.currencyUnit,
  );
}

export interface KeyAmount {
  key: 'opening' | 'raise' | 'reserve' | 'deposit';
  label: string;
  value: string;
  note: string;
}

export function keyAmounts(state: WizardState, preSteps: AuctionWorkflowStep[]): KeyAmount[] {
  const { basics, offer } = state;
  const w = words(state);
  const amounts: KeyAmount[] = [
    {
      key: 'opening',
      label: 'Starting price',
      value: basics.openingPrice ? money(state, basics.openingPrice) : 'Not set',
      note: `${w.forward ? 'Bids' : 'Asks'} start here`,
    },
  ];

  const raise = minimumRaise(state);
  if (raise) {
    amounts.push({
      key: 'raise',
      label: 'Minimum raise',
      value: raise,
      note:
        offer.windows.length > 1
          ? 'At the start; it changes as bidding goes on'
          : `Smallest step between two ${w.bids}`,
    });
  }

  if (basics.reserveEnabled && basics.reserveAmount) {
    const hidden = basics.reserveVisibility === 'HIDDEN';
    amounts.push({
      key: 'reserve',
      label: hidden ? 'Hidden minimum' : 'Reserve price',
      value: money(state, basics.reserveAmount),
      note: hidden
        ? 'Reserve price, bidders don’t see it'
        : basics.reserveVisibility === 'MET_ONLY'
          ? 'Shown to bidders once it is met'
          : 'Shown to bidders',
    });
  }

  const deposit = depositFor(preSteps);
  if (deposit) {
    amounts.push({
      key: 'deposit',
      label: 'Deposit to join',
      value: money(state, deposit.amount),
      note: deposit.refundable ? 'Refunded to everyone who doesn’t win' : 'Not refundable',
    });
  }

  return amounts;
}

// ── Header chips ─────────────────────────────────────────────────────────────

export interface AuctionChip {
  key: 'direction' | 'access' | 'mechanism';
  label: string;
}

const MECHANISM_LABEL: Record<WizardState['offer']['mechanism'], string> = {
  OPEN: 'Open bidding',
  SEALED: 'Sealed bids',
  CLOCK: 'Clock auction',
};

export function auctionChips(state: WizardState): AuctionChip[] {
  const w = words(state);
  return [
    {
      key: 'direction',
      label: `${w.forward ? 'Selling' : 'Buying'} · ${winnerBase(state).toLowerCase().replace(/^the /, '')} wins`,
    },
    {
      key: 'access',
      label:
        state.basics.accessibility === 'PRIVATE' ? 'Private · invite only' : 'Public · open to all',
    },
    { key: 'mechanism', label: MECHANISM_LABEL[state.offer.mechanism] },
  ];
}

// ── "This auction in plain words" ────────────────────────────────────────────

export type SummaryIcon = 'item' | 'price' | 'winner' | 'access' | 'time' | 'minimum';

export interface SummaryLine {
  key: SummaryIcon;
  phrase: Phrase;
}

function itemPhrase(state: WizardState): Phrase {
  const { basics } = state;
  const w = words(state);
  const first = basics.items[0];
  if (!first) return [`You are ${w.sell} `, strong('an item that isn’t chosen yet'), '.'];
  if (basics.unitType === 'SINGLE_UNIT') {
    return [
      `You are ${w.sell} `,
      strong('one item'),
      `: ${basics.unitName || first.name}. It goes to `,
      strong('one winner'),
      ' as a whole.',
    ];
  }
  return [
    `You are ${w.sell} `,
    strong(`a bundle of ${basics.items.length} items`),
    ` as “${basics.unitName}”. It goes to `,
    strong('one winner'),
    ' as a whole.',
  ];
}

function pricePhrase(state: WizardState): Phrase {
  const w = words(state);
  const opening = state.basics.openingPrice
    ? money(state, state.basics.openingPrice)
    : 'the opening price';
  if (state.offer.mechanism === 'SEALED') {
    return [
      `Each ${w.bid} is sealed until bidding closes. ${w.forward ? 'Bids' : 'Asks'} start at `,
      strong(opening),
      '.',
    ];
  }
  if (state.offer.mechanism === 'CLOCK') {
    return ['The platform moves the price on a clock, starting at ', strong(opening), '.'];
  }
  const raise = minimumRaise(state);
  return [
    `${w.forward ? 'Bids' : 'Asks'} start at `,
    strong(opening),
    '.',
    ...(raise
      ? [
          ` Every new ${w.bid} must be at least `,
          strong(`${raise} ${w.more}`),
          ` than the current best ${w.bid}.`,
        ]
      : []),
  ];
}

function winnerPhrase(state: WizardState): Phrase {
  const w = words(state);
  const pays =
    priceLabel(state.award.winnerPriceKth) === 'own price'
      ? `the amount they ${w.bid}`
      : `the ${priceLabel(state.award.winnerPriceKth)}`;
  const phrase: Phrase = [
    'The ',
    strong(`${winnerBase(state).replace(/^The /, '').toLowerCase()} wins`),
    `, and the winner ${w.forward ? 'pays' : 'is paid'} ${pays}.`,
  ];
  if (state.basics.reserveEnabled && state.basics.reserveAmount) {
    const hidden = state.basics.reserveVisibility === 'HIDDEN';
    phrase.push(
      ` If no ${w.bid} reaches your ${hidden ? 'hidden minimum' : 'reserve'} (${money(state, state.basics.reserveAmount)}), `,
      strong('nothing is awarded'),
      '.',
    );
  }
  return phrase;
}

function accessPhrase(state: WizardState): Phrase {
  const names =
    state.offer.participantVisibility === 'ALIAS'
      ? ' Bidders see each other as “Bidder 1, Bidder 2…”, never by name.'
      : state.offer.participantVisibility === 'HIDDEN'
        ? ' Bidders can’t see who else is taking part.'
        : ' Bidders see each other’s real names.';
  return state.basics.accessibility === 'PRIVATE'
    ? [strong('Only people you invite'), ' can join.', names]
    : [strong('Anyone registered'), ' on the platform can join.', names];
}

function timePhrase(state: WizardState): Phrase {
  const { schedule } = state;
  const start = schedule.startTime;
  const end = endTimeFor(schedule);
  if (!start) return ['Bidding ', strong('isn’t scheduled yet'), '.'];
  const span = `${formatShortDate(start)}, ${formatTime(start)} – ${formatTime(end)}`;
  const phrase: Phrase = ['Bidding runs ', strong(span), '.'];
  if (schedule.softCloseEnabled && state.offer.mechanism === 'OPEN') {
    const minutes = schedule.extendMinutes || '0';
    phrase.push(` A late ${words(state).bid} adds ${minutes} more minutes`);
    phrase.push(
      schedule.limitEnabled
        ? `, up to ${schedule.extensionLimit} times, so it ends by ${formatTime(latestCloseFor(schedule))} at the latest.`
        : ', with no limit.',
    );
  }
  return phrase;
}

function minimumPhrase(state: WizardState, preSteps: AuctionWorkflowStep[]): Phrase | null {
  const { participation } = state;
  if (!participation.minimumEnabled) return null;
  const deposit = depositFor(preSteps);
  return [
    'If fewer than ',
    strong(`${participation.minimumCount} people`),
    ' are ready before the start, the auction is ',
    strong('cancelled automatically'),
    deposit?.refundable ? ' and deposits are refunded.' : '.',
  ];
}

export function plainSummary(state: WizardState, preSteps: AuctionWorkflowStep[]): SummaryLine[] {
  const lines: SummaryLine[] = [
    { key: 'item', phrase: itemPhrase(state) },
    { key: 'price', phrase: pricePhrase(state) },
    { key: 'winner', phrase: winnerPhrase(state) },
    { key: 'access', phrase: accessPhrase(state) },
    { key: 'time', phrase: timePhrase(state) },
  ];
  const minimum = minimumPhrase(state, preSteps);
  if (minimum) lines.push({ key: 'minimum', phrase: minimum });
  return lines;
}

// ── "New to auctions?" ───────────────────────────────────────────────────────

export interface GlossaryTerm {
  term: string;
  meaning: string;
}

/** Only the terms this auction actually uses. */
export function glossaryFor(state: WizardState, preSteps: AuctionWorkflowStep[]): GlossaryTerm[] {
  const terms: GlossaryTerm[] = [];
  if (state.basics.reserveEnabled) {
    terms.push({ term: 'Reserve price', meaning: 'Your minimum. Below it, nothing is awarded.' });
  }
  if (state.schedule.softCloseEnabled && state.offer.mechanism === 'OPEN') {
    terms.push({
      term: 'Soft close',
      meaning: 'Late bids add extra time so nobody wins by sniping.',
    });
  }
  if (depositFor(preSteps)) {
    terms.push({
      term: 'Deposit (EMD)',
      meaning: 'Money paid to join; shows the bidder is serious.',
    });
  }
  if (state.offer.participantVisibility === 'ALIAS') {
    terms.push({ term: 'Alias', meaning: 'The name other bidders see instead of the real one.' });
  }
  return terms;
}
