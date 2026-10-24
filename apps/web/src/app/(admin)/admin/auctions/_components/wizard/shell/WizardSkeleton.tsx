import { Skeleton } from '@repo/ui';

/** Loading placeholder shaped like the wizard: header, step rail and a step body. */
export function WizardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading auction">
      <div className="space-y-2 border-b border-border pb-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-6 w-64" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[248px_minmax(0,1fr)]">
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex items-center gap-2.5">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-full max-w-xl" />
          </div>
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-border bg-card p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
