'use client';

import { Button } from '@repo/ui';
import type { ReviewIssue } from '../shared/validation';
import { STEP_LABELS } from '../shared/validation';
import { StatusPill } from './StatusPill';

/** The five setup steps and whether each one blocks publishing. */
export function SetupChecklist({
  rows,
  issues,
  reached,
  published,
  ready,
  completed,
  onEdit,
}: {
  rows: Array<{ step: number; summary: string }>;
  issues: ReviewIssue[];
  reached: number;
  published: boolean;
  ready: boolean;
  completed: number;
  onEdit: (step: number) => void;
}) {
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
        {rows.map((row) => {
          const rowIssues = issues.filter((issue) => issue.step === row.step);
          const locked = published;
          const notOpened = !published && row.step > reached;
          const tone = locked
            ? 'muted'
            : notOpened
              ? 'muted'
              : rowIssues.length
                ? 'destructive'
                : 'success';
          const label = locked
            ? 'Locked'
            : notOpened
              ? 'Not opened yet'
              : rowIssues.length
                ? `${rowIssues.length} issue${rowIssues.length === 1 ? '' : 's'} to fix`
                : 'Complete';
          return (
            <div key={row.step} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <div className="w-24 shrink-0">
                <StatusPill tone={tone}>{label}</StatusPill>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">{STEP_LABELS[row.step]}</p>
                <p className="truncate text-[11px] text-muted-foreground">{row.summary}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => onEdit(row.step)}
              >
                {locked || (!notOpened && !rowIssues.length) ? 'View' : notOpened ? 'Open' : 'Fix'}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
