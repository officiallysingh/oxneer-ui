'use client';

import { useState } from 'react';
import { ChevronDown, Loader2, Users } from 'lucide-react';
import { Button, cn } from '@repo/ui';
import { participantsApi } from '@repo/api';
import { parseApiError } from '@/lib/api-errors';
import { UserAvatar } from '@/components/common/admin/UserAvatar';
import { DismissibleError } from '../../../_components/AuctionShared';
import type { InviteBucket, InviteCounts, ParticipantView } from './invite';
import { BUCKET_LABELS, BUCKET_ORDER } from './invite';
import { ParticipantDetail } from './ParticipantDetail';
import { ParticipantStatusBadge } from './ParticipantStatusBadge';

type Tab = 'all' | InviteBucket;

const TABS: Tab[] = ['all', ...BUCKET_ORDER];

function tabCount(tab: Tab, counts: InviteCounts): number {
  if (tab === 'all') return counts.all;
  return counts[tab];
}

export function InvitedList({
  views,
  counts,
  loading,
  error,
  minimumEnabled,
  minimumCount,
  checkAt,
  onRefresh,
  onDecision,
  localDecisionIds,
}: {
  views: ParticipantView[];
  counts: InviteCounts;
  loading: boolean;
  error: string | null;
  minimumEnabled: boolean;
  minimumCount: number;
  checkAt: string;
  onRefresh: () => void;
  onDecision: (view: ParticipantView, decision: 'APPROVED' | 'REJECTED', reason?: string) => void;
  localDecisionIds: Set<string>;
}) {
  const [tab, setTab] = useState<Tab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = tab === 'all' ? views : views.filter((view) => view.bucket === tab);

  const confirmCancel = async (view: ParticipantView) => {
    setRemovingId(view.participant.id);
    setActionError(null);
    try {
      await participantsApi.deleteParticipant(view.participant.id);
      setCancelId(null);
      if (expandedId === view.participant.id) setExpandedId(null);
      onRefresh();
    } catch (err) {
      setActionError(parseApiError(err).summary);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card"
      aria-label="Invited participants"
    >
      <header className="flex flex-wrap items-start gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Invited</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {counts.invited} {counts.invited === 1 ? 'person' : 'people'} invited · {counts.ready}{' '}
            ready to bid
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1">
          {TABS.map((item) => {
            const active = tab === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                aria-pressed={active}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {item === 'all' ? 'All' : BUCKET_LABELS[item]} · {tabCount(item, counts)}
              </button>
            );
          })}
        </div>
      </header>

      <div className="space-y-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-[11px]">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Minimum participants
          </span>
          <span className="text-muted-foreground">
            {minimumEnabled ? (
              <>
                At least {minimumCount} must be ready by {checkAt || 'the check time'}. Ready now:{' '}
                <span
                  className={cn(
                    'font-semibold',
                    counts.ready >= minimumCount ? 'text-success' : 'text-warning',
                  )}
                >
                  {counts.ready}
                </span>
                .
              </>
            ) : (
              'No minimum participant requirement for this auction.'
            )}
          </span>
        </div>

        <DismissibleError message={actionError} />
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
            {error}
          </p>
        )}

        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground max-md:grid-cols-[minmax(0,1fr)_auto]">
            <span>Person</span>
            <span className="max-md:hidden">Contact</span>
            <span className="max-md:hidden">Status</span>
            <span className="sr-only">Actions</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading invitations…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-8 text-center">
              <Users className="h-6 w-6 text-muted-foreground/40" aria-hidden />
              <p className="text-xs text-muted-foreground">
                {views.length === 0
                  ? 'Nobody invited yet. Invitations go out as soon as you send them.'
                  : `No participants in ${tab === 'all' ? 'this list' : BUCKET_LABELS[tab].toLowerCase()}.`}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((view) => {
                const id = view.participant.id;
                const expanded = expandedId === id;
                const cancelling = cancelId === id;
                const removing = removingId === id;
                const canCancel = view.bucket !== 'rejected' && view.bucket !== 'cancelled';
                return (
                  <li key={id} className="bg-card">
                    <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 max-md:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserAvatar
                          firstName={view.name.split(' ')[0]}
                          lastName={view.name.split(' ').slice(1).join(' ')}
                          username={view.participant.username || view.email}
                          src={view.participant.profilePicture || view.participant.avatar}
                          size={28}
                          className="h-7 w-7 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {view.name}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {view.platformLine}
                          </p>
                        </div>
                      </div>

                      <div className="min-w-0 max-md:hidden">
                        <p className="truncate text-[11px] text-foreground">{view.email || '—'}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {view.mobile || 'No mobile number'}
                        </p>
                      </div>

                      <div className="min-w-0 max-md:hidden">
                        <ParticipantStatusBadge bucket={view.bucket}>
                          {view.label}
                        </ParticipantStatusBadge>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {view.note}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={view.bucket === 'review' && !expanded ? 'default' : 'outline'}
                          onClick={() => setExpandedId(expanded ? null : id)}
                          className="h-7 gap-1 px-2.5 text-xs"
                        >
                          {expanded ? 'Close' : view.bucket === 'review' ? 'Review' : 'View'}
                          <ChevronDown
                            className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')}
                            aria-hidden
                          />
                        </Button>
                        {canCancel && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelId(cancelling ? null : id)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>

                    {cancelling && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-warning/30 bg-warning/10 px-3 py-2.5">
                        <p className="text-[11px] text-foreground">
                          Cancel the invitation for <strong>{view.email || view.name}</strong>?
                          They’re told by email and can’t join.
                        </p>
                        <div className="ml-auto flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCancelId(null)}
                            disabled={removing}
                            className="h-7 px-3 text-xs"
                          >
                            Keep it
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void confirmCancel(view)}
                            disabled={removing}
                            className="h-7 gap-1.5 px-3 text-xs"
                          >
                            {removing && <Loader2 className="h-3 w-3 animate-spin" />}
                            Yes, cancel it
                          </Button>
                        </div>
                      </div>
                    )}

                    {expanded && (
                      <div className="border-t border-border/60 p-2">
                        <ParticipantDetail
                          view={view}
                          decision={view.decision}
                          localDecision={localDecisionIds.has(id)}
                          onDecision={(decision, reason) => onDecision(view, decision, reason)}
                          onClose={() => setExpandedId(null)}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
