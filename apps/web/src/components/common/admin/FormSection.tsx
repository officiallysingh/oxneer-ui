import type { ReactNode } from 'react';
import { cn } from '@repo/ui';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** Danger-zone styling: destructive border and title. */
  tone?: 'default' | 'danger';
  /** Removes the vertical gap between children (for divided setting rows). */
  dense?: boolean;
  id?: string;
}

/**
 * A form card with the title/description on the left and fields on the right;
 * stacks on narrow screens.
 */
export function FormSection({
  title,
  description,
  children,
  tone = 'default',
  dense = false,
  id,
}: FormSectionProps) {
  const danger = tone === 'danger';
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cn(
        'flex flex-wrap gap-x-10 gap-y-4 rounded-lg border bg-card p-6',
        danger ? 'border-destructive/35' : 'border-border shadow-xs',
      )}
    >
      <div className="flex-[1_1_220px] max-w-[300px]">
        <h2
          id={id ? `${id}-title` : undefined}
          className={cn('font-display text-base font-semibold', danger && 'text-destructive')}
        >
          {title}
        </h2>
        {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      <div className={cn('flex min-w-0 flex-[999_1_460px] flex-col', dense ? 'gap-0' : 'gap-5')}>
        {children}
      </div>
    </section>
  );
}
