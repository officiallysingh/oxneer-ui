import type { PillTone } from '@/components/common/admin/Pill';
import { invitationStatus, type ParticipantView } from '../../../_components/wizard/invite/invite';
import { strong, type Phrase } from './phrase';

/** One answer to "can they bid?" per person. */
export type PersonStatus = 'ready' | 'review' | 'in-progress' | 'no-reply' | 'out';

export type PeopleFilter = 'all' | PersonStatus;

export const PERSON_STATUS_META: Record<PersonStatus, { label: string; tone: PillTone }> = {
  ready: { label: 'Ready to bid', tone: 'success' },
  review: { label: 'Needs your review', tone: 'warning' },
  'in-progress': { label: 'Steps not finished', tone: 'warning' },
  'no-reply': { label: 'Hasn’t responded', tone: 'muted' },
  out: { label: 'Not taking part', tone: 'destructive' },
};

const ACCEPTED = new Set(['ACCEPTED', 'JOINED', 'APPROVED']);

export function hasAccepted(view: ParticipantView): boolean {
  return ACCEPTED.has(invitationStatus(view.participant));
}

export function personStatus(view: ParticipantView): PersonStatus {
  if (view.ready) return 'ready';
  if (view.bucket === 'review') return 'review';
  if (view.bucket === 'rejected' || view.bucket === 'cancelled') return 'out';
  if (view.done === 0 && !hasAccepted(view)) return 'no-reply';
  return 'in-progress';
}

export type PeopleCounts = Record<PeopleFilter, number>;

export function peopleCounts(views: ParticipantView[]): PeopleCounts {
  const counts: PeopleCounts = {
    all: views.length,
    ready: 0,
    review: 0,
    'in-progress': 0,
    'no-reply': 0,
    out: 0,
  };
  views.forEach((view) => {
    counts[personStatus(view)] += 1;
  });
  return counts;
}

/** Everyone still in the running: invited people minus those who dropped out. */
export function activeCount(counts: PeopleCounts): number {
  return counts.all - counts.out;
}

export function filterPeople(views: ParticipantView[], filter: PeopleFilter): ParticipantView[] {
  if (filter === 'all') return views;
  return views.filter((view) => personStatus(view) === filter);
}

// ── Readiness funnel ─────────────────────────────────────────────────────────

export interface FunnelStage {
  key: 'invited' | 'accepted' | 'started' | 'ready';
  label: string;
  value: number;
  /** Share of everyone invited, 0–1. */
  share: number;
  note: string;
}

export function readinessFunnel(views: ParticipantView[]): FunnelStage[] {
  const active = views.filter((view) => personStatus(view) !== 'out');
  const total = active.length;
  const accepted = active.filter(hasAccepted).length;
  const started = active.filter((view) => view.done > 0 || view.ready).length;
  const ready = active.filter((view) => view.ready).length;
  const share = (value: number) => (total ? value / total : 0);
  return [
    {
      key: 'invited',
      label: 'Invited',
      value: total,
      share: total ? 1 : 0,
      note: 'Still in the running',
    },
    {
      key: 'accepted',
      label: 'Accepted',
      value: accepted,
      share: share(accepted),
      note: 'Said yes to the invitation',
    },
    {
      key: 'started',
      label: 'Started steps',
      value: started,
      share: share(started),
      note: 'Finished at least one step',
    },
    {
      key: 'ready',
      label: 'Ready to bid',
      value: ready,
      share: share(ready),
      note: 'Every required step done',
    },
  ];
}

// ── "Needs your attention" ───────────────────────────────────────────────────

function people(count: number): string {
  return count === 1 ? '1 person' : `${count} people`;
}

/** Picks the verb form that agrees with the count: "1 person has", "2 people have". */
function agree(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function attentionItems(counts: PeopleCounts): Phrase[] {
  const items: Phrase[] = [];
  const review = counts.review;
  const started = counts['in-progress'];
  const silent = counts['no-reply'];
  if (review) {
    items.push([
      strong(people(review)),
      ` sent their details and ${agree(review, 'is', 'are')} waiting for your review.`,
    ]);
  }
  if (started) {
    items.push([
      strong(people(started)),
      ` started but ${agree(started, 'hasn’t', 'haven’t')} finished every required step.`,
    ]);
  }
  if (silent) {
    items.push([
      strong(people(silent)),
      ` ${agree(silent, 'hasn’t', 'haven’t')} responded to the invitation yet.`,
    ]);
  }
  return items;
}
