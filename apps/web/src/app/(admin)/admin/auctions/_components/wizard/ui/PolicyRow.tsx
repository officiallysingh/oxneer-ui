'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, ChevronUp, Pencil, Trash2, Zap, type LucideIcon } from 'lucide-react';
import { Button, cn } from '@repo/ui';

export interface PolicySummaryChip {
  text: string;
  /** Marks the part of the summary that needs fixing. */
  bad?: boolean;
}

/** A policy applied automatically by the platform. Collapsed, it is one dark
 *  summary row (what it does, when it runs); expanded, it shows its editor with
 *  a Done button that collapses it again. */
export function PolicyRow({
  title,
  icon: Icon = Zap,
  phase,
  warn,
  summary,
  due,
  open,
  onToggle,
  onRemove,
  footer,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  /** "During auction", "Post auction", … */
  phase?: string;
  /** Short warning tag, such as "2 issues to fix" or "Needs a reserve". */
  warn?: string;
  summary: PolicySummaryChip[];
  due: { main: string; sub: string };
  open: boolean;
  onToggle: () => void;
  /** Policies that can be switched off show a remove button when expanded. */
  onRemove?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const head = (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="text-sm font-semibold">{title}</span>
      <span className="rounded-full bg-[image:var(--gradient-gold)] px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
        Policy
      </span>
      {phase && (
        <span className="rounded-full bg-policy-foreground/10 px-2 py-0.5 text-[10px] font-medium text-policy-foreground/90">
          {phase}
        </span>
      )}
      {warn && (
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/70 bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          {warn}
        </span>
      )}
    </div>
  );

  const iconBox = (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[image:var(--gradient-gold)] text-primary-foreground">
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );

  if (!open) {
    return (
      <section
        aria-label={title}
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-policy bg-policy px-3 py-3 text-policy-foreground sm:flex-nowrap sm:px-4"
      >
        {iconBox}
        <button
          type="button"
          aria-expanded={false}
          onClick={onToggle}
          className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-policy-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {head}
          <span className="mt-1 flex flex-wrap gap-x-2 text-xs text-policy-foreground/75">
            {summary.map((chip, index) => (
              <span
                key={`${chip.text}-${index}`}
                className={cn(
                  index > 0 && 'before:mr-2 before:text-policy-foreground/40 before:content-["·"]',
                  chip.bad && 'font-semibold text-warning',
                )}
              >
                {chip.text}
              </span>
            ))}
          </span>
        </button>
        <span className="order-last flex w-full flex-col rounded-md border border-policy-foreground/15 bg-policy-foreground/5 px-3 py-1.5 sm:order-none sm:w-auto sm:shrink-0 sm:text-right">
          <b className="text-xs font-semibold tabular-nums">{due.main}</b>
          <span className="text-[11px] text-policy-foreground/70">{due.sub}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Edit ${title.toLowerCase()}`}
          onClick={onToggle}
          className="h-9 w-9 shrink-0 text-policy-foreground/80 hover:bg-policy-foreground/10 hover:text-policy-foreground"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
      </section>
    );
  }

  return (
    <article
      aria-label={`Edit ${title.toLowerCase()}`}
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <header className="flex flex-wrap items-center gap-3 bg-policy px-3 py-2.5 text-policy-foreground sm:px-4">
        {iconBox}
        <div className="min-w-0 flex-1">{head}</div>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 gap-1.5 text-xs text-policy-foreground/80 hover:bg-destructive/20 hover:text-policy-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Remove
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Collapse ${title.toLowerCase()}`}
          onClick={onToggle}
          className="h-8 w-8 text-policy-foreground/80 hover:bg-policy-foreground/10 hover:text-policy-foreground"
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
        </Button>
      </header>
      <div className="divide-y divide-border/60">{children}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2.5">
        <p className="text-[11px] text-muted-foreground">
          {footer ?? 'Saved with the rest of the auction when you continue.'}
        </p>
        <Button type="button" size="sm" className="h-7 px-3 text-xs" onClick={onToggle}>
          Done
        </Button>
      </div>
    </article>
  );
}

/** Shown in place of an optional policy that is switched off. */
export function PolicyOffRow({
  title,
  text,
  actionLabel,
  onAdd,
}: {
  title: string;
  text: string;
  actionLabel: string;
  onAdd: () => void;
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-3"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onAdd} className="gap-1.5">
        <Zap className="h-3.5 w-3.5" aria-hidden />
        {actionLabel}
      </Button>
    </section>
  );
}
