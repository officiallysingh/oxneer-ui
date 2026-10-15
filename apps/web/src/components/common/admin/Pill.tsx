import type { ReactNode } from 'react';
import { cn } from '@repo/ui';

export type PillTone = 'success' | 'warning' | 'destructive' | 'info' | 'muted' | 'outline';

const TONE_CLASSES: Record<PillTone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  muted: 'bg-muted text-muted-foreground',
  outline: 'border-border text-foreground',
};

interface PillProps {
  tone: PillTone;
  children: ReactNode;
  /** Leading status dot in the text colour. */
  dot?: boolean;
  className?: string;
}

/** Compact rounded status/label badge. */
export function Pill({ tone, children, dot, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border border-transparent px-2.5 text-xs font-semibold',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
