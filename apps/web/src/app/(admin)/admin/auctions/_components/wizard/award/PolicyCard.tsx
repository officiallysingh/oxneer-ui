'use client';

import type { ReactNode } from 'react';
import { ChevronDown, Zap } from 'lucide-react';
import { Button, cn } from '@repo/ui';
import { PolicyBadge } from '../ui/wizard-ui';

/** Collapsible award-policy card. The dark header distinguishes policies that
 *  run automatically at the close from ordinary form sections. */
export function PolicyCard({
  title,
  subtitle,
  timing,
  right,
  open,
  onToggle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  timing?: string;
  right?: ReactNode;
  open: boolean;
  onToggle: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2.5 bg-foreground px-3 py-2.5 text-left text-background',
          open && 'border-b border-border',
        )}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/20 text-primary">
          <Zap className="h-3 w-3" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold">{title}</span>
            <PolicyBadge />
            <span className="rounded-full border border-background/30 px-1.5 py-0.5 text-[9px] font-medium text-background/80">
              Post auction
            </span>
            {timing && <span className="text-[10px] text-background/60">{timing}</span>}
          </span>
          <span className="mt-0.5 block text-[11px] text-background/65">{subtitle}</span>
        </span>
        {right}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-background/70 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {open && (
        <>
          {children}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              {footer ?? 'Saved with the rest of the auction when you continue.'}
            </p>
            <Button type="button" size="sm" className="h-7 px-3 text-xs" onClick={onToggle}>
              Done
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
