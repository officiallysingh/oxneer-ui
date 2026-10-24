'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, Check, Info, Lock, Users } from 'lucide-react';
import { Button, toast } from '@repo/ui';
import { auctionsApi, type AuctionWorkflowStep } from '@repo/api';
import { parseApiError } from '@/lib/api-errors';
import { DismissibleError } from '../../../_components/AuctionShared';
import { useInviteAuction, type InviteParticipation } from '../../../_components/InviteContext';
import { formatDateTime } from '../shared/summary';
import { isPostStep } from '../shared/workflow';
import { InvitedList } from '../invite/InvitedList';
import { InvitePanel } from '../invite/InvitePanel';
import {
  applyDecision,
  inviteCounts,
  type InviteDecision,
  type ParticipantView,
} from '../invite/invite';
import { useParticipants } from '../invite/useParticipants';

function checkAtFor(startTime: string, participation: InviteParticipation): string {
  if (!startTime) return '';
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() - (parseInt(participation.checkDays, 10) || 0));
  date.setHours(date.getHours() - (parseInt(participation.checkHours, 10) || 0));
  date.setMinutes(date.getMinutes() - (parseInt(participation.checkMinutes, 10) || 0));
  return formatDateTime(date.toISOString());
}

function StateCard({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <div className="mt-1 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
            {children}
          </div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </section>
  );
}

/** Step 7 is reachable from Review before publishing, but invitations only open
 *  once the auction is published. The screen therefore has three states:
 *  not needed (public), locked (draft private) and the invitation workspace. */
export function Step7Invite({
  onChangeAccess,
  onBack,
  onFinish,
  onStatsChange,
}: {
  onChangeAccess: () => void;
  onBack: () => void;
  onFinish: () => void;
  onStatsChange?: (stats: { invited: number; ready: number; review: number }) => void;
}) {
  const { auctionId, isPublic, published, readyToPublish, startTime, participation } =
    useInviteAuction();
  const [workflow, setWorkflow] = useState<AuctionWorkflowStep[]>([]);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, InviteDecision>>({});

  useEffect(() => {
    let active = true;
    auctionsApi
      .getAuctionWorkflow(auctionId)
      .then((steps) => {
        if (active) setWorkflow(steps);
      })
      .catch((err) => {
        if (!active) return;
        setWorkflowError(parseApiError(err).general ?? 'Could not load the participant steps.');
      });
    return () => {
      active = false;
    };
  }, [auctionId]);

  // `useParticipants` needs a stable list; sort once so the detail sheet follows
  // the same order as the review timeline.
  const preSteps = useMemo(
    () =>
      workflow.filter((step) => !isPostStep(step)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [workflow],
  );

  const { views: baseViews, loading, error, refresh } = useParticipants(auctionId, preSteps);

  const views = useMemo(
    () => baseViews.map((view) => applyDecision(view, decisions[view.participant.id])),
    [baseViews, decisions],
  );

  const counts = useMemo(() => inviteCounts(views), [views]);

  const localDecisionIds = useMemo(() => new Set(Object.keys(decisions)), [decisions]);

  const invitedEmails = useMemo(
    () =>
      new Set(
        views
          .filter((view) => view.bucket !== 'cancelled')
          .map((view) => view.email?.toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    [views],
  );

  const minimumEnabled = participation.minimumEnabled;
  const minimumCount = parseInt(participation.minimumCount, 10) || 0;
  const checkAt = checkAtFor(startTime, participation);

  const refreshList = useCallback(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading || !published || isPublic) return;
    onStatsChange?.({
      invited: counts.invited,
      ready: counts.ready,
      review: counts.review,
    });
  }, [counts.invited, counts.ready, counts.review, isPublic, loading, onStatsChange, published]);

  const handleDecision = (
    view: ParticipantView,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string,
  ) => {
    // The participant approve/reject endpoint is not part of @repo/api yet, so
    // the decision is kept in this session until the backend exposes it.
    setDecisions((prev) => ({
      ...prev,
      [view.participant.id]: {
        decision,
        at: new Date().toISOString(),
        ...(reason ? { reason } : {}),
      },
    }));
    toast.success(decision === 'APPROVED' ? `${view.name} approved.` : `${view.name} rejected.`);
  };

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <Button type="button" variant="outline" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back: Review and publish
      </Button>
      {published && !isPublic && (
        <Button type="button" onClick={onFinish} className="gap-2">
          <Check className="h-4 w-4" />
          Finish and view auction
        </Button>
      )}
    </div>
  );

  if (isPublic) {
    return (
      <div className="space-y-4">
        <StateCard
          icon={<Users className="h-4 w-4" aria-hidden />}
          title="Invitations: not needed"
          action={
            !published ? (
              <Button type="button" variant="outline" onClick={onChangeAccess} className="gap-2">
                Change who can join
              </Button>
            ) : undefined
          }
        >
          <p>
            This auction is public, so anyone registered on the platform can join once it’s
            published. There’s nobody to invite.
          </p>
        </StateCard>
        {footer}
      </div>
    );
  }

  if (!published) {
    return (
      <div className="space-y-4">
        <StateCard
          icon={<Lock className="h-4 w-4" aria-hidden />}
          title="Invitations open after you publish"
          action={
            <Button type="button" onClick={onBack} className="gap-2">
              <Check className="h-4 w-4" />
              Go to Review and publish
            </Button>
          }
        >
          <p>
            You invite people once the auction is published. Publishing checks that every policy and
            workflow step is complete, then locks the rules, so everyone you invite joins on the
            same terms.
          </p>
          <p className="flex items-start gap-1.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" aria-hidden />
            {readyToPublish === undefined
              ? 'Publishing opens invitations, so you can invite people straight after.'
              : readyToPublish
                ? 'Everything is ready, so you can publish now.'
                : 'Finish the remaining steps and clear any issues in Review, then publish.'}
          </p>
        </StateCard>
        {footer}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DismissibleError message={workflowError} />

      <InvitePanel auctionId={auctionId} invitedEmails={invitedEmails} onInvited={refreshList} />

      {minimumEnabled && counts.ready < minimumCount && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] leading-snug text-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
          <p>
            Only {counts.invited} invited so far, but at least {minimumCount} must be ready by{' '}
            {checkAt || 'the check time'} for the auction to go live.
          </p>
        </div>
      )}

      <InvitedList
        views={views}
        counts={counts}
        loading={loading}
        error={error}
        minimumEnabled={minimumEnabled}
        minimumCount={minimumCount}
        checkAt={checkAt}
        onRefresh={refreshList}
        onDecision={handleDecision}
        localDecisionIds={localDecisionIds}
      />

      {footer}
    </div>
  );
}
