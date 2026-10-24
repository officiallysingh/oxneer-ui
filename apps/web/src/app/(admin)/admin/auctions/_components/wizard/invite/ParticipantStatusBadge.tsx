import type { ReactNode } from 'react';
import { cn } from '@repo/ui';
import type { InviteBucket } from './invite';

const BUCKET_CLASS: Record<InviteBucket, string> = {
  review: 'border-warning/30 bg-warning/10 text-warning',
  waiting: 'border-border bg-muted text-muted-foreground',
  approved: 'border-success/30 bg-success/10 text-success',
  rejected: 'border-destructive/30 bg-destructive/10 text-destructive',
  cancelled: 'border-border bg-background text-muted-foreground',
};

export function ParticipantStatusBadge({
  bucket,
  children,
  className,
}: {
  bucket: InviteBucket;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        BUCKET_CLASS[bucket],
        className,
      )}
    >
      {children}
    </span>
  );
}
