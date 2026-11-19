import { Card, Skeleton } from '@repo/ui';

/** Shaped like the header and the overview tab, so the page doesn't jump. */
export function AuctionViewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading auction">
      <Card className="space-y-4 rounded-none px-4 pt-4 shadow-none sm:px-6 sm:pt-5">
        <div className="flex justify-between gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex flex-wrap justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-80 max-w-full" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
          <Skeleton className="h-20 w-48" />
        </div>
        <div className="flex gap-4 border-t border-border py-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-5 w-24" />
          ))}
        </div>
      </Card>
      <Card className="space-y-5 rounded-none p-4 shadow-none sm:p-6">
        <Skeleton className="h-5 w-2/3" />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="space-y-3 rounded-none p-4 shadow-none sm:p-6">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10" />
          ))}
        </Card>
        <Card className="space-y-3 rounded-none p-4 shadow-none">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-2.5" />
        </Card>
      </div>
    </div>
  );
}
