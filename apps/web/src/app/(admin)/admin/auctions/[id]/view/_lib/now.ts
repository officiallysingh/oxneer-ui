import type { AuctionWorkflowStep } from '@repo/api';
import type { WizardState } from '../../../_lib/wizard/types';
import { formatDateTime } from '../../../_lib/wizard/summary';
import { offsetMinutes, stepTitle } from '../../../_lib/wizard/workflow';
import { paymentStepData } from '../../../_components/PolicyShared';
import { depositFor, money, words } from './facts';
import { strong, type Phrase } from './phrase';
import type { AuctionStage, AuctionTimes } from './stage';

interface NowInput {
  stage: AuctionStage;
  state: WizardState;
  preSteps: AuctionWorkflowStep[];
  times: AuctionTimes;
  registrationEnds: Date | null;
}

function when(date: Date | null): string {
  return date ? formatDateTime(date.toISOString()) : 'the start';
}

export interface ComingUpEvent {
  key: string;
  at: Date;
  title: string;
  note: string;
}

interface ComingUpInput {
  state: WizardState;
  preSteps: AuctionWorkflowStep[];
  postSteps: AuctionWorkflowStep[];
  times: AuctionTimes;
  registrationEnds: Date | null;
  now: Date;
}

/** The next few dated moments, soonest first. */
export function comingUp({
  state,
  preSteps,
  postSteps,
  times,
  registrationEnds,
  now,
}: ComingUpInput): ComingUpEvent[] {
  const w = words(state);
  const events: ComingUpEvent[] = [];
  if (registrationEnds && preSteps.length) {
    const deposit = depositFor(preSteps);
    events.push({
      key: 'steps-due',
      at: registrationEnds,
      title: deposit ? 'Deposit deadline' : 'Steps due',
      note: `People who haven’t finished can’t ${w.bid}`,
    });
  }
  if (times.start) {
    events.push({
      key: 'start',
      at: times.start,
      title: 'Bidding opens',
      note: 'Ready people can start',
    });
  }
  if (times.end) {
    events.push({
      key: 'end',
      at: times.end,
      title: 'Bidding closes',
      note: 'Planned end, before any extension',
    });
  }
  postSteps.forEach((step) => {
    const minutes = offsetMinutes(paymentStepData(step).offset);
    if (!times.end || !minutes) return;
    events.push({
      key: step.id,
      at: new Date(times.end.getTime() + minutes * 60_000),
      title: `${stepTitle(step)} due`,
      note: 'Winner only',
    });
  });
  return events
    .filter((event) => event.at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 3);
}

/** One short paragraph that tells the admin where things stand. */
export function nowSentence({ stage, state, preSteps, times, registrationEnds }: NowInput): Phrase {
  const w = words(state);
  switch (stage) {
    case 'draft':
      return [
        'This auction is still a ',
        strong('draft'),
        '. Finish the setup and publish it to lock the rules and invite people.',
      ];
    case 'registration': {
      if (preSteps.length === 0) {
        return [
          'The auction is published and the rules are locked. Bidding opens ',
          strong(when(times.start)),
          '.',
        ];
      }
      const deposit = depositFor(preSteps);
      return [
        'The auction is published and the rules are locked. The people you invited are ',
        strong(
          deposit
            ? `registering and paying the ${money(state, deposit.amount)} deposit`
            : 'completing their steps',
        ),
        '. Only those who finish by ',
        strong(when(registrationEnds ?? times.start)),
        ` can ${w.bid}.`,
      ];
    }
    case 'bidding':
      return [strong('Bidding is live.'), ' It is planned to end ', strong(when(times.end)), '.'];
    case 'closed':
      return [strong('Bidding has closed.'), ' The winner is decided by the rules below.'];
    case 'completed':
      return ['This auction is ', strong('finished'), '.'];
    case 'cancelled':
      return ['This auction was ', strong('cancelled'), `. Nobody can ${w.bid} on it.`];
  }
}
