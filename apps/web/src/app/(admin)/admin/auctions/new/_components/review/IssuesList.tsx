'use client';

import { Button } from '@repo/ui';
import type { ReviewIssue } from '../shared/validation';
import { STEP_LABELS } from '../shared/validation';
import { StatusPill } from './StatusPill';

/** Must-fix and check issues, each linked back to the step that owns it. */
export function IssuesList({
  issues,
  published,
  onEdit,
}: {
  issues: ReviewIssue[];
  published: boolean;
  onEdit: (step: number) => void;
}) {
  if (issues.length === 0 || published) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">Issues</h3>
      </header>
      <div className="divide-y divide-border/60">
        {issues.map((issue) => (
          <div key={issue.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <div className="w-16 shrink-0">
              <StatusPill tone={issue.severity === 'must-fix' ? 'destructive' : 'warning'}>
                {issue.severity === 'must-fix' ? 'Must fix' : 'Check'}
              </StatusPill>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] leading-snug text-foreground">{issue.message}</p>
              <p className="text-[10px] text-muted-foreground">{issue.scope}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px]"
              onClick={() => onEdit(issue.goto)}
            >
              Go to {STEP_LABELS[issue.goto] ?? 'step'}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
