'use client';

import Link from 'next/link';
import { ArrowUpRight, Lock } from 'lucide-react';
import type { AuctionVM } from '@oxneer/api';
import { cn, Skeleton } from '@oxneer/ui';
import { StatusBadge } from '@/components/common/admin/AuctionStatusBadge';
import { formatCompactMoney, formatMoney, resolveStr } from '@/components/common/admin/format';
import { useNow } from '@/hooks/useNow';
import { auctionTiming, type AuctionPhase } from './auction-timing';

const TIMING_TONE: Record<AuctionPhase, string> = {
  live: 'text-success',
  upcoming: 'text-info',
  ended: 'text-muted-foreground',
  unscheduled: 'text-muted-foreground',
};

/** "Real estate · Commercial", from the auction's own categories. */
function categoryLine(auction: AuctionVM): string {
  const names = [...(auction.categories ?? []), ...(auction.subCategories ?? [])].map(
    (c) => c.name,
  );
  return names.join(' · ');
}

/** One auction in the public grid. The whole card is a link to its page; there are no
 *  images yet because the API doesn't serve auction files to visitors. */
export function PublicAuctionCard({ auction }: { auction: AuctionVM }) {
  const now = useNow(1_000);
  const timing = auctionTiming(auction, now.getTime());
  const currency = resolveStr(auction.regionalSettings?.currency) || 'INR';
  const price = auction.unit?.openingPrice;
  const isPrivate = resolveStr(auction.accessibility) === 'PRIVATE';
  const categories = categoryLine(auction);

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/50 hover:shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {categories || 'Auction'}
        </span>
        <StatusBadge value={auction.status} size="sm" />
      </div>

      <h3 className="mt-3 line-clamp-2 font-display text-lg font-semibold leading-snug text-foreground text-balance transition-colors group-hover:text-primary">
        {auction.title}
      </h3>
      {auction.referenceId && (
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">{auction.referenceId}</p>
      )}
      {auction.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {auction.description}
        </p>
      )}

      <div className="mt-auto pt-5">
        <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Opening price</p>
            {price != null ? (
              <p
                className="font-display text-xl font-semibold tabular-nums text-foreground"
                title={formatMoney(price, currency)}
              >
                {formatCompactMoney(price, currency)}
              </p>
            ) : (
              <p className="font-display text-xl font-semibold text-muted-foreground">—</p>
            )}
          </div>
          <div className="min-w-0 text-right">
            <p className={cn('text-sm font-medium tabular-nums', TIMING_TONE[timing.phase])}>
              {timing.label}
            </p>
            {isPrivate && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" aria-hidden />
                Invite only
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
          View auction
          <ArrowUpRight
            className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden
          />
        </p>
      </div>
    </Link>
  );
}

/** Placeholder shaped like a card while the grid loads. */
export function PublicAuctionCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-[17rem] flex-col rounded-xl border border-border bg-card p-5"
    >
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-4 w-4/5" />
      <Skeleton className="mt-2 h-4 w-3/5" />
      <div className="mt-auto flex justify-between border-t border-border pt-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}
