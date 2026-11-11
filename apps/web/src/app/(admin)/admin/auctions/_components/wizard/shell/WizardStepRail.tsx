'use client';

import { useState } from 'react';
import { AlertCircle, AlertTriangle, Check, ChevronDown } from 'lucide-react';
import type { SetupStepSummary } from '@repo/api';
import { cn } from '@repo/ui';
import { useAuctionWizard, type AuctionWizardContextValue } from '../../../_context';
import { SETUP_STEP_KEY } from '../../../_hooks/useSetupSummary';
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

/** The server's summary of one setup step: its lines, then what's missing and
 *  what to check. */
function StepSummaryPanel({ id, summary }: { id: string; summary: SetupStepSummary }) {
  const points = summary.points ?? [];
  const missing = summary.missing ?? [];
  const warnings = summary.warnings ?? [];
  return (
    <div id={id} className="ml-[30px] mr-1 mb-1.5 space-y-1.5 border-l border-border pl-2.5 pt-0.5">
      {points.length > 0 ? (
        <ul className="space-y-1">
          {points.map((point, index) => (
            <li
              key={`${point.id ?? point.type ?? 'point'}-${index}`}
              className="text-[11px] leading-snug text-muted-foreground"
            >
              {point.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground">Nothing set up yet.</p>
      )}
      {missing.map((finding) => (
        <p
          key={finding.code}
          className="flex items-start gap-1.5 text-[11px] leading-snug text-destructive"
        >
          <AlertCircle className="mt-px h-3 w-3 shrink-0" aria-hidden />
          <span>
            <span className="sr-only">Missing: </span>
            {finding.message}
          </span>
        </p>
      ))}
      {warnings.map((finding) => (
        <p
          key={finding.code}
          className="flex items-start gap-1.5 text-[11px] leading-snug text-warning"
        >
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />
          <span>
            <span className="sr-only">Check: </span>
            {finding.message}
          </span>
        </p>
      ))}
    </div>
  );
}

function RailItem({
  meta,
  expanded,
  onToggle,
}: {
  meta: WizardStepMeta;
  expanded: boolean;
  onToggle: () => void;
}) {
  const wizard = useAuctionWizard();
  const { tone, text } = railState(meta.id, wizard);
  const current = meta.id === wizard.step;
  const alert = tone === 'fix' || tone === 'review';
  const editing = current && !alert && !wizard.published && tone !== 'muted';
  const stepKey = SETUP_STEP_KEY[meta.id];
  const summary = stepKey ? wizard.setupSummary.summary?.steps[stepKey] : undefined;
  const panelId = `rail-summary-${meta.id}`;

  return (
    <li>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => wizard.goToStep(meta.id)}
          aria-current={current ? 'step' : undefined}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors',
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
              className={cn(
                'text-[10px] font-medium',
                editing ? 'text-foreground' : TEXT_TONE[tone],
              )}
            >
              {editing ? 'Editing now' : text}
            </span>
          </span>
        </button>
        {summary && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={`${expanded ? 'Hide' : 'Show'} summary of ${meta.label}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
              aria-hidden
            />
          </button>
        )}
      </div>
      {summary && expanded && <StepSummaryPanel id={panelId} summary={summary} />}
    </li>
  );
}

/** The seven-step rail. Step 7 sits under "After publishing". Each setup step
 *  the server has a summary for can be expanded to show it. */
export function WizardStepRail() {
  const setup = WIZARD_STEPS.filter((meta) => !meta.afterPublishing);
  const after = WIZARD_STEPS.filter((meta) => meta.afterPublishing);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());
  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const item = (meta: WizardStepMeta) => (
    <RailItem
      key={meta.id}
      meta={meta}
      expanded={expanded.has(meta.id)}
      onToggle={() => toggle(meta.id)}
    />
  );

  return (
    <nav
      aria-label="Auction steps"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Simple auction · 7 steps
      </p>
      <ol className="space-y-0.5 px-2 pb-2">{setup.map(item)}</ol>
      <p className="border-t border-border px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        After publishing
      </p>
      <ol className="space-y-0.5 px-2 pb-2">{after.map(item)}</ol>
    </nav>
  );
}
