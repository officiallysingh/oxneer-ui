'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { AuctionVM } from '@oxneer/api';
import { Button, cn, Skeleton } from '@oxneer/ui';
import { formatCompactMoney, resolveStr } from '@/components/common/admin/format';
import { useNow } from '@/hooks/useNow';
import { usePublicAuctions } from '@/hooks/usePublicAuctions';
import { auctionTiming, type AuctionPhase } from './auction-timing';

const PREVIEW_COUNT = 4;

const TIMING_TONE: Record<AuctionPhase, string> = {
  live: 'text-success',
  upcoming: 'text-info',
  ended: 'text-muted-foreground',
  unscheduled: 'text-muted-foreground',
};

export default function HeroSection() {
  return (
    <section className="relative border-b border-border pt-16">
      <div className="container mx-auto grid grid-cols-[minmax(0,1fr)] items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="motion-safe:animate-fade-in">
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-foreground text-balance md:text-6xl xl:text-7xl">
            Run and join live auctions
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
            Discover published auctions, complete participation workflows, and bid with a clear
            end-to-end process built for teams and participants.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button variant="gold" size="lg" className="text-base" asChild>
              <a href="#auctions">
                Explore auctions
                <ArrowRight />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="text-base" asChild>
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>
        </div>

        <LatestAuctionsPanel />
      </div>
    </section>
  );
}

/** The newest auctions open to the visitor, straight from the public API. */
function LatestAuctionsPanel() {
  const list = usePublicAuctions({ size: PREVIEW_COUNT });

  return (
    <aside
      aria-labelledby="latest-auctions"
      className="rounded-xl border border-border bg-card shadow-card"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <h2 id="latest-auctions" className="font-display text-base font-semibold text-foreground">
          Latest auctions
        </h2>
        {!list.isLoading && list.totalRecords > 0 && (
          <a
            href="#auctions"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            See all {list.totalRecords}
          </a>
        )}
      </div>
      <PanelBody list={list} />
    </aside>
  );
}

function PanelBody({ list }: { list: ReturnType<typeof usePublicAuctions> }) {
  if (list.isLoading) {
    return (
      <ul aria-busy="true" aria-label="Loading auctions" className="divide-y divide-border">
        {Array.from({ length: PREVIEW_COUNT }, (_, i) => (
          <li key={i} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16" />
          </li>
        ))}
      </ul>
    );
  }

  if (list.error || list.auctions.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-muted-foreground">
        {list.error
          ? 'Auctions couldn’t be loaded just now.'
          : 'No auctions are open right now. New ones appear here as soon as they’re published.'}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {list.auctions.map((auction) => (
        <li key={auction.id}>
          <PreviewRow auction={auction} />
        </li>
      ))}
    </ul>
  );
}

function PreviewRow({ auction }: { auction: AuctionVM }) {
  const now = useNow(1_000);
  const timing = auctionTiming(auction, now.getTime());
  const price = auction.unit?.openingPrice;
  const currency = resolveStr(auction.regionalSettings?.currency) || 'INR';

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors duration-150 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-hidden"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
          {auction.title}
        </p>
        <p className={cn('mt-0.5 text-xs tabular-nums', TIMING_TONE[timing.phase])}>
          {timing.label}
        </p>
      </div>
      {price != null && (
        <span className="shrink-0 font-display text-base font-semibold tabular-nums text-foreground">
          {formatCompactMoney(price, currency)}
        </span>
      )}
    </Link>
  );
}
