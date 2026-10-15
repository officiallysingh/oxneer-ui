import { SearchX, Users } from 'lucide-react';
import { Button, Skeleton } from '@repo/ui';

const SKELETON_WIDTHS = [
  ['58%', '34%'],
  ['46%', '40%'],
  ['62%', '28%'],
  ['50%', '36%'],
  ['40%', '30%'],
];

/** Placeholder rows while the list loads. */
export function UsersListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading users" className="divide-y divide-border">
      {SKELETON_WIDTHS.map(([a, b], i) => (
        <div key={i} className="flex h-16 items-center gap-3 px-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-2.5" style={{ width: a }} />
            <Skeleton className="h-2.5" style={{ width: b }} />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Empty list: no users at all, or none matching the filters. */
export function UsersEmptyState({
  filtered,
  onClearFilters,
}: {
  filtered: boolean;
  onClearFilters: () => void;
}) {
  const Icon = filtered ? SearchX : Users;
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="font-display text-[17px] font-semibold text-foreground">
        {filtered ? 'No users match these filters' : 'No users yet'}
      </h3>
      <p className="max-w-[280px] text-[13px] text-muted-foreground">
        {filtered
          ? 'Try removing a search term or filter, or check the spelling.'
          : 'Users you add will appear here.'}
      </p>
      {filtered && (
        <Button variant="outline" className="mt-1.5" onClick={onClearFilters}>
          Clear all filters
        </Button>
      )}
    </div>
  );
}
