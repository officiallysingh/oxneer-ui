'use client';

import { Button } from '@repo/ui';
import type { ReviewFlags, WizardStepId } from '../../../_lib/wizard/steps';
import type { ReviewIssue } from '../../../_lib/wizard/validation';
import { STEP_LABELS } from '../../../_lib/wizard/validation';
import { StatusPill } from './StatusPill';

type RowStatus = 'locked' | 'todo' | 'fix' | 'check' | 'ok';

const ROW: Record<
  RowStatus,
  { tone: 'muted' | 'destructive' | 'warning' | 'success'; action: string }
> = {
  locked: { tone: 'muted', action: 'View' },
  todo: { tone: 'muted', action: 'Open' },
  fix: { tone: 'destructive', action: 'Fix' },
  check: { tone: 'warning', action: 'Review' },
  ok: { tone: 'success', action: 'View' },
};

/** The five setup steps and whether each one blocks publishing. */
export function SetupChecklist({
  rows,
  issues,
  visited,
  reviewFlags,
  published,
  ready,
  onEdit,
}: {
  rows: Array<{ step: number; summary: string }>;
  issues: ReviewIssue[];
  visited: ReadonlySet<number>;
  reviewFlags: ReviewFlags;
  published: boolean;
  ready: boolean;
  onEdit: (step: number) => void;
}) {
  const statusOf = (step: number): { status: RowStatus; label: string } => {
    const toFix = issues.filter((issue) => issue.step === step && issue.severity === 'must-fix');
    if (published) return { status: 'locked', label: 'Locked' };
    if (!visited.has(step)) return { status: 'todo', label: 'Not opened yet' };
    if (toFix.length) {
      return {
        status: 'fix',
        label: `${toFix.length} issue${toFix.length === 1 ? '' : 's'} to fix`,
      };
    }
    if (reviewFlags[step as WizardStepId]) return { status: 'check', label: 'Needs review' };
    return { status: 'ok', label: 'Complete' };
  };
  const statuses = rows.map((row) => statusOf(row.step));
  const completed = statuses.filter((row) => row.status === 'ok').length;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border bg-muted/20 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">Setup checklist</h3>
        <p className="text-[11px] text-muted-foreground">
          {published
            ? 'Locked when you published.'
            : ready
              ? 'All five steps are complete.'
              : `${completed} of 5 steps complete. Publishing needs all five, including every policy and workflow step.`}
        </p>
      </header>
      <div className="divide-y divide-border/60">
        {rows.map((row, index) => {
          const { status, label } = statuses[index]!;
          return (
            <div key={row.step} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <div className="w-28 shrink-0">
                <StatusPill tone={ROW[status].tone}>{label}</StatusPill>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">{STEP_LABELS[row.step]}</p>
                <p className="truncate text-[11px] text-muted-foreground" title={row.summary}>
                  {row.summary}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                aria-label={`${ROW[status].action} ${STEP_LABELS[row.step]}`}
                onClick={() => onEdit(row.step)}
              >
                {ROW[status].action}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
