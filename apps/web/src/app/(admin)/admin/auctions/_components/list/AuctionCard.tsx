'use client';

import type { AuctionVM } from '@oxneer/api';
import { StatusBadge } from '@/components/common/admin/AuctionStatusBadge';
import { AuctionActionsMenu, type AuctionRowHandlers } from './AuctionActionsMenu';
import {
  AuctionIdentity,
  AuctionPriceCell,
  AuctionProtocolTags,
  AuctionScheduleCell,
} from './AuctionListCells';

interface AuctionCardProps {
  auction: AuctionVM;
  handlers: AuctionRowHandlers;
}

/** Mobile list item: same data and actions as a table row. */
export function AuctionCard({ auction, handlers }: AuctionCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => handlers.onView(auction)}
          className="min-w-0 flex-1 rounded text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <AuctionIdentity auction={auction} />
        </button>
        <AuctionActionsMenu auction={auction} handlers={handlers} variant="card" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge value={auction.status} size="sm" />
        <AuctionProtocolTags auction={auction} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <AuctionScheduleCell auction={auction} />
        <AuctionPriceCell auction={auction} />
      </div>
    </article>
  );
}
