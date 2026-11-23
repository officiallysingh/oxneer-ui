'use client';

import { CheckCircle2, ClipboardList, Gavel, Loader2 } from 'lucide-react';
import { Button, cn } from '@oxneer/ui';
import { StatusBadge } from '@/components/common/admin/AuctionStatusBadge';
import { formatDateTime, formatMoney, resolveStr } from '@/components/common/admin/format';
import {
  auctionCloseTime,
  auctionTiming,
  type AuctionPhase,
} from '@/components/common/auction/auction-timing';
import { useNow } from '@/hooks/useNow';
import type { PublicAuctionState } from '../_hooks/usePublicAuction';

const TIMING_TONE: Record<AuctionPhase, string> = {
  live: 'text-success',
  upcoming: 'text-info',
  ended: 'text-muted-foreground',
  unscheduled: 'text-muted-foreground',
};

/** Statuses in which a visitor can still register. */
const JOINABLE = new Set(['SCHEDULED', 'PUBLISHED', 'LIVE']);

function closedMessage(status: string): string {
  if (status === 'CANCELLED') return 'This auction has been cancelled.';
  if (status === 'COMPLETED' || status === 'AWARDED') return 'This auction has ended.';
  return 'Registration isn’t open yet.';
}

interface AuctionActionPanelProps {
  state: PublicAuctionState;
  onOpenSteps: () => void;
}

/** The decision panel: where the auction is in time, what it costs to enter at,
 *  and the one thing the visitor can do next. Sticky beside the details on wide screens. */
export function AuctionActionPanel({ state, onOpenSteps }: AuctionActionPanelProps) {
  const now = useNow(1_000);
  const auction = state.auction!;
  const status = resolveStr(auction.status);
  const currency = resolveStr(auction.regionalSettings?.currency) || 'INR';
  const timing = auctionTiming(auction, now.getTime());
  const opening = auction.unit?.openingPrice;
  const standing = auction.unit?.standingPrice;
  const start = auction.schedule?.startTime;
  const close = auctionCloseTime(auction);

  return (
    <aside className="rounded-xl border border-border bg-card shadow-card lg:sticky lg:top-24">
      <div className="space-y-1 border-b border-border p-5">
        <StatusBadge value={auction.status} size="sm" />
        <p
          className={cn(
            'pt-2 font-display text-2xl font-semibold tabular-nums tracking-tight',
            TIMING_TONE[timing.phase],
          )}
        >
          {timing.label}
        </p>
        {start && (
          <p className="text-sm text-muted-foreground">
            {formatDateTime(start)}
            {close && ` – ${formatDateTime(close)}`}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 border-b border-border p-5">
        <div>
          <dt className="text-xs text-muted-foreground">Opening price</dt>
          <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
            {opening != null ? formatMoney(opening, currency) : '—'}
          </dd>
        </div>
        {standing != null && standing > 0 && (
          <div>
            <dt className="text-xs text-muted-foreground">Current price</dt>
            <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-primary">
              {formatMoney(standing, currency)}
            </dd>
          </div>
        )}
      </dl>

      <div className="p-5">
        <PanelAction
          state={state}
          joinable={JOINABLE.has(status)}
          closedMessage={closedMessage(status)}
          onOpenSteps={onOpenSteps}
        />
      </div>
    </aside>
  );
}

function PanelAction({
  state,
  joinable,
  closedMessage,
  onOpenSteps,
}: {
  state: PublicAuctionState;
  joinable: boolean;
  closedMessage: string;
  onOpenSteps: () => void;
}) {
  if (state.participant) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {state.justJoined ? 'You’ve joined this auction' : 'You’re registered for this auction'}
        </p>
        {joinable && state.hasSteps && !state.allStepsDone && (
          <Button size="lg" className="w-full" onClick={onOpenSteps}>
            <ClipboardList />
            Complete registration steps
          </Button>
        )}
        {state.allStepsDone && (
          <p className="text-sm text-muted-foreground">All registration steps are complete.</p>
        )}
      </div>
    );
  }

  if (!joinable) return <p className="text-sm text-muted-foreground">{closedMessage}</p>;

  return (
    <div className="space-y-2">
      <Button size="lg" className="w-full" onClick={state.join} disabled={state.joining}>
        {state.joining ? <Loader2 className="animate-spin" /> : <Gavel />}
        {state.joining ? 'Joining…' : state.isLoggedIn ? 'Join auction' : 'Sign in to join'}
      </Button>
      {!state.isLoggedIn && (
        <p className="text-center text-xs text-muted-foreground">
          You’ll come back here after signing in.
        </p>
      )}
    </div>
  );
}
