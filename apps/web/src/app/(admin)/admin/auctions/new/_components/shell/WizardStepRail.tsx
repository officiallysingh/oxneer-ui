'use client';

import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@repo/ui';
import type { InviteStats } from '../shared/types';
import type { ReviewIssue } from '../shared/validation';

export const WIZARD_STEPS = [
  { id: 1, label: 'Basics and unit' },
  { id: 2, label: 'Offer rules' },
  { id: 3, label: 'Schedule and closing' },
  { id: 4, label: 'Participation' },
  { id: 5, label: 'Award' },
  { id: 6, label: 'Review and publish' },
  { id: 7, label: 'Invite participants', afterPublishing: true },
];

type RailStatus =
  | 'editing'
  | 'done'
  | 'todo'
  | 'fix'
  | 'finish'
  | 'locked'
  | 'published'
  | 'review'
  | 'invite'
  | 'invite-empty'
  | 'not-needed';

interface StepState {
  status: RailStatus;
  count?: number;
}

function stepState({
  step,
  current,
  reached,
  isPublic,
  published,
  editMode,
  issueCount,
  finishCount,
  inviteStats,
}: {
  step: number;
  current: number;
  reached: number;
  isPublic: boolean;
  published: boolean;
  editMode?: boolean;
  issueCount: number;
  finishCount: number;
  inviteStats?: InviteStats | null;
}): StepState {
  if (step === 7) {
    if (isPublic) return { status: 'not-needed' };
    if (!published) return { status: 'todo' };
    if (inviteStats) {
      if (inviteStats.review > 0) return { status: 'review', count: inviteStats.review };
      if (inviteStats.invited === 0) return { status: 'invite-empty' };
      return { status: 'invite', count: inviteStats.ready };
    }
    return { status: 'invite' };
  }
  if (published) {
    // Published auctions stay editable through the same rail; only Review keeps
    // its published state. Without this, every earlier step would read "Locked"
    // even though the shell is in edit mode.
    if (!editMode) return { status: step === 6 ? 'published' : 'locked' };
    if (step === 6) return { status: 'published' };
  }
  if (step === 6) {
    if (current === 6) {
      return finishCount > 0 ? { status: 'finish', count: finishCount } : { status: 'editing' };
    }
    if (reached < 6) return { status: 'todo' };
    return finishCount > 0 ? { status: 'finish', count: finishCount } : { status: 'done' };
  }
  if (step === current) {
    return issueCount > 0 ? { status: 'fix', count: issueCount } : { status: 'editing' };
  }
  if (step <= reached) {
    return issueCount > 0 ? { status: 'fix', count: issueCount } : { status: 'done' };
  }
  return { status: 'todo' };
}

function StepStatusText({ state }: { state: StepState }) {
  if (state.status === 'editing')
    return <span className="text-[10px] font-medium text-foreground">Editing now</span>;
  if (state.status === 'done')
    return <span className="text-[10px] font-medium text-success">Done</span>;
  if (state.status === 'locked')
    return <span className="text-[10px] font-medium text-muted-foreground">Locked</span>;
  if (state.status === 'published')
    return <span className="text-[10px] font-medium text-success">Published</span>;
  if (state.status === 'fix')
    return <span className="text-[10px] font-medium text-destructive">{state.count} to fix</span>;
  if (state.status === 'finish')
    return <span className="text-[10px] font-medium text-warning">{state.count} to finish</span>;
  if (state.status === 'review')
    return (
      <span className="text-[10px] font-medium text-warning">{state.count ?? 0} to review</span>
    );
  if (state.status === 'invite-empty')
    return (
      <span className="text-[10px] font-medium text-muted-foreground">Nobody invited yet</span>
    );
  if (state.status === 'invite')
    return (
      <span className="text-[10px] font-medium text-success">
        {state.count ? `${state.count} ready to bid` : 'Invite participants'}
      </span>
    );
  if (state.status === 'not-needed') {
    return (
      <span className="text-[10px] font-medium text-muted-foreground">
        Not needed: public auction
      </span>
    );
  }
  return <span className="text-[10px] font-medium text-muted-foreground">Not started</span>;
}

/** The seven-step rail, including per-step status from the shared issue list. */
export function WizardStepRail({
  current,
  reached,
  issues,
  published,
  isPublic,
  editMode,
  inviteStats,
  onStepClick,
}: {
  current: number;
  reached: number;
  issues: ReviewIssue[];
  published: boolean;
  isPublic: boolean;
  editMode?: boolean;
  inviteStats?: InviteStats | null;
  onStepClick: (step: number) => void;
}) {
  const mustFix = issues.filter((issue) => issue.severity === 'must-fix').length;
  const unopened = [1, 2, 3, 4, 5].filter((step) => step > reached).length;
  const finishCount = mustFix > 0 ? mustFix : unopened;

  const stateFor = (step: number) =>
    stepState({
      step,
      current,
      reached,
      isPublic,
      published,
      editMode,
      issueCount: issues.filter((issue) => issue.step === step && issue.severity === 'must-fix')
        .length,
      finishCount,
      inviteStats,
    });

  const railStep = (step: (typeof WIZARD_STEPS)[number]) => {
    const state = stateFor(step.id);
    const active = step.id === current;
    return (
      <li key={step.id}>
        <button
          type="button"
          onClick={() => onStepClick(step.id)}
          aria-current={active ? 'step' : undefined}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors',
            active ? 'bg-muted/70' : 'hover:bg-muted/40',
          )}
        >
          <span
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums',
              (state.status === 'done' || state.status === 'locked') &&
                'border-success/30 bg-success/10 text-success',
              (state.status === 'editing' || state.status === 'published') &&
                'border-primary/40 bg-primary/10 text-primary',
              state.status === 'fix' && 'border-destructive/30 bg-destructive/10 text-destructive',
              state.status === 'finish' && 'border-warning/40 bg-warning/10 text-warning',
              state.status === 'review' && 'border-warning/40 bg-warning/10 text-warning',
              state.status === 'invite' && 'border-primary/40 bg-primary/10 text-primary',
              state.status === 'todo' && 'border-border bg-background text-muted-foreground',
              state.status === 'invite-empty' &&
                'border-border bg-background text-muted-foreground',
              state.status === 'not-needed' && 'border-border bg-background text-muted-foreground',
            )}
          >
            {state.status === 'done' ||
            state.status === 'locked' ||
            state.status === 'published' ? (
              <Check className="h-3 w-3" aria-hidden />
            ) : state.status === 'fix' || state.status === 'finish' ? (
              <AlertCircle className="h-3 w-3" aria-hidden />
            ) : (
              step.id
            )}
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                'block text-xs leading-tight',
                active ? 'font-semibold text-foreground' : 'font-medium text-foreground/90',
              )}
            >
              {step.label}
            </span>
            <StepStatusText state={state} />
          </span>
        </button>
      </li>
    );
  };

  return (
    <nav
      aria-label="Auction steps"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Simple auction · 7 steps
      </p>
      <ol className="space-y-0.5 px-2 pb-2">
        {WIZARD_STEPS.filter((step) => !step.afterPublishing).map(railStep)}
      </ol>
      <p className="border-t border-border px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        After publishing
      </p>
      <ol className="space-y-0.5 px-2 pb-2">
        {WIZARD_STEPS.filter((step) => step.afterPublishing).map(railStep)}
      </ol>
    </nav>
  );
}
