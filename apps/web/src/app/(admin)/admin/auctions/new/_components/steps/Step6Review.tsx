'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CircleAlert, Loader2, Rocket } from 'lucide-react';
import { Button } from '@repo/ui';
import { auctionsApi, type AuctionWorkflowStep } from '@repo/api';
import { parseApiError } from '@/lib/api-errors';
import type { WizardState } from '../shared/types';
import type { ReviewIssue } from '../shared/validation';
import { formatDateTime, formatMoney } from '../shared/summary';
import { isPostStep } from '../shared/workflow';
import { ReviewBanner } from '../review/ReviewBanner';
import { SetupChecklist } from '../review/SetupChecklist';
import { IssuesList } from '../review/IssuesList';
import { RulesTimeline } from '../review/RulesTimeline';
import { RulesAsText } from '../review/RulesAsText';
import { buildRules } from '../review/rules';

const MECHANISM: Record<string, string> = {
  OPEN: 'Open',
  CLOCK: 'Clock',
  SEALED: 'Sealed',
};

export function Step6Review({
  auctionId,
  state,
  workflowCount,
  postWorkflowCount,
  issues,
  reached,
  publishing,
  published,
  publishedAt,
  error,
  onEdit,
  onBack,
  onPublish,
  onInvite,
}: {
  auctionId: string;
  state: WizardState;
  workflowCount: number;
  postWorkflowCount: number;
  issues: ReviewIssue[];
  reached: number;
  publishing: boolean;
  published: boolean;
  publishedAt: string | null;
  error: string | null;
  onEdit: (step: number) => void;
  onBack: () => void;
  onPublish: () => void;
  onInvite: () => void;
}) {
  const [steps, setSteps] = useState<AuctionWorkflowStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(true);
  const [stepsError, setStepsError] = useState<string | null>(null);

  const loadSteps = useCallback(async () => {
    setLoadingSteps(true);
    setStepsError(null);
    try {
      const data = await auctionsApi.getAuctionWorkflow(auctionId);
      setSteps([...data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch (err) {
      setStepsError(parseApiError(err).general ?? 'Could not load the workflow.');
    } finally {
      setLoadingSteps(false);
    }
  }, [auctionId]);

  useEffect(() => {
    void loadSteps();
  }, [loadSteps]);

  const { basics, offer, schedule, participation } = state;
  const start = schedule.startTime;
  const isPrivate = basics.accessibility === 'PRIVATE';

  const mustFix = issues.filter((issue) => issue.severity === 'must-fix');
  const checks = issues.filter((issue) => issue.severity === 'check');
  const unopened = [1, 2, 3, 4, 5].filter((step) => step > reached);
  const completed = [1, 2, 3, 4, 5].filter(
    (step) => step <= reached && !issues.some((issue) => issue.step === step),
  ).length;
  const ready = published || (mustFix.length === 0 && unopened.length === 0);

  const preSteps = useMemo(() => steps.filter((step) => !isPostStep(step)), [steps]);
  const postSteps = useMemo(() => steps.filter(isPostStep), [steps]);

  const progressionText =
    offer.mechanism === 'SEALED'
      ? 'no price progression'
      : `${offer.windows.length} window${offer.windows.length === 1 ? '' : 's'}`;

  const checklist = [
    {
      step: 1,
      summary: `SIMPLE · ${basics.direction === 'FORWARD' ? 'Forward' : 'Reverse'} · ${
        isPrivate ? 'Private' : 'Public'
      } · ${basics.unitType === 'SINGLE_UNIT' ? 'Single Unit' : 'Bundle'} · ${
        basics.direction === 'FORWARD' ? 'opening' : 'starting'
      } price ${formatMoney(basics.openingPrice, basics.currencyUnit)}`,
    },
    {
      step: 2,
      summary: `${MECHANISM[offer.mechanism]} · ${
        offer.mechanism === 'SEALED'
          ? 'no price progression'
          : `Price progression policy, ${progressionText}`
      }`,
    },
    {
      step: 3,
      summary: `Starts ${formatDateTime(start)} · ${
        schedule.softCloseEnabled ? 'Soft close policy' : 'no soft close'
      }`,
    },
    {
      step: 4,
      summary: `${workflowCount} workflow step${workflowCount === 1 ? '' : 's'} before the auction · ${
        participation.minimumEnabled ? 'Minimum participants policy' : 'no minimum'
      }`,
    },
    {
      step: 5,
      summary: `Who wins, Ties and Winning price policies · ${postWorkflowCount} workflow step${
        postWorkflowCount === 1 ? '' : 's'
      } after the auction`,
    },
  ];

  const rules = useMemo(() => buildRules(state, preSteps, postSteps), [state, preSteps, postSteps]);

  return (
    <div className="space-y-4">
      <ReviewBanner
        published={published}
        publishedAt={publishedAt}
        mustFix={mustFix}
        checks={checks}
        unopened={unopened}
        onInvite={onInvite}
      />

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      <SetupChecklist
        rows={checklist}
        issues={issues}
        reached={reached}
        published={published}
        ready={ready}
        completed={completed}
        onEdit={onEdit}
      />

      <IssuesList issues={issues} published={published} onEdit={onEdit} />

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <RulesTimeline
          state={state}
          preSteps={preSteps}
          postSteps={postSteps}
          loadingSteps={loadingSteps}
          stepsError={stepsError}
          workflowCount={workflowCount}
          postWorkflowCount={postWorkflowCount}
          published={published}
        />
        <RulesAsText sections={rules} state={state} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={publishing}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back: Award
        </Button>
        <div className="flex flex-col items-end gap-1">
          {!published && !ready && (
            <span className="text-[10px] text-muted-foreground">
              {mustFix.length > 0
                ? `Finish the checklist to publish.`
                : `Open the remaining steps to publish.`}
            </span>
          )}
          <Button
            type="button"
            onClick={onPublish}
            disabled={publishing || published || !ready}
            className="gap-2"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : published ? (
              <Check className="h-4 w-4" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {published ? 'Published' : publishing ? 'Publishing…' : 'Publish auction'}
          </Button>
        </div>
      </div>

      {mustFix.length > 0 && !published && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-foreground">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
          <p>
            Publishing locks the rules as version 1.{' '}
            {mustFix.length === 1 ? 'One issue needs' : `${mustFix.length} issues need`} fixing
            first.
          </p>
        </div>
      )}
    </div>
  );
}
