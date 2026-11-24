'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@oxneer/ui';
/** A titled card with a coloured icon header and a divided body — used by the
 *  auction detail view, and reusable by any future detail page. */
export function SectionCard({
  title,
  icon: Icon,
  actions,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md',
        className ?? '',
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-foreground tracking-tight truncate">{title}</span>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="divide-y divide-border/40">{children}</div>
    </div>
  );
}

/** A single label/value row inside a SectionCard. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 even:bg-muted/15 hover:bg-muted/30 transition-colors">
      <span className="text-xs font-medium text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{children}</span>
    </div>
  );
}

/** Centered loading state for full-page fetches. */
export function PageLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
