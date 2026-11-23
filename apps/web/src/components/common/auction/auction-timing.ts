import type { AuctionVM } from '@oxneer/api';
import { formatDateTime, formatTimeLeft } from '@/components/common/admin/format';

export type AuctionPhase = 'unscheduled' | 'upcoming' | 'live' | 'ended';

export interface AuctionTiming {
  phase: AuctionPhase;
  /** One short line for cards and panels: "Ends in 3h 12m", "Starts 12 Nov, 10:00 am". */
  label: string;
  /** The countdown on its own ("3h 12m"), when one applies. */
  timeLeft: string;
}

const DAY_MS = 86_400_000;

const SHORT_DATE: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

/** The close people should see: `closesAt` includes soft-close extensions. */
export function auctionCloseTime(auction: Pick<AuctionVM, 'closesAt' | 'schedule'>) {
  return auction.closesAt ?? auction.schedule?.endTime;
}

/** Where an auction is in time, worded for buyers. A countdown is shown within a
 *  day of the start; further out, a date reads better. */
export function auctionTiming(
  auction: Pick<AuctionVM, 'closesAt' | 'schedule'>,
  nowMs: number,
): AuctionTiming {
  const start = auction.schedule?.startTime;
  if (!start) return { phase: 'unscheduled', label: 'Schedule to be announced', timeLeft: '' };

  const startMs = new Date(start).getTime();
  const close = auctionCloseTime(auction);
  const closeMs = close ? new Date(close).getTime() : undefined;

  if (nowMs < startMs) {
    const untilStart = startMs - nowMs;
    if (untilStart < DAY_MS) {
      const timeLeft = formatTimeLeft(untilStart);
      return { phase: 'upcoming', label: `Starts in ${timeLeft}`, timeLeft };
    }
    return {
      phase: 'upcoming',
      label: `Starts ${formatDateTime(start, SHORT_DATE)}`,
      timeLeft: '',
    };
  }

  if (closeMs !== undefined && nowMs >= closeMs) {
    return { phase: 'ended', label: `Ended ${formatDateTime(close, SHORT_DATE)}`, timeLeft: '' };
  }

  if (closeMs === undefined) return { phase: 'live', label: 'Open now', timeLeft: '' };
  const timeLeft = formatTimeLeft(closeMs - nowMs);
  return { phase: 'live', label: `Ends in ${timeLeft}`, timeLeft };
}
