import type { AuctionVM, AuctionWorkflowStep } from '@repo/api';
import { resolveStr } from '@/components/common/admin/format';
import type { WizardState } from '../../../_lib/wizard/types';
import {
  endTimeFor,
  formatDuration,
  formatTime,
  latestCloseFor,
  offsetDuration,
  offsetLabelParts,
  priceLabel,
  windowSummary,
  winnerBase,
} from '../../../_lib/wizard/summary';
import { postDeadlineFor, stepTitle } from '../../../_lib/wizard/workflow';
import { dhm, ownOffset } from '../../../_lib/wizard/deadlines';
import { depositFor, minimumRaise, money, words } from './facts';
import { strong, type Phrase } from './phrase';

export type RuleIcon =
  | 'people'
  | 'gavel'
  | 'eye'
  | 'clock'
  | 'trophy'
  | 'flag'
  | 'alert'
  | 'wallet';

export interface ExampleBid {
  who: string;
  amount: string;
  accepted: boolean;
  note: string;
}

/** The end-time bar: planned bidding, then each possible extension. */
export interface EndTrack {
  start: string;
  plannedEnd: string;
  latestEnd: string;
  extensionMinutes: number;
  extensions: number;
}

export interface RuleCard {
  key: string;
  icon: RuleIcon;
  title: string;
  paragraphs: Phrase[];
  list?: Phrase[];
  note?: string;
  examples?: ExampleBid[];
  exampleText?: Phrase[];
  endTrack?: EndTrack;
  /** A live status line, e.g. how many people are ready right now. */
  status?: { text: string; ok: boolean };
  /** The policy and setting names behind the card, shown on request. */
  tech: string[];
}

interface RulesInput {
  auction: AuctionVM;
  state: WizardState;
  preSteps: AuctionWorkflowStep[];
  postSteps: AuctionWorkflowStep[];
  /** People ready to bid right now, when known. */
  readyCount?: number;
}

function techValue(value: unknown): string {
  return resolveStr(value) || '—';
}

function accessCard({ auction, state, preSteps }: RulesInput): RuleCard {
  const isPrivate = state.basics.accessibility === 'PRIVATE';
  const deposit = depositFor(preSteps);
  const paragraphs: Phrase[] = [
    isPrivate
      ? [
          strong('Only people you invite.'),
          preSteps.length ? ' Each person must finish these steps before bidding opens:' : '',
        ]
      : [
          strong('Anyone registered on the platform.'),
          preSteps.length ? ' Each person must finish these steps before bidding opens:' : '',
        ],
  ];
  const list = preSteps.map((step): Phrase => {
    const lead = ownOffset(step);
    const due = lead ? `${dhm(lead)} before the start` : '';
    const title = stepTitle(step);
    const isDeposit = resolveStr(step.type) === 'PAYMENT_STEP' && deposit;
    return [
      isDeposit ? `${title}: ` : title,
      ...(isDeposit ? [strong(money(state, deposit.amount))] : []),
      due ? ` (${due})` : '',
    ];
  });
  return {
    key: 'access',
    icon: 'people',
    title: 'Who can take part?',
    paragraphs,
    list: list.length ? list : undefined,
    note: preSteps.length ? 'Anyone who misses a deadline can watch but can’t bid.' : undefined,
    tech: [
      `Accessibility: ${techValue(auction.accessibility)}`,
      `Pre-auction steps: ${preSteps.length}`,
    ],
  };
}

function exampleBids(state: WizardState): ExampleBid[] | undefined {
  const opening = parseFloat(state.basics.openingPrice);
  const first = state.offer.windows[0];
  if (state.offer.mechanism !== 'OPEN' || first?.type !== 'STEP' || Number.isNaN(opening)) {
    return undefined;
  }
  const step = parseFloat(first.value);
  if (!step) return undefined;
  const sign = state.basics.direction === 'FORWARD' ? 1 : -1;
  const tooSmall = opening + sign * (step / 2);
  const enough = opening + sign * step;
  return [
    {
      who: 'Bidder 1',
      amount: money(state, opening),
      accepted: true,
      note: `Accepted, first ${words(state).bid}`,
    },
    {
      who: 'Bidder 2',
      amount: money(state, tooSmall),
      accepted: false,
      note: `Too small, needs ${money(state, enough)}`,
    },
    { who: 'Bidder 2', amount: money(state, enough), accepted: true, note: 'Accepted' },
  ];
}

function biddingCard({ state }: RulesInput): RuleCard {
  const w = words(state);
  const { offer } = state;
  const opening = state.basics.openingPrice
    ? money(state, state.basics.openingPrice)
    : 'the opening price';
  const symbol = state.basics.currencyUnit === 'INR' ? '₹' : state.basics.currencyUnit;
  const tech = [`Mechanism: ${offer.mechanism}`];

  if (offer.mechanism === 'SEALED') {
    return {
      key: 'bidding',
      icon: 'gavel',
      title: 'How does bidding work?',
      paragraphs: [
        [
          strong(`Sealed ${w.bids}`),
          ` — each person sends one hidden ${w.bid}. Nobody sees any ${w.bid} until bidding closes.`,
        ],
      ],
      tech,
    };
  }

  const windows = offer.mechanism === 'CLOCK' ? offer.clockWindows : offer.windows;
  tech.push(`Price progression · ${windows.length} window${windows.length === 1 ? '' : 's'}`);

  if (offer.mechanism === 'CLOCK') {
    return {
      key: 'bidding',
      icon: 'gavel',
      title: 'How does bidding work?',
      paragraphs: [
        [
          strong('Clock auction'),
          ` — the platform moves the price on a timer, starting at `,
          strong(opening),
          '. People confirm to stay in; the last one left wins.',
        ],
      ],
      list: windows.map(
        (window, index): Phrase => [`Window ${index + 1}: ${windowSummary(window, symbol)}`],
      ),
      tech,
    };
  }

  const raise = minimumRaise(state);
  const paragraphs: Phrase[] = [
    [
      strong('Open bidding'),
      ` — everyone places ${w.bids} live and sees the current best ${w.bid}. ${w.forward ? 'Bids' : 'Asks'} start at `,
      strong(opening),
      ...(raise
        ? [`, and each new ${w.bid} must be at least `, strong(`${raise} ${w.higher}`), '.']
        : ['.']),
    ],
  ];
  return {
    key: 'bidding',
    icon: 'gavel',
    title: 'How does bidding work?',
    paragraphs,
    list:
      windows.length > 1
        ? windows.map(
            (window, index): Phrase => [
              `Window ${index + 1}${index === windows.length - 1 ? ' (to the close)' : ` · ${formatDuration(window.duration)}`}: `,
              strong(windowSummary(window, symbol)),
            ],
          )
        : undefined,
    examples: exampleBids(state),
    tech,
  };
}

const OFFER_VIEW: Record<WizardState['offer']['offerVisibility'], string> = {
  FULL: 'the best bid so far and their own rank',
  RANK: 'only their own rank',
  NOTHING: 'nothing until bidding closes',
};

function visibilityCard({ state, auction }: RulesInput): RuleCard {
  const names: Phrase =
    state.offer.participantVisibility === 'ALIAS'
      ? [
          'Names are hidden — bidders appear as ',
          strong('Bidder 1, Bidder 2…'),
          '. You always see real names.',
        ]
      : state.offer.participantVisibility === 'HIDDEN'
        ? ['Bidders ', strong('can’t see who else'), ' is taking part.']
        : ['Bidders see each other’s ', strong('real names'), '.'];
  return {
    key: 'visibility',
    icon: 'eye',
    title: 'What do bidders see?',
    paragraphs: [
      [
        'While bidding is open, each bidder sees ',
        strong(OFFER_VIEW[state.offer.offerVisibility]),
        '.',
      ],
      names,
    ],
    tech: [
      `Offer visibility: ${techValue(auction.offerVisibility)}`,
      `Participant visibility: ${techValue(auction.participantVisibility)}`,
    ],
  };
}

function endingCard({ state }: RulesInput): RuleCard {
  const { schedule } = state;
  const w = words(state);
  const end = endTimeFor(schedule);
  const plannedEnd = formatTime(end);
  const softClose = schedule.softCloseEnabled && state.offer.mechanism === 'OPEN';
  if (!softClose) {
    return {
      key: 'ending',
      icon: 'clock',
      title: 'When does bidding end?',
      paragraphs: [['Bidding ends at ', strong(plannedEnd), '. Late bids don’t add time.']],
      tech: ['Soft close: off'],
    };
  }

  const minutes = parseInt(schedule.extendMinutes, 10) || 0;
  const limit = schedule.limitEnabled ? parseInt(schedule.extensionLimit, 10) || 0 : 0;
  const fromEnd = schedule.extensionReference === 'FROM_AUCTION_END_TIME';
  const latest = formatTime(latestCloseFor(schedule));
  const paragraph: Phrase = fromEnd
    ? [
        'Bidding is planned to end at ',
        strong(plannedEnd),
        '. If someone bids in the ',
        strong(`last ${minutes} minutes`),
        `, ${minutes} minutes are added so others get a fair chance to reply.`,
      ]
    : [
        'Bidding is planned to end at ',
        strong(plannedEnd),
        `. Once a late ${w.bid} comes in, bidding ends `,
        strong(`${minutes} minutes after the latest ${w.bid}`),
        '.',
      ];
  if (limit) paragraph.push(' This can happen up to ', strong(`${limit} times`), '.');
  else paragraph.push(' There is no limit to how often this can happen.');

  return {
    key: 'ending',
    icon: 'clock',
    title: 'When does bidding end?',
    paragraphs: [paragraph],
    endTrack:
      limit && minutes
        ? {
            start: formatTime(schedule.startTime),
            plannedEnd,
            latestEnd: latest,
            extensionMinutes: minutes,
            extensions: limit,
          }
        : undefined,
    tech: [`Soft close: ${minutes} min × ${limit || 'no limit'}`],
  };
}

/** "Bidder 1 bids ₹8,30,000, Bidder 2 bids ₹8,20,000. Bidder 1 wins and pays ₹8,30,000."
 *  Only for open bidding with fixed steps, where the numbers are easy to follow. */
function winnerExample(state: WizardState): Phrase[] | undefined {
  const w = words(state);
  const opening = parseFloat(state.basics.openingPrice);
  const first = state.offer.windows[0];
  const step = parseFloat(first?.value ?? '');
  const ownPrice = priceLabel(state.award.winnerPriceKth) === 'own price';
  const simple = state.offer.mechanism === 'OPEN' && first?.type === 'STEP';
  if (!simple || !ownPrice || Number.isNaN(opening) || !step) return undefined;

  const sign = w.forward ? 1 : -1;
  const top = money(state, opening + sign * step * 3);
  const next = money(state, opening + sign * step * 2);
  return [
    [`Bidder 1 ${w.bids} ${top}, Bidder 2 ${w.bids} ${next}.`],
    [strong(`Bidder 1 wins and ${w.forward ? 'pays' : 'is paid'} ${top}.`)],
  ];
}

function winnerCard({ state, auction }: RulesInput): RuleCard {
  const w = words(state);
  const { basics, award } = state;
  const price = priceLabel(award.winnerPriceKth);
  const paragraphs: Phrase[] = [
    [
      'The ',
      strong(`${winnerBase(state).replace(/^The /, '').toLowerCase()} wins`),
      `. The winner ${w.forward ? 'pays' : 'is paid'} `,
      strong(price === 'own price' ? `exactly what they ${w.bid}` : `the ${price}`),
      '.',
    ],
  ];
  if (basics.reserveEnabled && basics.reserveAmount) {
    const hidden = basics.reserveVisibility === 'HIDDEN';
    paragraphs.push([
      `Your ${hidden ? 'hidden minimum' : 'reserve price'} is `,
      strong(money(state, basics.reserveAmount)),
      `. If the ${w.best} ${w.bid} doesn’t reach it, `,
      strong('nothing is awarded'),
      '.',
    ]);
  }

  return {
    key: 'winner',
    icon: 'trophy',
    title: `Who wins, and what do they ${w.forward ? 'pay' : 'get'}?`,
    paragraphs,
    exampleText: winnerExample(state),
    tech: [
      `Winner: ${award.winnerKth === '1' ? (w.forward ? 'HIGHEST' : 'LOWEST') : `KTH (${award.winnerKth})`}`,
      `Winning price: ${price === 'own price' ? 'OWN_BID' : `KTH (${award.winnerPriceKth})`}`,
      ...(basics.reserveEnabled ? [`Reserve: ${basics.reserveVisibility}`] : []),
      `Direction: ${techValue(auction.direction)}`,
    ],
  };
}

function afterCard({ preSteps, postSteps }: RulesInput): RuleCard {
  const deposit = depositFor(preSteps);
  const list: Phrase[] = postSteps.map((step) => [
    strong(stepTitle(step)),
    ` (winner only, ${postDeadlineFor(step).toLowerCase()})`,
  ]);
  if (deposit?.refundable) {
    list.push(['Everyone else gets their ', strong('deposit back'), '.']);
  }
  return {
    key: 'after',
    icon: 'flag',
    title: 'What happens after bidding?',
    paragraphs: list.length
      ? []
      : [['Nothing else is needed: the result is the end of the auction.']],
    list: list.length ? list : undefined,
    tech: [`Post-auction steps: ${postSteps.length}`],
  };
}

function minimumCard({ state, preSteps, readyCount }: RulesInput): RuleCard | null {
  const { participation } = state;
  if (!participation.minimumEnabled) return null;
  const count = parseInt(participation.minimumCount, 10) || 0;
  const when =
    offsetLabelParts(offsetDuration(participation), 'bidding starts') || 'When bidding starts';
  const deposit = depositFor(preSteps);
  return {
    key: 'minimum',
    icon: 'alert',
    title: 'What if too few people join?',
    paragraphs: [
      [
        `${when.charAt(0).toUpperCase()}${when.slice(1)}, the system checks how many people are ready. If `,
        strong(`fewer than ${count}`),
        ', the auction is ',
        strong('cancelled automatically'),
        deposit?.refundable ? ' and deposits are refunded.' : '.',
      ],
    ],
    status:
      readyCount === undefined
        ? undefined
        : {
            text: `Right now ${readyCount} ${readyCount === 1 ? 'person is' : 'people are'} ready`,
            ok: readyCount >= count,
          },
    tech: [
      `Minimum participants: ${count} · ${offsetLabelParts(offsetDuration(participation), 'start') || 'at start'}`,
    ],
  };
}

function settingsCard({ state }: RulesInput): RuleCard {
  const { basics } = state;
  return {
    key: 'settings',
    icon: 'wallet',
    title: 'Money and time settings',
    paragraphs: [
      [
        'All amounts are in ',
        strong(basics.currencyUnit),
        '. All times are ',
        strong(basics.timeZone),
        ' time.',
      ],
    ],
    tech: [
      `Currency: ${basics.currencyUnit}`,
      `Time zone: ${basics.timeZone}`,
      `Rounding: ${basics.roundingMode}`,
    ],
  };
}

/** Every rule the bidders agreed to, as plain-language cards. */
export function ruleCards(input: RulesInput): RuleCard[] {
  return [
    accessCard(input),
    biddingCard(input),
    visibilityCard(input),
    endingCard(input),
    winnerCard(input),
    afterCard(input),
    minimumCard(input),
    settingsCard(input),
  ].filter((card): card is RuleCard => card !== null);
}
