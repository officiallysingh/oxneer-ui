'use client';

import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@repo/ui';
import { useAuctionWizard, type AuctionWizardContextValue } from '../../../_context';
import { WIZARD_STEPS, isSetupStep, type WizardStepMeta } from '../../../_lib/wizard/steps';

type RailTone = 'todo' | 'done' | 'fix' | 'review' | 'muted';

interface RailState {
  tone: RailTone;
  text: string;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function railState(id: number, wizard: AuctionWizardContextValue): RailState {
  const { published, visited, reviewFlags, issues, progress, isPrivate, inviteStats } = wizard;

  if (isSetupStep(id)) {
    if (published) return { tone: 'done', text: 'Locked' };
    const toFix = issues.filter((issue) => issue.step === id && issue.severity === 'must-fix');
    if (visited.has(id) && toFix.length) return { tone: 'fix', text: `${toFix.length} to fix` };
    if (reviewFlags[id as keyof typeof reviewFlags])
      return { tone: 'review', text: 'Needs review' };
    if (visited.has(id)) return { tone: 'done', text: 'Done' };
    return { tone: 'todo', text: 'Not started' };
  }

  if (id === 6) {
    if (published) return { tone: 'done', text: 'Published' };
    if (!visited.has(6)) return { tone: 'todo', text: 'Not started' };
    const blockers = progress.mustFix.length + progress.unopened.length + progress.toReview.length;
    return blockers
      ? { tone: 'fix', text: `${blockers} to finish` }
      : { tone: 'done', text: 'Ready to publish' };
  }

  if (!isPrivate) return { tone: 'muted', text: 'Not needed: public auction' };
  if (!published) return { tone: 'muted', text: 'Opens after you publish' };
  if (inviteStats?.review) return { tone: 'review', text: `${inviteStats.review} to review` };
  if (!inviteStats?.invited) return { tone: 'todo', text: 'Nobody invited yet' };
  return { tone: 'done', text: `${plural(inviteStats.invited, 'person', 'people')} invited` };
}

const TEXT_TONE: Record<RailTone, string> = {
  todo: 'text-muted-foreground',
  muted: 'text-muted-foreground',
  done: 'text-success',
  fix: 'text-destructive',
  review: 'text-warning',
};

const CIRCLE_TONE: Record<RailTone, string> = {
  todo: 'border-border bg-background text-muted-foreground',
  muted: 'border-border bg-background text-muted-foreground',
  done: 'border-success/30 bg-success/10 text-success',
  fix: 'border-destructive/30 bg-destructive/10 text-destructive',
  review: 'border-warning/40 bg-warning/15 text-warning',
};

function RailItem({ meta }: { meta: WizardStepMeta }) {
  const wizard = useAuctionWizard();
  const { tone, text } = railState(meta.id, wizard);
  const current = meta.id === wizard.step;
  const alert = tone === 'fix' || tone === 'review';
  const editing = current && !alert && !wizard.published && tone !== 'muted';

  return (
    <li>
      <button
        type="button"
        onClick={() => wizard.goToStep(meta.id)}
        aria-current={current ? 'step' : undefined}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          current ? 'bg-muted/70' : 'hover:bg-muted/40',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums',
            current ? 'border-primary/40 bg-primary/10 text-primary' : CIRCLE_TONE[tone],
          )}
        >
          {!current && tone === 'done' ? (
            <Check className="h-3 w-3" />
          ) : !current && alert ? (
            <AlertCircle className="h-3 w-3" />
          ) : (
            meta.id
          )}
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              'block text-xs leading-tight text-foreground',
              current ? 'font-semibold' : 'font-medium',
            )}
          >
            {meta.label}
          </span>
          <span
            className={cn('text-[10px] font-medium', editing ? 'text-foreground' : TEXT_TONE[tone])}
          >
            {editing ? 'Editing now' : text}
          </span>
        </span>
      </button>
    </li>
  );
}

/** The seven-step rail. Step 7 sits under "After publishing". */
export function WizardStepRail() {
  const setup = WIZARD_STEPS.filter((meta) => !meta.afterPublishing);
  const after = WIZARD_STEPS.filter((meta) => meta.afterPublishing);

  return (
    <nav
      aria-label="Auction steps"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Simple auction · 7 steps
      </p>
      <ol className="space-y-0.5 px-2 pb-2">
        {setup.map((meta) => (
          <RailItem key={meta.id} meta={meta} />
        ))}
      </ol>
      <p className="border-t border-border px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        After publishing
      </p>
      <ol className="space-y-0.5 px-2 pb-2">
        {after.map((meta) => (
          <RailItem key={meta.id} meta={meta} />
        ))}
      </ol>
    </nav>
  );
}
