'use client';

import { cn } from '@repo/ui';
import type { PriceWindow } from '../../../_lib/wizard/types';
import { formatTime, parseDuration, windowSummary } from '../../../_lib/wizard/summary';

/** Proportional strip showing how the price windows divide the auction time,
 *  with any soft-close extension drawn after the close. */
export function WindowTrack({
  windows,
  symbol,
  start,
  closing,
  latestClose,
  softClose,
  clock = false,
  className,
}: {
  windows: PriceWindow[];
  symbol: string;
  start: string;
  closing: string;
  latestClose: string;
  softClose: boolean;
  /** A clock auction has no fixed close: the last window runs until it stops. */
  clock?: boolean;
  className?: string;
}) {
  if (windows.length === 0) return null;
  const startMs = Date.parse(start);
  const closeMs = Date.parse(closing);
  const latestMs = Date.parse(latestClose);
  const timed = !clock && Number.isFinite(startMs) && Number.isFinite(closeMs) && closeMs > startMs;

  const minutesOf = (window: PriceWindow) => {
    const { hours, minutes } = parseDuration(window.duration);
    return hours * 60 + minutes;
  };
  // Each window starts where the ones before it end; the last runs to the close.
  const starts = windows.map((_, index) =>
    windows.slice(0, index).reduce((acc, window) => acc + minutesOf(window), 0),
  );
  const used = starts[starts.length - 1] ?? 0;
  const total = timed ? (closeMs - startMs) / 60_000 : Math.max(120, used + 60);
  const segments = windows.map((window, index) => {
    const isLast = index === windows.length - 1;
    const from = starts[index]!;
    const length = isLast ? Math.max(total - from, total * 0.06) : Math.max(minutesOf(window), 1);
    return {
      key: window.id || `w-${index}`,
      label: `${index + 1} · ${windowSummary(window, symbol)}`,
      from,
      length,
    };
  });
  const extension =
    softClose && timed && Number.isFinite(latestMs) && latestMs > closeMs
      ? Math.max((latestMs - closeMs) / 60_000, total * 0.12)
      : softClose && !clock
        ? total * 0.25
        : 0;
  const sum = segments.reduce((acc, segment) => acc + segment.length, 0) + extension;
  const at = (minutes: number) =>
    Number.isFinite(startMs)
      ? formatTime(new Date(startMs + minutes * 60_000).toISOString())
      : minutes
        ? `+${minutes} min`
        : 'Start';
  const tones = ['bg-primary/45', 'bg-primary/70', 'bg-primary'];
  const label =
    segments.map((segment) => `Window ${segment.label}`).join(', ') +
    (extension ? ', continuing through any extension' : '');

  return (
    <div className={cn('mt-3', className)}>
      <div
        role="img"
        aria-label={label}
        className="flex h-[34px] overflow-hidden rounded-md border border-input"
      >
        {segments.map((segment, index) => (
          <div
            key={segment.key}
            style={{ flexGrow: segment.length }}
            className={cn(
              'flex min-w-0 basis-0 items-center overflow-hidden whitespace-nowrap border-r border-card px-2 text-[11px] font-bold tabular-nums text-primary-foreground',
              tones[index % tones.length],
            )}
          >
            <span className="truncate">{segment.label}</span>
          </div>
        ))}
        {extension > 0 && (
          <div
            style={{ flexGrow: extension }}
            className="flex min-w-0 basis-0 items-center overflow-hidden whitespace-nowrap bg-primary/20 px-2 text-[11px] font-bold text-foreground"
          >
            <span className="truncate">{windows.length} continues</span>
          </div>
        )}
      </div>
      <div className="relative mt-1 h-4 text-[10px] tabular-nums opacity-75">
        <span className="absolute left-0">{at(0)}</span>
        {segments.slice(1).map((segment) => (
          <span
            key={segment.key}
            className="absolute -translate-x-1/2"
            style={{ left: `${(segment.from / sum) * 100}%` }}
          >
            {at(segment.from)}
          </span>
        ))}
        <span className="absolute right-0">
          {clock ? 'Clock stops' : timed ? formatTime(new Date(closeMs).toISOString()) : 'Close'}
          {extension > 0 && Number.isFinite(latestMs) && latestMs > closeMs
            ? ` → ${formatTime(new Date(latestMs).toISOString())}`
            : ''}
        </span>
      </div>
    </div>
  );
}
