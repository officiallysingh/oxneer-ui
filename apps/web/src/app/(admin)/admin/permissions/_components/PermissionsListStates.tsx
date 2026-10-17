import { CheckCircle2, KeyRound, Plus, SearchX } from 'lucide-react';
import { Button, Skeleton } from '@repo/ui';

const SKELETON_WIDTHS = ['34%', '28%', '40%', '30%', '36%', '26%'];

/** Placeholder rows while permissions load. */
export function PermissionsListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading permissions"
      className="divide-y divide-border rounded-lg border border-border bg-card"
    >
      {SKELETON_WIDTHS.map((w, i) => (
        <div key={i} className="flex h-14 items-center gap-6 px-5">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-2.5" style={{ width: w }} />
            <Skeleton className="h-2 w-1/5" />
          </div>
          <Skeleton className="h-2.5 flex-1" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

type EmptyKind = 'no-results' | 'none' | 'all-used';

/** Empty states: search with no matches, no permissions at all, or every permission is in a role. */
export function PermissionsEmptyState({
  kind,
  query,
  onClearSearch,
  onAdd,
}: {
  kind: EmptyKind;
  query: string;
  onClearSearch: () => void;
  onAdd: () => void;
}) {
  const content = {
    'no-results': {
      Icon: SearchX,
      title: `No permissions match “${query.trim()}”`,
      body: 'Search covers the label, name and description in every resource group.',
    },
    none: {
      Icon: KeyRound,
      title: 'No permissions yet',
      body: 'Permissions are the individual actions that roles are built from.',
    },
    'all-used': {
      Icon: CheckCircle2,
      title: 'Every permission is in a role',
      body: 'Nothing to clean up.',
    },
  }[kind];
  const { Icon } = content;

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="font-display text-base font-semibold">{content.title}</h3>
      <p className="max-w-[340px] text-[13px] text-muted-foreground">{content.body}</p>
      {kind !== 'all-used' && (
        <div className="mt-1.5 flex flex-wrap justify-center gap-2">
          {kind === 'no-results' && (
            <Button variant="outline" size="sm" onClick={onClearSearch}>
              Clear search
            </Button>
          )}
          <Button size="sm" onClick={onAdd}>
            <Plus />
            Add permission
          </Button>
        </div>
      )}
    </div>
  );
}
