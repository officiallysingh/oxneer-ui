'use client';

import type { ReactNode } from 'react';
import { Check, Info, type LucideIcon } from 'lucide-react';
import { cn } from '@repo/ui';

export const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60';

export const selectClass = `${inputClass} appearance-none pr-8`;

export function WizardSection({
  title,
  hint,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('overflow-hidden rounded-lg border border-border bg-card', className)}
      aria-label={title}
    >
      {title && (
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </header>
      )}
      <div className="divide-y divide-border/60">{children}</div>
    </section>
  );
}

export function WizardRow({
  id,
  label,
  description,
  children,
  className,
}: {
  /** Anchor for issues that point here: "Show" scrolls to and focuses the row. */
  id?: string;
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      id={id}
      tabIndex={id ? -1 : undefined}
      className={cn(
        'grid scroll-mt-4 gap-4 px-4 py-4 focus-visible:outline-none md:grid-cols-[148px_minmax(0,1fr)] md:gap-6',
        className,
      )}
    >
      <div className="space-y-1">
        <div className="text-xs font-semibold text-foreground">{label}</div>
        {description && (
          <p className="text-[11px] leading-snug text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ChoiceCard({
  title,
  code,
  description,
  selected,
  disabled,
  badge,
  onClick,
  className,
}: {
  title: ReactNode;
  code?: string;
  description?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative rounded-md border px-3 py-2.5 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30',
        disabled && 'cursor-not-allowed opacity-55 hover:border-border hover:bg-background',
        className,
      )}
    >
      <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          className={cn(
            'text-sm font-semibold',
            selected ? 'text-foreground' : 'text-foreground/90',
          )}
        >
          {title}
        </span>
        {code && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{code}</span>
        )}
        {badge}
      </span>
      {description && (
        <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
          {description}
        </span>
      )}
    </button>
  );
}

export function ChoiceList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-1.5', className)}>{children}</div>;
}

export function OptionRow({
  title,
  description,
  selected,
  disabled,
  onClick,
  badge,
  trailing,
}: {
  title: ReactNode;
  description?: ReactNode;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  badge?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2.5 border px-3 py-2.5 text-left transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/30',
        disabled && 'cursor-not-allowed opacity-55 hover:bg-background',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-primary' : 'border-muted-foreground/50',
        )}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground">{title}</span>
          {badge}
        </span>
        {description && (
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      {trailing}
    </button>
  );
}

export function Field({
  label,
  htmlFor,
  optional,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline gap-1.5">
        <label
          htmlFor={htmlFor}
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
        {optional && <span className="text-[10px] text-muted-foreground/70">optional</span>}
      </div>
      {children}
      {hint && !error && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

export function MoneyField({
  id,
  value,
  onChange,
  currency = '₹',
  placeholder = '0',
  disabled,
  error,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          'flex overflow-hidden rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
          error && 'border-destructive',
        )}
      >
        <span className="flex items-center border-r border-border px-2.5 text-xs text-muted-foreground">
          {currency}
        </span>
        <input
          id={id}
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full bg-transparent px-2.5 text-sm tabular-nums text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

export function DurationFields({
  hours,
  minutes,
  onHours,
  onMinutes,
  hoursLabel = 'h',
  minutesLabel = 'min',
  maxHours = 72,
}: {
  hours: string;
  minutes: string;
  onHours: (value: string) => void;
  onMinutes: (value: string) => void;
  hoursLabel?: string;
  minutesLabel?: string;
  maxHours?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        max={maxHours}
        value={hours}
        onChange={(e) => onHours(e.target.value)}
        className="h-9 w-14 rounded-md border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        aria-label="Hours"
      />
      <span className="text-xs text-muted-foreground">{hoursLabel}</span>
      <input
        type="number"
        min={0}
        max={59}
        value={minutes}
        onChange={(e) => onMinutes(e.target.value)}
        className="h-9 w-14 rounded-md border border-input bg-background px-2 text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        aria-label="Minutes"
      />
      <span className="text-xs text-muted-foreground">{minutesLabel}</span>
    </div>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-[11px] leading-snug text-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function MutedNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md bg-muted/50 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
      {children}
    </p>
  );
}

export function StepBadge({ children, done }: { children: ReactNode; done?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
        done ? 'bg-success/10 text-success' : 'bg-warning/15 text-warning',
      )}
    >
      {done && <Check className="h-2.5 w-2.5" />}
      {children}
    </span>
  );
}

export function IconChip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}

export function SectionFooter({ note, action }: { note?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2.5">
      <p className="text-[11px] text-muted-foreground">{note}</p>
      {action}
    </div>
  );
}

/** Marks content the backend stores as a policy rather than a plain field. */
export function PolicyBadge({
  tone = 'primary',
  className,
}: {
  tone?: 'primary' | 'warning';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
        tone === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-warning/15 text-warning',
        className,
      )}
    >
      Policy
    </span>
  );
}

/** Small neutral pill used for constraints and secondary tags. */
export function MutedBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
      {children}
    </span>
  );
}
