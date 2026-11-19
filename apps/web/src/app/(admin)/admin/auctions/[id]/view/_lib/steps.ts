import type { TimelinePhase } from '../../../_components/wizard/review/timeline';
import type { ParticipantView } from '../../../_components/wizard/invite/invite';
import type { AuctionStage } from './stage';

/** Who does a step. Policies run on their own. */
export type StepActor = 'you' | 'participants' | 'winner' | 'automatic';

export type StepState = 'done' | 'current' | 'upcoming';

export interface StepProgress {
  done: number;
  total: number;
}

export interface StepRow {
  key: string;
  title: string;
  whenMain: string;
  whenSub: string;
  description: string;
  actor: StepActor;
  state: StepState;
  /** Pre-auction steps only: how many active participants have finished it. */
  progress?: StepProgress;
}

export interface StepSection {
  id: TimelinePhase['id'];
  title: string;
  subtitle: string;
  rows: StepRow[];
}

const SECTION_COPY: Record<TimelinePhase['id'], { title: string; subtitle: string }> = {
  pre: { title: 'Before bidding', subtitle: 'Getting people ready' },
  during: { title: 'Bidding', subtitle: 'The live auction' },
  post: { title: 'After bidding', subtitle: 'Closing the deal' },
};

/** Which phase is happening now, as an index into pre / during / post. */
function activePhase(stage: AuctionStage): number {
  switch (stage) {
    case 'registration':
      return 0;
    case 'bidding':
      return 1;
    case 'closed':
      return 2;
    case 'completed':
      return 3;
    default:
      return -1;
  }
}

function phaseState(phaseIndex: number, stage: AuctionStage): StepState {
  const active = activePhase(stage);
  if (active < 0) return 'upcoming';
  if (phaseIndex < active) return 'done';
  if (phaseIndex === active) return 'current';
  return 'upcoming';
}

function actorFor(phase: TimelinePhase['id'], policy: boolean): StepActor {
  if (policy) return 'automatic';
  if (phase === 'post') return 'winner';
  return 'participants';
}

/** Per pre-auction step: how many still-active people have finished it. */
export function stepProgress(views: ParticipantView[]): Record<string, StepProgress> {
  const active = views.filter((view) => view.bucket !== 'rejected' && view.bucket !== 'cancelled');
  const progress: Record<string, StepProgress> = {};
  active.forEach((view) => {
    view.steps.forEach((step) => {
      const entry = progress[step.id] ?? { done: 0, total: 0 };
      entry.total += 1;
      if (step.state === 'done') entry.done += 1;
      progress[step.id] = entry;
    });
  });
  return progress;
}

/** The wizard's timeline, re-cut for the view page: who does each step and
 *  whether it is done, happening now or still ahead. */
export function stepSections(
  timeline: TimelinePhase[],
  stage: AuctionStage,
  progress: Record<string, StepProgress>,
): StepSection[] {
  return timeline.map((phase, phaseIndex) => {
    const state = phaseState(phaseIndex, stage);
    const rows = phase.groups
      .flatMap((group) => group.items)
      .map(
        (item): StepRow => ({
          key: item.key,
          title: item.name,
          whenMain: item.timeMain,
          whenSub: item.timeSub,
          description: item.desc,
          actor: actorFor(phase.id, item.policy),
          // A policy waits for its moment; only participant steps are "in progress".
          state: state === 'current' && item.policy && phase.id === 'pre' ? 'upcoming' : state,
          progress: phase.id === 'pre' && !item.policy ? progress[item.key] : undefined,
        }),
      );
    return { id: phase.id, ...SECTION_COPY[phase.id], rows };
  });
}

/** The publish step leads the list: it is the admin's own step. */
export function publishedRow(stage: AuctionStage, invited: number): StepRow {
  const published = stage !== 'draft';
  return {
    key: 'published',
    title: published ? 'Auction published' : 'Publish the auction',
    // The status pill already says "Done"; there is no publish date to show.
    whenMain: published ? '' : 'Not yet',
    whenSub: '',
    description: published
      ? `Rules locked${invited ? ` and invitations sent to ${invited === 1 ? '1 person' : `${invited} people`}` : ''}.`
      : 'Finish the setup and publish to lock the rules and send invitations.',
    actor: 'you',
    state: published ? 'done' : 'current',
  };
}

export function countRows(sections: StepSection[]): number {
  return sections.reduce((sum, section) => sum + section.rows.length, 0) + 1;
}
