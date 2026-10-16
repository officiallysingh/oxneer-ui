import { Plus, SearchX, ShieldCheck } from 'lucide-react';
import { Button, Skeleton } from '@repo/ui';

const SKELETON_WIDTHS = [
  ['34%', '52%'],
  ['28%', '60%'],
  ['40%', '44%'],
  ['30%', '56%'],
  ['36%', '48%'],
];

/** Placeholder rows while the list loads. */
export function RolesListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading roles" className="divide-y divide-border">
      {SKELETON_WIDTHS.map(([a, b], i) => (
        <div key={i} className="flex h-16 items-center gap-6 px-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-2.5" style={{ width: a }} />
            <Skeleton className="h-2 w-1/4" />
          </div>
          <Skeleton className="h-2.5 flex-1" style={{ maxWidth: b }} />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Empty list: no roles at all, or none matching the search. */
export function RolesEmptyState({
  query,
  onClearSearch,
  onCreate,
}: {
  query: string;
  onClearSearch: () => void;
  /** Opens the editor; prefilled with the search text when searching. */
  onCreate: (label?: string) => void;
}) {
  const q = query.trim();
  const Icon = q ? SearchX : ShieldCheck;
  const suggested = q ? q.charAt(0).toUpperCase() + q.slice(1) : '';

  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="font-display text-[17px] font-semibold text-foreground">
        {q ? `No roles match “${q}”` : 'No roles yet'}
      </h3>
      <p className="max-w-[320px] text-[13px] text-muted-foreground">
        {q
          ? 'Search looks at the label, name and description.'
          : 'Roles bundle permissions so you can grant them to users in one step.'}
      </p>
      <div className="mt-1.5 flex flex-wrap justify-center gap-2">
        {q && (
          <Button variant="outline" onClick={onClearSearch}>
            Clear search
          </Button>
        )}
        <Button onClick={() => onCreate(suggested || undefined)}>
          <Plus />
          {q ? `Create “${suggested}”` : 'New role'}
        </Button>
      </div>
    </div>
  );
}
