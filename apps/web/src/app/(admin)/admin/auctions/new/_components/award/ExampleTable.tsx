'use client';

import type { ReactNode } from 'react';
import { cn } from '@repo/ui';
import { formatMoney } from '../shared/summary';

export type ExampleRow = {
  rank: number;
  bidder: string;
  bid: number;
  placed: string;
  note?: string;
  winner?: boolean;
};

/** Builds a small, deterministic set of bids for the explanatory tables. */
export function buildExample(
  opening: string,
  direction: 'FORWARD' | 'REVERSE',
  options: { winnerKth: number; showTie?: boolean },
  currency = 'INR',
): { rows: ExampleRow[]; note: string } {
  const base = parseFloat(opening) || 800000;
  const sign = direction === 'FORWARD' ? 1 : -1;
  const deltas = [25000, 10000, 10000, 4000];
  const bids = deltas.map((delta, index) => {
    if (options.showTie && (index === 1 || index === 2)) return base + sign * 10000;
    if (!options.showTie && index === 2) return base + sign * 9000;
    return base + sign * delta;
  });
  const winnerIndex = Math.max(0, options.winnerKth - 1);
  const bidWord = direction === 'FORWARD' ? 'Bidder' : 'Supplier';
  const rows = bids.map((bid, index) => ({
    rank: index + 1,
    bidder: `${bidWord} ${String.fromCharCode(65 + index)}`,
    bid,
    placed: ['12:58:10', '12:52:41', '12:55:02', '12:31:19'][index]!,
    winner: index === winnerIndex,
    note: options.showTie && (index === 1 || index === 2) ? 'tied' : undefined,
  }));

  const winner = rows[winnerIndex]!;
  const tieNote =
    options.showTie && winnerIndex > 0
      ? ` ${rows[1]!.bidder} and ${rows[2]!.bidder} are tied. The Ties policy decides between them if it matters.`
      : '';
  return {
    rows,
    note: `${winner.bidder} wins with ${formatMoney(winner.bid, currency)}.${tieNote}`,
  };
}

export function ExampleTable({
  rows,
  note,
  direction,
  currency,
}: {
  rows: ExampleRow[];
  note: ReactNode;
  direction: 'FORWARD' | 'REVERSE';
  currency: string;
}) {
  return (
    <div className="border-t border-border px-4 py-4">
      <div className="grid gap-3 md:grid-cols-[168px_minmax(0,1fr)]">
        <div>
          <p className="text-xs font-semibold text-foreground">Example</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Four {direction === 'FORWARD' ? 'bids' : 'asks'} at the close.
          </p>
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-2.5 py-1.5 font-semibold">
                  Rank
                </th>
                <th scope="col" className="px-2.5 py-1.5 font-semibold">
                  {direction === 'FORWARD' ? 'Bidder' : 'Supplier'}
                </th>
                <th scope="col" className="px-2.5 py-1.5 text-right font-semibold">
                  {direction === 'FORWARD' ? 'Bid' : 'Ask'}
                </th>
                <th scope="col" className="px-2.5 py-1.5 text-right font-semibold">
                  Placed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row) => (
                <tr key={row.rank} className={cn(row.winner && 'bg-primary/5')}>
                  <td className="px-2.5 py-1.5 tabular-nums text-muted-foreground">{row.rank}</td>
                  <td className="px-2.5 py-1.5 font-medium text-foreground">
                    {row.bidder}
                    {row.winner && <span className="text-muted-foreground"> · winner</span>}
                    {row.note && <span className="text-muted-foreground"> · {row.note}</span>}
                  </td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums text-foreground">
                    {formatMoney(row.bid, currency)}
                  </td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums text-muted-foreground">
                    {row.placed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="bg-foreground px-3 py-2 text-[11px] leading-snug text-background">{note}</p>
        </div>
      </div>
    </div>
  );
}
