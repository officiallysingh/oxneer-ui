import { Gavel, Plus, SearchX } from 'lucide-react';
import { Button, Skeleton } from '@oxneer/ui';
import { ListEmptyState } from '@/components/common/admin/ListEmptyState';

const SKELETON_WIDTHS = ['56%', '44%', '62%', '48%', '38%'];

/** Placeholder rows shaped like the table: identity, status, start, price, access. */
export function AuctionsListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading auctions" className="divide-y divide-border">
      {SKELETON_WIDTHS.map((width, i) => (
        <div key={i} className="flex h-16 items-center gap-4 px-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-2.5" style={{ width }} />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="hidden h-2.5 w-20 md:block" />
          <Skeleton className="hidden h-2.5 w-24 md:block" />
          <Skeleton className="hidden h-5 w-28 rounded-full lg:block" />
        </div>
      ))}
    </div>
  );
}

/** Empty list: no auctions at all, or none matching the filters. */
export function AuctionsEmptyState({
  filtered,
  onClearFilters,
  onCreate,
}: {
  filtered: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}) {
  if (filtered) {
    return (
      <ListEmptyState
        icon={SearchX}
        title="No auctions match these filters"
        hint="Try another status tab, remove a search term or filter, or check the spelling."
        action={
          <Button variant="outline" onClick={onClearFilters}>
            Clear all filters
          </Button>
        }
      />
    );
  }
  return (
    <ListEmptyState
      icon={Gavel}
      title="No auctions yet"
      hint="Create an auction to set up its item, rules and schedule."
      action={
        <Button onClick={onCreate}>
          <Plus />
          New auction
        </Button>
      }
    />
  );
}
