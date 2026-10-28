import type { AuctionWorkflowStep } from '@repo/api';
import { paymentStepData, resolveStr } from '../../../_components/PolicyShared';
import type { WizardState } from '../../../_lib/wizard/types';
import {
  endTimeFor,
  formatDateTime,
  formatMoney,
  formatTime,
  latestCloseFor,
  parseDuration,
  windowSummary,
} from '../../../_lib/wizard/summary';
import { WORKFLOW_TYPE_DESCRIPTION, stepFields, stepTitle } from '../../../_lib/wizard/workflow';
import { dhm, effectiveDeadlines, postStepDue, preStepDue } from '../../../_lib/wizard/deadlines';

export type TimelineIcon = 'terms' | 'form' | 'custom' | 'bank' | 'payment' | 'policy' | 'sealed';

export interface TimelineItem {
  key: string;
  /** Policies are applied automatically and drawn as dark cards. */
  policy: boolean;
  icon: TimelineIcon;
  timeMain: string;
  timeSub: string;
  /** Consecutive items with the same moment share a dashed capsule on the rail. */
  moment: string | number | null;
  n?: number;
  name: string;
  tag: string;
  req?: { label: string; tone: 'default' | 'optional' | 'dark' };
  desc: string;
  chips?: string[];
  heads?: { name: string; sub: string; refundable: boolean; amount: string }[];
  /** Draws the price-window strip inside the card. */
  track?: boolean;
  terms?: string[];
  details?: { title: string; rows: { k: string; v: string }[] };
  note?: { text: string; tone: 'muted' | 'success' };
  /** The item runs over a span of time, shown as a thick bar on the rail. */
  span?: 'short' | 'long';
}

export interface TimelineGroup {
  key: string;
  label: string;
  same: boolean;
  items: TimelineItem[];
}

export interface TimelinePhase {
  id: 'pre' | 'during' | 'post';
  title: string;
  sub: string;
  range: string;
  groups: TimelineGroup[];
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export { dhm };

function validDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function shift(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

const ICON_BY_TYPE: Record<string, TimelineIcon> = {
  TNC_FORM_STEP: 'terms',
  PARTICIPATION_FORM_STEP: 'form',
  FORM_STEP: 'custom',
  BANK_DETAIL_FORM_STEP: 'bank',
  PAYMENT_STEP: 'payment',
};

/** Groups consecutive items that happen at the same moment. */
function finishPhase(items: TimelineItem[], relabel: boolean): TimelineGroup[] {
  const groups: { moment: TimelineItem['moment']; items: TimelineItem[] }[] = [];
  items.forEach((item) => {
    const last = groups[groups.length - 1];
    if (last && item.moment !== null && last.moment === item.moment) last.items.push(item);
    else groups.push({ moment: item.moment, items: [item] });
  });
  return groups.map((group, index) => {
    const first = group.items[0]!;
    const same = group.items.length > 1;
    if (same && relabel) {
      group.items.slice(1).forEach((item) => {
        item.timeSub = `same time as ${first.n ? `step ${first.n}` : first.name}`;
      });
    }
    return {
      key: `${first.key}-${index}`,
      label: same ? `Same moment: ${first.timeMain}` : first.name,
      same,
      items: group.items,
    };
  });
}

export function buildTimeline(
  state: WizardState,
  preSteps: AuctionWorkflowStep[],
  postSteps: AuctionWorkflowStep[],
): TimelinePhase[] {
  const { basics, offer, schedule, participation, award } = state;
  const forward = basics.direction === 'FORWARD';
  const noun = forward ? 'bid' : 'ask';
  const nouns = `${noun}s`;
  const one = forward ? 'bidder' : 'supplier';
  const currency = basics.currencyUnit;
  const symbol = currency === 'INR' ? '₹' : currency;
  const sealed = offer.mechanism === 'SEALED';
  const clock = offer.mechanism === 'CLOCK';
  const softClose = schedule.softCloseEnabled && !sealed && !clock;

  const start = validDate(schedule.startTime);
  const closing = validDate(endTimeFor(schedule));
  const latest = validDate(latestCloseFor(schedule));
  const hm = (date: Date | null, fallback: string) =>
    date ? formatTime(date.toISOString()) : fallback;

  // ---------- pre auction
  const effective = effectiveDeadlines(preSteps);
  const closingRaw = endTimeFor(schedule);

  const stepItem = (step: AuctionWorkflowStep, index: number, pre: boolean): TimelineItem => {
    const type = resolveStr(step.type);
    const data = paymentStepData(step);
    const baseName = pre ? `${forward ? 'opening' : 'starting'} price` : 'winning price';
    const item: TimelineItem = {
      key: step.id,
      policy: false,
      icon: ICON_BY_TYPE[type] ?? 'custom',
      timeMain: '',
      timeSub: '',
      moment: null,
      n: index + 1,
      name: stepTitle(step),
      tag: 'Workflow step',
      req:
        step.mandatory === false
          ? { label: 'Optional', tone: 'optional' }
          : { label: 'Required', tone: 'default' },
      desc:
        step.description || WORKFLOW_TYPE_DESCRIPTION[type] || 'Participants complete this step.',
    };

    const deadline = effective[index];
    const due =
      pre && deadline
        ? preStepDue(step, deadline, schedule.startTime)
        : postStepDue(step, closingRaw);
    item.timeMain = due.main;
    item.timeSub = due.sub;
    if (pre && deadline?.own) item.moment = deadline.offset;
    if (!pre && type === 'PAYMENT_STEP') item.span = 'short';

    if (type === 'TNC_FORM_STEP') {
      item.desc = `${step.description || 'Agreement to take part in the auction.'} Participants tick to accept; it can’t be changed afterwards.`;
      const lines = (step.tncText ?? '')
        .split('\n')
        .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
        .filter(Boolean);
      if (lines.length) item.terms = lines;
      else if (step.tncText === undefined || step.tncText === null)
        item.note = { text: 'Shown as a Word document.', tone: 'muted' };
      else item.note = { text: 'No terms written yet. Add them before publishing.', tone: 'muted' };
    } else if (type === 'PARTICIPATION_FORM_STEP' || type === 'FORM_STEP') {
      const lead = step.description ? `${step.description} ` : '';
      item.desc =
        lead +
        (type === 'PARTICIPATION_FORM_STEP'
          ? `Participation form, ${step.manualApproval ? 'approved by you.' : 'approved automatically.'}`
          : pre
            ? 'Custom form, editable until the start.'
            : 'Custom form for the winner.');
      const fields = stepFields(step);
      if (fields.length) item.chips = fields;
    } else if (type === 'BANK_DETAIL_FORM_STEP') {
      item.desc =
        step.description ||
        (pre
          ? 'Where refunds of the deposit go.'
          : forward
            ? 'Where refunds go.'
            : 'Where the winning supplier is paid.');
      item.chips = stepFields(step);
    } else if (type === 'PAYMENT_STEP') {
      const lead = step.description ? `${step.description} ` : '';
      const online = data.mode === 'ONLINE';
      item.desc =
        lead +
        (online
          ? 'Paid online.'
          : pre
            ? 'Paid offline and recorded by you.'
            : 'Paid offline (cash, cheque or bank transfer) and recorded by you.') +
        (!pre && softClose ? ' The window moves with any extension.' : '');
      if (data.heads.length) {
        item.heads = data.heads.map((head) => ({
          name: head.name || 'Charge',
          sub:
            head.description ||
            (head.basis === 'PERCENTAGE_BASED' ? `a share of the ${baseName}` : 'a fixed amount'),
          refundable: !!head.refundable,
          amount:
            head.basis === 'PERCENTAGE_BASED'
              ? `${head.value ?? 0}% of ${baseName}`
              : formatMoney(head.value ?? 0, currency),
        }));
      }
      if (!pre) {
        item.note = {
          text: `Amount comes from the Winning price policy above: ${winningPriceLink(state)}.`,
          tone: 'success',
        };
      } else if (!data.heads.length) {
        item.note = { text: 'No charges yet. Add at least one before publishing.', tone: 'muted' };
      }
    }
    return item;
  };

  const preItems = preSteps.map((step, index) => stepItem(step, index, true));
  if (participation.minimumEnabled) {
    const check =
      (parseInt(participation.checkDays, 10) || 0) * 1440 +
      (parseInt(participation.checkHours, 10) || 0) * 60 +
      (parseInt(participation.checkMinutes, 10) || 0);
    let position = -1;
    effective.forEach((entry, index) => {
      if (entry.offset >= check) position = index;
    });
    if (position < 0 && resolveStr(preSteps[0]?.type) === 'TNC_FORM_STEP') position = 0;
    preItems.splice(position + 1, 0, {
      key: 'minimum-participants',
      policy: true,
      icon: 'policy',
      timeMain: start
        ? formatDateTime(shift(start, -check))
        : check
          ? `${dhm(check)} before start`
          : 'At the start',
      timeSub: check ? `${dhm(check)} before start` : 'at the start',
      moment: check,
      name: 'Minimum participants',
      tag: 'Policy',
      desc: `The platform counts who has finished every required step due by then. Fewer than ${
        participation.minimumCount || 0
      } and the auction is cancelled automatically.`,
    });
  }

  // ---------- during auction
  const windows = clock ? offer.clockWindows : offer.windows;
  const lastWindow = windows[windows.length - 1];
  const extendMinutes = parseInt(schedule.extendMinutes, 10) || 0;
  const startHm = hm(start, 'Start');
  const closeHm = hm(closing, 'Close');
  const latestHm = schedule.limitEnabled ? hm(latest, 'close') : '…';
  const duringItems: TimelineItem[] = [];

  if (sealed) {
    duringItems.push({
      key: 'sealed',
      policy: false,
      icon: 'sealed',
      timeMain: start && closing ? `${startHm} → ${closeHm}` : 'Start → close',
      timeSub: `opened ${offer.sealedOpening === 'ON_CLOSE' ? 'at the close' : 'at a set time after the close'}`,
      moment: null,
      name: `Sealed ${nouns}`,
      tag: 'Bidding',
      desc: `Each ${one} submits a hidden ${noun}. ${
        offer.sealedRevision
          ? 'They can revise it until the deadline.'
          : `One ${noun} each, no revisions.`
      } Nobody sees any ${noun} until the opening.`,
    });
  } else {
    duringItems.push({
      key: 'price-progression',
      policy: true,
      icon: 'policy',
      timeMain: `${startHm} → ${clock ? 'clock stops' : 'close'}`,
      timeSub: 'runs the whole auction',
      moment: null,
      name: 'Price progression',
      tag: 'Policy',
      req: { label: plural(windows.length, 'window', 'windows'), tone: 'dark' },
      desc: clock
        ? 'The clock moves the price on a timer. Each window starts when the one before ends.'
        : `${forward ? 'Bid' : 'Ask'} steps change as time passes. Each window starts when the one before ends.`,
      track: true,
      details: {
        title: 'Window details',
        rows: windows.map((window, index) => {
          const isLast = index === windows.length - 1;
          const { hours, minutes } = parseDuration(window.duration);
          const length = isLast
            ? clock
              ? 'until the clock stops'
              : 'until the close'
            : dhm(hours * 60 + minutes);
          const stop =
            window.type === 'CLOCK'
              ? ` · stops at ${formatMoney(parseFloat(window.clockStopAt) || 0, currency)}`
              : '';
          return {
            k: `Window ${index + 1}`,
            v: `${windowSummary(window, symbol)}${stop} · ${length}`,
          };
        }),
      },
      span: softClose ? 'long' : undefined,
    });
    if (softClose) {
      const capped = schedule.limitEnabled;
      const fromEnd = schedule.extensionReference === 'FROM_AUCTION_END_TIME';
      const sentence = !extendMinutes
        ? `Set the minutes a late ${noun} adds.`
        : (fromEnd
            ? `A${forward ? '' : 'n'} ${noun} in the last ${extendMinutes} min adds ${extendMinutes} min to the close`
            : `The close is always ${extendMinutes} min after the latest ${noun}`) +
          (capped
            ? `, up to ${schedule.extensionLimit || 0} times. ${
                latest ? `Latest possible close: ${hm(latest, '')}.` : ''
              }`.trimEnd()
            : ', with no limit.');
      duringItems.push({
        key: 'soft-close',
        policy: true,
        icon: 'policy',
        timeMain: `${closeHm} → ${latestHm}`,
        timeSub: `only if late ${nouns} come in`,
        moment: null,
        name: 'Soft close',
        tag: 'Policy',
        desc: sentence,
        note: lastWindow
          ? {
              text: `Overlaps with Price progression. Window ${windows.length} (${windowSummary(
                lastWindow,
                symbol,
              )}) stays in force during every extension.`,
              tone: 'muted',
            }
          : undefined,
      });
    }
  }

  // ---------- post auction
  const closeShort = clock
    ? 'when the clock stops'
    : closing
      ? `${closeHm}${softClose ? ', or later if extended' : ''}`
      : 'when bidding ends';
  const reserve = basics.reserveEnabled ? parseFloat(basics.reserveAmount) || 0 : 0;
  const priceKth = parseInt(award.winnerPriceKth, 10) || 1;
  const needsReserve = !clock && priceKth !== 1 && !(reserve > 0);
  const postItems: TimelineItem[] = [
    {
      key: 'who-wins',
      policy: true,
      icon: 'policy',
      timeMain: 'At close',
      timeSub: closeShort,
      moment: 'close',
      name: 'Who wins',
      tag: 'Policy',
      desc: clock
        ? `The last ${one} left in wins.`
        : `${winnerRank(state)} wins${reserve > 0 ? ', if it meets the reserve.' : '.'}`,
    },
    {
      key: 'ties',
      policy: true,
      icon: 'policy',
      timeMain: 'At close',
      timeSub: 'right after Who wins',
      moment: 'close',
      name: 'Ties',
      tag: 'Policy',
      desc:
        award.ties === 'RANDOM'
          ? `If the winning ${nouns} tie, one is picked at random.`
          : `If the winning ${nouns} tie, the earliest ${noun} wins.`,
    },
    {
      key: 'winning-price',
      policy: true,
      icon: 'policy',
      timeMain: 'At close',
      timeSub: 'once the winner is known',
      moment: 'close',
      name: 'Winning price',
      tag: 'Policy',
      desc: `The winner ${forward ? 'owes' : 'is paid'} ${winningPriceOwed(state)}.`,
      note: needsReserve
        ? { text: 'Needs a reserve price. Set one in Basics and unit.', tone: 'muted' }
        : undefined,
    },
    ...postSteps.map((step, index) => stepItem(step, index, false)),
  ];

  const duringPolicies = sealed ? 0 : softClose ? 2 : 1;
  return [
    {
      id: 'pre',
      title: 'Pre auction',
      sub:
        plural(preSteps.length, 'workflow step', 'workflow steps') +
        (participation.minimumEnabled ? ' · 1 policy' : ''),
      range: start ? `until ${formatDateTime(start.toISOString())}` : 'until the start',
      groups: finishPhase(preItems, true),
    },
    {
      id: 'during',
      title: 'During auction',
      sub: sealed
        ? `No policies · sealed ${nouns}, no workflow steps`
        : `${plural(duringPolicies, 'policy', 'policies')} · participants just place ${nouns}, no workflow steps`,
      range: clock
        ? start
          ? `${formatDateTime(start.toISOString())} → clock stops`
          : 'start → clock stops'
        : start && closing
          ? `${formatDateTime(start.toISOString())} → ${closeHm}`
          : 'start → close',
      groups: finishPhase(duringItems, false),
    },
    {
      id: 'post',
      title: 'Post auction',
      sub: `3 policies · ${plural(postSteps.length, 'workflow step', 'workflow steps')}`,
      range: closing
        ? `from close · ${closeHm}${
            softClose && latest && latest.getTime() !== closing.getTime()
              ? ` (${hm(latest, '')} at latest)`
              : ''
          }`
        : 'from the close',
      groups: finishPhase(postItems, false),
    },
  ];
}

function ordinal(rank: number): string {
  return rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
}

/** "The highest bid" / "The 2nd-lowest ask". */
function winnerRank(state: WizardState): string {
  const forward = state.basics.direction === 'FORWARD';
  const kth = parseInt(state.award.winnerKth, 10) || 1;
  const best = forward ? 'highest' : 'lowest';
  const noun = forward ? 'bid' : 'ask';
  return kth === 1 ? `The ${best} ${noun}` : `The ${ordinal(kth)}-${best} ${noun}`;
}

function winningPriceLink(state: WizardState): string {
  if (state.offer.mechanism === 'CLOCK') return 'the clock price';
  const forward = state.basics.direction === 'FORWARD';
  const noun = forward ? 'bid' : 'ask';
  const kth = parseInt(state.award.winnerPriceKth, 10) || 1;
  return kth === 1
    ? `the winner’s own ${noun}`
    : `the ${ordinal(kth)}-${forward ? 'highest' : 'lowest'} ${noun}`;
}

function winningPriceOwed(state: WizardState): string {
  if (state.offer.mechanism === 'CLOCK') return 'the clock price when the last rival drops out';
  const forward = state.basics.direction === 'FORWARD';
  const noun = forward ? 'bid' : 'ask';
  const kth = parseInt(state.award.winnerPriceKth, 10) || 1;
  if (kth === 1) return `their own winning ${noun}`;
  const reserve = state.basics.reserveEnabled ? parseFloat(state.basics.reserveAmount) || 0 : 0;
  return `the ${ordinal(kth)}-${forward ? 'highest' : 'lowest'} ${noun}${
    reserve > 0 ? `, never ${forward ? 'below' : 'above'} the reserve` : ''
  }`;
}
