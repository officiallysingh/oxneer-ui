'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, RefreshCw, Send, Users } from 'lucide-react';
import type { AuctionWorkflowStep } from '@repo/api';
import { Button, Card, Skeleton } from '@repo/ui';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { SegmentedControl, type SegmentOption } from '@/components/common/admin/SegmentedControl';
import type { ParticipantView } from '../../../../_components/wizard/invite/invite';
import { stepTitle } from '../../../../_lib/wizard/workflow';
import {
  PERSON_STATUS_META,
  filterPeople,
  type FunnelStage,
  type PeopleCounts,
  type PeopleFilter,
} from '../../_lib/people';
import { PeopleList } from './PeopleList';

interface PeopleTabProps {
  auctionId: string;
  isPrivate: boolean;
  showAlias: boolean;
  /** Steps are only due before bidding; after that, people can't be chased. */
  canChase: boolean;
  deadlineText: string | null;
  preSteps: AuctionWorkflowStep[];
  views: ParticipantView[];
  counts: PeopleCounts;
  funnel: FunnelStage[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  resendingIds: Set<string>;
  onResend: (views: ParticipantView[]) => void;
}

const FILTER_ORDER: PeopleFilter[] = ['all', 'ready', 'review', 'in-progress', 'no-reply', 'out'];

function filterOptions(counts: PeopleCounts): SegmentOption<PeopleFilter>[] {
  return FILTER_ORDER.filter((filter) => filter === 'all' || counts[filter] > 0).map((filter) => ({
    value: filter,
    label: `${filter === 'all' ? 'All' : PERSON_STATUS_META[filter].label} ${counts[filter]}`,
  }));
}

function ReadinessStrip({ funnel }: { funnel: FunnelStage[] }) {
  return (
    <Card
      aria-label="Readiness"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-none bg-border shadow-none lg:grid-cols-4"
    >
      {funnel.map((stage) => (
        <div key={stage.key} className="flex flex-col gap-1.5 bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {stage.label}
          </p>
          <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
            {stage.value}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span
              className="block h-full bg-primary"
              style={{ width: `${Math.round(stage.share * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{stage.note}</p>
        </div>
      ))}
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading participants">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function PeopleTab(props: PeopleTabProps) {
  const { auctionId, isPrivate, canChase, deadlineText, preSteps, views, counts, loading, error } =
    props;
  const [filter, setFilter] = useState<PeopleFilter>('all');
  const activeFilter = filter !== 'all' && counts[filter] === 0 ? 'all' : filter;
  const shown = filterPeople(views, activeFilter);
  const noReply = filterPeople(views, 'no-reply');
  const resendingAll = noReply.some((view) => props.resendingIds.has(view.participant.id));
  const stepTitles = preSteps.map((step) => ({ id: step.id, title: stepTitle(step) }));
  const inviteHref = `/admin/auctions/${auctionId}/edit?step=7`;

  return (
    <div className="space-y-4">
      {!loading && !error && views.length > 0 && <ReadinessStrip funnel={props.funnel} />}

      <Card aria-labelledby="people-heading" className="rounded-none shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="space-y-1">
            <h2 id="people-heading" className="text-base font-semibold text-foreground">
              People in this auction
            </h2>
            {deadlineText && (
              <p className="text-sm text-muted-foreground">
                A person can bid only when every required step is done by{' '}
                <strong className="font-semibold text-foreground">{deadlineText}</strong>.
              </p>
            )}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {canChase && noReply.length > 0 && (
              <Button
                variant="outline"
                onClick={() => props.onResend(noReply)}
                disabled={resendingAll}
              >
                {resendingAll ? <Loader2 className="animate-spin" /> : <Send />}
                Resend invitations ({noReply.length})
              </Button>
            )}
            {isPrivate && (
              <Button asChild>
                <Link href={inviteHref}>
                  <Plus />
                  Invite people
                </Link>
              </Button>
            )}
          </div>
        </div>

        {error ? (
          <div className="space-y-3 px-4 pb-4">
            <ErrorAlert message={error} />
            <Button variant="outline" size="sm" onClick={props.onRetry}>
              <RefreshCw />
              Try again
            </Button>
          </div>
        ) : loading ? (
          <ListSkeleton />
        ) : views.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 pb-10 pt-6 text-center">
            <Users className="h-10 w-10 text-muted-foreground opacity-30" aria-hidden />
            <p className="text-sm font-medium text-foreground">Nobody has been invited yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {isPrivate
                ? 'Invite the people who can bid. They’ll show up here as they register.'
                : 'People who register for this auction will show up here.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto px-4 pb-3">
              <SegmentedControl
                label="Show people"
                options={filterOptions(counts)}
                value={activeFilter}
                onChange={setFilter}
              />
            </div>
            {shown.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 pb-8 pt-4 text-center">
                <p className="text-sm text-muted-foreground">Nobody is in this group right now.</p>
                <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
                  Show everyone
                </Button>
              </div>
            ) : (
              <div className="border-t border-border/60">
                <PeopleList
                  views={shown}
                  stepTitles={stepTitles}
                  showAlias={props.showAlias}
                  canResend={canChase}
                  resendingIds={props.resendingIds}
                  onResend={(view) => props.onResend([view])}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
