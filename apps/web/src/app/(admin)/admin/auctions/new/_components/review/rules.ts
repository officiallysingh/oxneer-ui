import type { AuctionWorkflowStep } from '@repo/api';
import type { WizardState } from '../shared/types';
import {
  endTimeFor,
  formatDateTime,
  formatDuration,
  formatMoney,
  formatTime,
  latestCloseFor,
  noSaleLabel,
  offsetLabelParts,
  tiesLabel,
  winnerBase,
  winnerLabel,
  windowSummary,
} from '../shared/summary';
import { stepTitle } from '../shared/workflow';

export type RulesSection = { title: string; lines: string[] };

/** Plain-language version of the auction rules, used by the review screen's
 *  "Show the rules as text" panel. */
export function buildRules(
  state: WizardState,
  preSteps: AuctionWorkflowStep[],
  postSteps: AuctionWorkflowStep[],
): RulesSection[] {
  const { basics, offer, schedule, award, participation } = state;
  const symbol = basics.currencyUnit === 'INR' ? '₹' : basics.currencyUnit;
  const start = schedule.startTime;
  const closing = endTimeFor(schedule);
  const latestClose = latestCloseFor(schedule);
  const bidWord = basics.direction === 'FORWARD' ? 'bid' : 'ask';
  const bidderWord = basics.direction === 'FORWARD' ? 'bidder' : 'supplier';
  const isPrivate = basics.accessibility === 'PRIVATE';
  const sections: RulesSection[] = [];

  sections.push({
    title: 'Auction',
    lines: [
      `Simple auction (SIMPLE), ${basics.direction === 'FORWARD' ? 'forward: you are selling' : 'reverse: you are buying'}.`,
      isPrivate
        ? 'Private: only invited participants can join.'
        : 'Public: any registered user can join.',
      `Prices in ${basics.currencyUnit}. All times are in ${basics.timeZone}.`,
    ],
  });

  const unitLines = [
    basics.items[0]
      ? `“${basics.unitName || basics.items[0].name}” is a ${
          basics.unitType === 'SINGLE_UNIT' ? 'Single Unit' : 'Bundle'
        }: ${basics.items[0].quantity} × ${basics.items[0].name}. It is ${
          basics.direction === 'FORWARD' ? 'sold' : 'bought'
        } as a whole, to one winner.`
      : 'The unit has no listing yet.',
    `${
      basics.direction === 'FORWARD' ? 'Opening' : 'Starting'
    } price: ${formatMoney(basics.openingPrice, basics.currencyUnit)} for the whole unit.`,
    basics.reserveEnabled
      ? `Reserve: ${formatMoney(basics.reserveAmount, basics.currencyUnit)}, ${
          basics.reserveVisibility === 'SHOWN'
            ? 'shown to participants'
            : basics.reserveVisibility === 'MET_ONLY'
              ? 'shown once met'
              : 'hidden from participants'
        }.`
      : 'No reserve price.',
  ];
  sections.push({ title: 'Unit', lines: unitLines });

  if (offer.mechanism === 'SEALED') {
    sections.push({
      title: 'Offer rules',
      lines: [
        `Sealed: hidden ${bidWord}s, opened when bidding closes. Revisions ${
          offer.sealedRevision ? 'allowed' : 'not allowed'
        } until the deadline.`,
        `Bidder names: ${
          offer.participantVisibility === 'REAL'
            ? 'real names'
            : offer.participantVisibility === 'HIDDEN'
              ? 'hidden'
              : 'aliases'
        }.`,
      ],
    });
  } else if (offer.mechanism === 'CLOCK') {
    sections.push({
      title: 'Offer rules',
      lines: [
        `Clock: the platform moves the price on a timer. Bidders who don’t confirm within ${offer.clockResponseSeconds} seconds drop out.`,
        ...offer.windows.map(
          (window, index) =>
            `Window ${index + 1} (${index === 0 ? 'the whole auction' : 'from ' + formatDuration(window.duration)}): ${windowSummary(window, symbol)}.`,
        ),
        `Participants see: ${
          offer.offerVisibility === 'RANK'
            ? 'their own rank only'
            : offer.offerVisibility === 'NOTHING'
              ? 'nothing until the close'
              : 'the best price and their own rank'
        }.`,
      ],
    });
  } else {
    sections.push({
      title: 'Offer rules',
      lines: [
        `Open bidding: each ${bidWord} must beat the current price.`,
        ...offer.windows.map(
          (window, index) =>
            `Window ${index + 1}${index === offer.windows.length - 1 ? ' (to the close)' : ''}: ${windowSummary(window, symbol)} · ${formatDuration(window.duration)}.`,
        ),
        `The first ${bidWord} ${offer.firstBidMayEqual ? 'may equal' : 'must beat'} the ${
          basics.direction === 'FORWARD' ? 'opening' : 'starting'
        } price.`,
        `A ${bidWord} ${offer.withdrawal === 'ALLOWED' ? 'can be withdrawn until 10 minutes before the close' : 'can’t be withdrawn'}.`,
        `While bidding is open, ${bidderWord}s see: ${
          offer.offerVisibility === 'RANK'
            ? 'their own rank only'
            : offer.offerVisibility === 'NOTHING'
              ? 'nothing until the close'
              : 'the best price and their own rank'
        }.`,
        `Bidder names: ${
          offer.participantVisibility === 'REAL'
            ? 'real names'
            : offer.participantVisibility === 'HIDDEN'
              ? 'hidden'
              : 'aliases'
        }.`,
      ],
    });
  }

  sections.push({
    title: 'Schedule and closing',
    lines: [
      `Starts: ${formatDateTime(start)}.`,
      `Bidding ends at ${formatDateTime(closing)}.`,
      schedule.softCloseEnabled
        ? `Soft close: a ${bidWord} in the last ${schedule.extendMinutes} min adds ${schedule.extendMinutes} min to the close${
            schedule.limitEnabled ? `, up to ${schedule.extensionLimit} times` : ''
          }. Latest possible close: ${formatTime(latestClose)}.`
        : 'No soft close.',
      participation.minimumEnabled
        ? `Minimum participants: if fewer than ${participation.minimumCount} participants are ready ${
            offsetLabelParts(
              `PT${(parseInt(participation.checkDays, 10) || 0) * 24 + (parseInt(participation.checkHours, 10) || 0)}H${
                parseInt(participation.checkMinutes, 10) || 0
              }M`,
              'start',
            ) || 'at the start'
          }, the auction is cancelled automatically.`
        : 'No minimum participants.',
    ],
  });

  const beforeNames = preSteps.map(stepTitle);
  sections.push({
    title: 'Participation',
    lines: [
      isPrivate
        ? 'Private: only invited participants can join.'
        : 'Public: anyone registered can join.',
      beforeNames.length
        ? `Before the auction: ${beforeNames.join(' → ')}.`
        : 'No steps before the auction.',
      `Only participants who finish every required step by its deadline can ${bidWord}.`,
    ],
  });

  sections.push({
    title: 'Award',
    lines: [
      `Who wins: ${winnerBase(state).toLowerCase()}.`,
      `Ties: ${tiesLabel(state).toLowerCase()}.`,
      `Winning price: ${winnerLabel(state).split(' · ')[1] ?? 'own price'}.`,
      `If nothing is awarded: ${noSaleLabel(state).toLowerCase()}.`,
      award.confirmation === 'MANUAL'
        ? `The result stays provisional until you confirm it, within ${award.confirmDays || 0} day(s).`
        : 'The result is final when bidding closes.',
      postSteps.length
        ? `After the auction (winner only): ${postSteps.map(stepTitle).join(' → ')}.`
        : 'No steps after the auction.',
    ],
  });

  return sections;
}

/** One-sentence worked example shown under the rules text. */
export function exampleSentence(state: WizardState): string {
  const base = parseFloat(state.basics.openingPrice) || 800000;
  const sign = state.basics.direction === 'FORWARD' ? 1 : -1;
  const values = [25000, 10000, 9000, 4000].map((delta) => formatMoney(base + sign * delta));
  const kth = parseInt(state.award.winnerKth, 10) || 1;
  const winner = formatMoney(base + sign * [25000, 10000, 9000, 4000][kth - 1]!);
  const pays = state.award.winnerPriceKth === '1' ? winner : formatMoney(base + sign * 10000);
  const verb = state.basics.direction === 'FORWARD' ? 'bids' : 'asks';
  const paid = state.basics.direction === 'FORWARD' ? 'pays' : 'is paid';
  return `A ${verb} ${values[0]}, B ${values[1]}, C ${values[2]}, D ${values[3]}. A wins and ${paid} ${pays}.`;
}
