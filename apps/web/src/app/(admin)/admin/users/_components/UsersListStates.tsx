import { SearchX, Users } from 'lucide-react';
import { Button, Skeleton } from '@oxneer/ui';
import { ListEmptyState } from '@/components/common/admin/ListEmptyState';

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
  if (filtered) {
    return (
      <ListEmptyState
        icon={SearchX}
        title="No users match these filters"
        hint="Try removing a search term or filter, or check the spelling."
        action={
          <Button variant="outline" onClick={onClearFilters}>
            Clear all filters
          </Button>
        }
      />
    );
  }
  return (
    <ListEmptyState icon={Users} title="No users yet" hint="Users you add will appear here." />
  );
}
