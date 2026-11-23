'use client';

import { ArrowDown, ArrowUp, Globe, Lock } from 'lucide-react';
import type { AuctionVM } from '@oxneer/api';
import { cn } from '@oxneer/ui';
import {
  formatClock,
  formatDate,
  formatLabel,
  formatMoney,
  formatTimeLeft,
  resolveStr,
} from '@/components/common/admin/format';
import {
  auctionCurrency,
  auctionStatus,
  auctionTitle,
  openingPrice,
} from '../../_lib/auction-display';
import { useNow } from '../../_hooks/useNow';

/** Title, reference id and auction type. */
export function AuctionIdentity({ auction }: { auction: AuctionVM }) {
  const kind = formatLabel(auction.format ?? auction.type);
  return (
    // Capped so a long title truncates instead of pushing the actions off-screen.
    <div className="min-w-0 max-w-[22rem]">
      <p className="truncate text-sm font-medium text-foreground">{auctionTitle(auction)}</p>
      <p className="truncate text-xs text-muted-foreground">
        {auction.referenceId && <span className="font-mono">{auction.referenceId}</span>}
        {auction.referenceId && kind !== '—' && <span aria-hidden> · </span>}
        {kind !== '—' && kind}
      </p>
    </div>
  );
}

/** Start date and time, with a countdown to the close while the auction is live. */
export function AuctionScheduleCell({ auction }: { auction: AuctionVM }) {
  const now = useNow(60_000);
  const start = auction.schedule?.startTime;
  if (!start) {
    return <span className="whitespace-nowrap text-sm text-muted-foreground">Not scheduled</span>;
  }

  const end = auction.schedule?.endTime;
  const live = auctionStatus(auction) === 'LIVE';
  const timeLeft = live && end ? formatTimeLeft(new Date(end).getTime() - now.getTime()) : '';

  return (
    <div className="whitespace-nowrap text-sm tabular-nums">
      <p className="text-foreground">{formatDate(start)}</p>
      <p className={cn('text-xs', timeLeft ? 'text-success' : 'text-muted-foreground')}>
        {timeLeft ? `Ends in ${timeLeft}` : formatClock(start)}
      </p>
    </div>
  );
}

/** Opening price in the auction's currency; "—" until the unit is set up. */
export function AuctionPriceCell({ auction }: { auction: AuctionVM }) {
  const price = openingPrice(auction);
  if (price === undefined) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <span className="whitespace-nowrap text-sm font-medium tabular-nums text-foreground">
      {formatMoney(price, auctionCurrency(auction))}
    </span>
  );
}

/** Who can join and which way prices move, as two quiet tags. Neither is a status,
 *  so they stay neutral; the icons tell the values apart. */
export function AuctionProtocolTags({ auction }: { auction: AuctionVM }) {
  const access = resolveStr(auction.accessibility);
  const direction = resolveStr(auction.direction);
  return (
    <div className="flex gap-1.5 whitespace-nowrap">
      {access && (
        <ProtocolTag
          icon={access === 'PRIVATE' ? Lock : Globe}
          label={formatLabel(access)}
          title={
            access === 'PRIVATE'
              ? 'Private: only invited participants can join'
              : 'Public: anyone can join'
          }
        />
      )}
      {direction && (
        <ProtocolTag
          icon={direction === 'REVERSE' ? ArrowDown : ArrowUp}
          label={formatLabel(direction)}
          title={
            direction === 'REVERSE'
              ? 'Reverse: sellers bid down, lowest price wins'
              : 'Forward: buyers bid up, highest price wins'
          }
        />
      )}
    </div>
  );
}

function ProtocolTag({
  icon: Icon,
  label,
  title,
}: {
  icon: typeof Globe;
  label: string;
  title: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground"
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
