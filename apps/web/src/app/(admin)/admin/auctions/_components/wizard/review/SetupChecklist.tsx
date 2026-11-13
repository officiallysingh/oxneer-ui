'use client';

import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@repo/ui';
import type { AuctionSetupSummary, SetupFinding, SetupStepSummary } from '@repo/api';
import { SETUP_STEP_KEY } from '../../../_hooks/useSetupSummary';
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

const SETUP_STEPS = [1, 2, 3, 4, 5] as const;
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Findings({ findings, tone }: { findings: SetupFinding[]; tone: 'missing' | 'check' }) {
  const Icon = tone === 'missing' ? AlertCircle : AlertTriangle;
  return (
    <>
      {findings.map((finding) => (
        <p
          key={finding.code}
          className={
            tone === 'missing'
              ? 'flex items-start gap-1.5 text-[11px] leading-snug text-destructive'
              : 'flex items-start gap-1.5 text-[11px] leading-snug text-warning'
          }
        >
          <Icon className="mt-px h-3 w-3 shrink-0" aria-hidden />
          <span>
            <span className="sr-only">{tone === 'missing' ? 'Missing: ' : 'Check: '}</span>
            {finding.message}
          </span>
        </p>
      ))}
    </>
  );
}

/** The five setup steps and whether each one blocks publishing. Each row shows
 *  the server's summary of that step (`GET /{id}/setup-summary`): what is set
 *  up, what is missing and what to check. Problems in the form that aren't
 *  saved yet come first, since the server can't know about them. */
export function SetupChecklist({
  server,
  serverLoading,
  fallbackRows,
  issues,
  visited,
  reviewFlags,
  published,
  ready,
  onEdit,
}: {
  server: AuctionSetupSummary | null;
  serverLoading: boolean;
  /** Summaries worked out from the form, used until the server's summary loads. */
  fallbackRows: Array<{ step: number; summary: string }>;
  issues: ReviewIssue[];
  visited: ReadonlySet<number>;
  reviewFlags: ReviewFlags;
  published: boolean;
  ready: boolean;
  onEdit: (step: number) => void;
}) {
  const serverStep = (step: number): SetupStepSummary | undefined =>
    server?.steps[SETUP_STEP_KEY[step]!];

  const statusOf = (step: number): { status: RowStatus; label: string } => {
    if (published) return { status: 'locked', label: 'Locked' };
    const toFix = issues.filter((issue) => issue.step === step && issue.severity === 'must-fix');
    if (toFix.length && visited.has(step)) {
      return { status: 'fix', label: `${count(toFix.length, 'issue')} to fix` };
    }
    const summary = serverStep(step);
    if (summary) {
      const missing = summary.missing?.length ?? 0;
      const warnings = summary.warnings?.length ?? 0;
      if (!summary.complete) {
        return { status: 'fix', label: missing ? `${missing} missing` : 'Incomplete' };
      }
      if (reviewFlags[step as WizardStepId]) return { status: 'check', label: 'Needs review' };
      if (warnings) return { status: 'check', label: `${warnings} to check` };
      return { status: 'ok', label: 'Complete' };
    }
    // No server summary yet: fall back to what the form knows.
    if (!visited.has(step)) return { status: 'todo', label: 'Not opened yet' };
    if (reviewFlags[step as WizardStepId]) return { status: 'check', label: 'Needs review' };
    return { status: 'ok', label: 'Complete' };
  };

  const rows = SETUP_STEPS.map((step) => {
    const summary = serverStep(step);
    const points = (summary?.points ?? []).map((point) => point.text).filter(Boolean);
    return {
      step,
      ...statusOf(step),
      text:
        points.join(' · ') ||
        fallbackRows.find((row) => row.step === step)?.summary ||
        'Nothing set up yet.',
      missing: published ? [] : (summary?.missing ?? []),
      warnings: published ? [] : (summary?.warnings ?? []),
    };
  });
  const completed = rows.filter((row) => row.status === 'ok' || row.status === 'check').length;
  const allDone = ready && (server ? server.publishable : true);

  return (
    <section className="overflow-hidden rounded-none border border-border bg-card">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border bg-muted/20 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">Setup checklist</h3>
        <p className="text-[11px] text-muted-foreground">
          {published
            ? 'Locked when you published.'
            : allDone
              ? 'All five steps are complete.'
              : `${completed} of 5 steps complete. Publishing needs all five, including every policy and workflow step.`}
        </p>
        {serverLoading && (
          <Loader2
            className="ml-auto h-3.5 w-3.5 animate-spin self-center text-muted-foreground"
            aria-label="Loading the setup summary"
          />
        )}
      </header>
      <div className="divide-y divide-border/60">
        {rows.map((row) => (
          <div key={row.step} className="flex flex-wrap items-start gap-3 px-4 py-2.5">
            <div className="w-28 shrink-0 pt-0.5">
              <StatusPill tone={ROW[row.status].tone}>{row.label}</StatusPill>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-semibold text-foreground">{STEP_LABELS[row.step]}</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{row.text}</p>
              <Findings findings={row.missing} tone="missing" />
              <Findings findings={row.warnings} tone="check" />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs"
              aria-label={`${ROW[row.status].action} ${STEP_LABELS[row.step]}`}
              onClick={() => onEdit(row.step)}
            >
              {ROW[row.status].action}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
