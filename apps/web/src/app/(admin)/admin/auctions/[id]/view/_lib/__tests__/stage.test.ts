/** @jest-environment node */
import type { AuctionVM } from '@repo/api';
import type { ParticipantView } from '../../../../_components/wizard/invite/invite';
import { peopleCounts, personStatus } from '../people';
import { auctionStage, countdownFor, formatRemaining, progressSteps } from '../stage';

const START = '2026-11-20T10:00:00Z';
const END = '2026-11-20T12:00:00Z';

const auction = (status: string): AuctionVM => ({
  id: 'a1',
  title: 'Truck',
  status,
  schedule: { startTime: START, endTime: END },
});

describe('auctionStage', () => {
  const before = new Date('2026-11-19T10:00:00Z');
  const during = new Date('2026-11-20T11:00:00Z');
  const after = new Date('2026-11-20T13:00:00Z');

  it('follows the status for draft, live, cancelled and finished auctions', () => {
    expect(auctionStage(auction('DRAFT'), during)).toBe('draft');
    expect(auctionStage(auction('LIVE'), before)).toBe('bidding');
    expect(auctionStage(auction('CANCELLED'), before)).toBe('cancelled');
    expect(auctionStage(auction('AWARDED'), before)).toBe('completed');
  });

  it('reads the clock for published auctions, whose status can lag', () => {
    expect(auctionStage(auction('PUBLISHED'), before)).toBe('registration');
    expect(auctionStage(auction('SCHEDULED'), during)).toBe('bidding');
    expect(auctionStage(auction('PUBLISHED'), after)).toBe('closed');
  });
});

describe('formatRemaining', () => {
  it('shows days and hours, hours and minutes, or minutes', () => {
    expect(formatRemaining((3 * 24 + 23) * 3_600_000)).toBe('3 days 23 hrs');
    expect(formatRemaining((22 * 60 + 34) * 60_000)).toBe('22 hrs 34 min');
    expect(formatRemaining(1 * 3_600_000)).toBe('1 hr');
    expect(formatRemaining(12 * 60_000)).toBe('12 min');
    expect(formatRemaining(10_000)).toBe('under a minute');
  });
});

describe('countdownFor', () => {
  const times = { start: new Date(START), end: new Date(END) };

  it('counts to the start during registration and to the end while bidding', () => {
    const now = new Date('2026-11-20T09:00:00Z');
    expect(countdownFor('registration', times, now)?.label).toBe('Bidding opens in');
    expect(countdownFor('bidding', times, now)?.label).toBe('Bidding ends in');
    expect(countdownFor('closed', times, now)).toBeNull();
  });
});

describe('progressSteps', () => {
  it('marks earlier milestones done and the current one as current', () => {
    const steps = progressSteps({
      stage: 'registration',
      times: { start: new Date(START), end: new Date(END) },
      registrationEnds: null,
      hasPreSteps: true,
      hasPostSteps: true,
    });
    expect(steps.map((step) => `${step.key}:${step.state}`)).toEqual([
      'setup:done',
      'published:done',
      'registration:current',
      'bidding:upcoming',
      'result:upcoming',
      'handover:upcoming',
    ]);
  });

  it('marks everything done once the auction is completed', () => {
    const steps = progressSteps({
      stage: 'completed',
      times: { start: null, end: null },
      registrationEnds: null,
      hasPreSteps: false,
      hasPostSteps: false,
    });
    expect(steps.every((step) => step.state === 'done')).toBe(true);
  });
});

describe('personStatus', () => {
  const view = (patch: Partial<ParticipantView>, invitation = 'INVITED'): ParticipantView =>
    ({
      participant: { id: 'p1', invitation: { status: invitation } },
      name: 'Person',
      kind: 'new',
      platformLine: '',
      bucket: 'waiting',
      label: '',
      note: '',
      ready: false,
      done: 0,
      total: 2,
      steps: [],
      invitationLine: '',
      ...patch,
    }) as ParticipantView;

  it('groups people by what is holding them back', () => {
    expect(personStatus(view({ ready: true, bucket: 'approved' }))).toBe('ready');
    expect(personStatus(view({ bucket: 'review' }))).toBe('review');
    expect(personStatus(view({ bucket: 'rejected' }))).toBe('out');
    expect(personStatus(view({}))).toBe('no-reply');
    expect(personStatus(view({}, 'ACCEPTED'))).toBe('in-progress');
    expect(personStatus(view({ done: 1 }))).toBe('in-progress');
  });

  it('counts every group', () => {
    const counts = peopleCounts([view({ ready: true, bucket: 'approved' }), view({}), view({})]);
    expect(counts).toMatchObject({ all: 3, ready: 1, 'no-reply': 2 });
  });
});
