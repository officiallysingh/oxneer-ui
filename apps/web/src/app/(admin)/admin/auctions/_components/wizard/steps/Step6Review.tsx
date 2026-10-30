'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2, Rocket } from 'lucide-react';
import { Button } from '@repo/ui';
import { auctionsApi, type AuctionWorkflowStep } from '@repo/api';
import { parseApiError } from '@/lib/api-errors';
import { useAuctionWizard } from '../../../_context';
import type { WizardState } from '../../../_lib/wizard/types';
import { formatDateTime, formatMoney } from '../../../_lib/wizard/summary';
import { isPostStep } from '../../../_lib/wizard/workflow';
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

function checklistRows(state: WizardState, workflowCount: number, postWorkflowCount: number) {
  const { basics, offer, schedule, participation } = state;
  const forward = basics.direction === 'FORWARD';
  const windowList = offer.mechanism === 'CLOCK' ? offer.clockWindows : offer.windows;
  const windows = `${windowList.length} window${windowList.length === 1 ? '' : 's'}`;
  return [
    {
      step: 1,
      summary: `SIMPLE · ${forward ? 'Forward' : 'Reverse'} · ${
        basics.accessibility === 'PRIVATE' ? 'Private' : 'Public'
      } · ${basics.unitType === 'SINGLE_UNIT' ? 'Single Unit' : 'Bundle'} · ${
        forward ? 'opening' : 'starting'
      } price ${formatMoney(basics.openingPrice, basics.currencyUnit)}`,
    },
    {
      step: 2,
      summary: `${MECHANISM[offer.mechanism]} · ${
        offer.mechanism === 'SEALED'
          ? 'no price progression'
          : `Price progression policy, ${windows}`
      }`,
    },
    {
      step: 3,
      summary: `Starts ${formatDateTime(schedule.startTime)} · ${
        offer.mechanism === 'OPEN' && schedule.softCloseEnabled
          ? 'Soft close policy'
          : 'no soft close'
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
}

/** Workflow steps for the timeline. Steps are edited in 4 and 5, so this
 *  reloads whenever the review screen opens. */
function useWorkflowSteps(auctionId: string | null) {
  const [steps, setSteps] = useState<AuctionWorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auctionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await auctionsApi.getAuctionWorkflow(auctionId);
      setSteps([...data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch (err) {
      setError(parseApiError(err).summary);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pre = useMemo(() => steps.filter((step) => !isPostStep(step)), [steps]);
  const post = useMemo(() => steps.filter(isPostStep), [steps]);
  return { pre, post, loading, error };
}

export function Step6Review() {
  const {
    auctionId,
    state,
    workflowCount,
    postWorkflowCount,
    issues,
    progress,
    visited,
    reviewFlags,
    published,
    publishedAt,
    isPrivate,
    busy,
    errors,
    goToStep,
    publish,
  } = useAuctionWizard();
  const workflow = useWorkflowSteps(auctionId);
  const publishing = busy === 'publish';
  // `issues` already includes problems in the saved steps (see the controller).
  const allIssues = issues;
  const ready = progress.ready;

  const rules = useMemo(
    () => buildRules(state, workflow.pre, workflow.post),
    [state, workflow.pre, workflow.post],
  );

  return (
    <div className="space-y-4">
      <ReviewBanner
        published={published}
        publishedAt={publishedAt}
        isPrivate={isPrivate}
        progress={progress}
        onInvite={() => goToStep(7)}
      />

      {errors.general && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {errors.general}
        </p>
      )}

      <SetupChecklist
        rows={checklistRows(state, workflowCount, postWorkflowCount)}
        issues={allIssues}
        visited={visited}
        reviewFlags={reviewFlags}
        published={published}
        ready={ready}
        onEdit={goToStep}
      />

      <IssuesList issues={allIssues} published={published} onEdit={goToStep} />

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <RulesTimeline
          state={state}
          preSteps={workflow.pre}
          postSteps={workflow.post}
          loadingSteps={workflow.loading}
          stepsError={workflow.error}
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
          onClick={() => goToStep(5)}
          disabled={publishing}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back: Award
        </Button>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] text-muted-foreground">
            {published
              ? 'The rules are locked.'
              : ready
                ? `Publishing locks the rules as version 1${isPrivate ? '. Then you invite people.' : '.'}`
                : 'Finish the checklist to publish.'}
          </span>
          <Button
            type="button"
            onClick={() => void publish()}
            disabled={publishing || published || !ready}
            className="gap-2"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : published ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Rocket className="h-4 w-4" aria-hidden />
            )}
            {published ? 'Published' : publishing ? 'Publishing…' : 'Publish auction'}
          </Button>
        </div>
      </div>
    </div>
  );
}
