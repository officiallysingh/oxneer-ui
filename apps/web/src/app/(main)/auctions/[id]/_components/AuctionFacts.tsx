import type { ReactNode } from 'react';
import type { AuctionVM } from '@oxneer/api';
import { formatLabel, resolveStr } from '@/components/common/admin/format';

const DIRECTION_TEXT: Record<string, string> = {
  FORWARD: 'Forward: prices go up, the highest offer wins',
  REVERSE: 'Reverse: prices go down, the lowest offer wins',
};

const ACCESS_TEXT: Record<string, string> = {
  PUBLIC: 'Anyone with an account',
  PRIVATE: 'Invited participants only',
};

function textOr(map: Record<string, string>, value: unknown): string {
  const key = resolveStr(value);
  return map[key] ?? formatLabel(value);
}

/** How the auction runs, as a plain definition list. Settings only an organiser
 *  cares about (rounding mode) are left out. */
export function AuctionFacts({ auction }: { auction: AuctionVM }) {
  const categories = [...(auction.categories ?? []), ...(auction.subCategories ?? [])]
    .map((c) => c.name)
    .join(', ');
  const unitType = auction.unit?.type ? formatLabel(auction.unit.type) : '';

  return (
    <section aria-labelledby="auction-facts">
      <h2 id="auction-facts" className="font-display text-xl font-semibold text-foreground">
        How this auction works
      </h2>
      <dl className="mt-4 grid gap-x-8 border-t border-border sm:grid-cols-2">
        <Fact label="Direction">{textOr(DIRECTION_TEXT, auction.direction)}</Fact>
        <Fact label="Who can join">{textOr(ACCESS_TEXT, auction.accessibility)}</Fact>
        <Fact label="Participant names">{formatLabel(auction.participantVisibility)}</Fact>
        <Fact label="Offers">{formatLabel(auction.offerVisibility)}</Fact>
        {unitType && <Fact label="What’s on offer">{unitType}</Fact>}
        <Fact label="Currency">{resolveStr(auction.regionalSettings?.currency) || '—'}</Fact>
        <Fact label="Auction time zone">
          {resolveStr(auction.regionalSettings?.timeZone) || '—'}
        </Fact>
        {categories && <Fact label="Category">{categories}</Fact>}
      </dl>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-border py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}
