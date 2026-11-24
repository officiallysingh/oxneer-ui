'use client';

import { cn } from '@oxneer/ui';

/** Generic step indicator used by wizard pages (auctions, listings, etc).
 *
 *  In `create` mode (default), only steps before `current` are clickable.
 *  In `editMode`, every step except the active one is clickable so the admin
 *  can jump back to fix something without losing progress. */
export function StepIndicator({
  steps,
  current,
  onStepClick,
  editMode = false,
  /** "fixed" — each connector is a fixed width (good when labels are short and
   *  the bar should be predictable); "flex" — connectors stretch to fill the
   *  container (good when labels are long and the bar should span full width). */
  connector = 'fixed',
  /** 1-based step numbers that can be skipped — badged with the info accent on
   *  their circle so admins can see at a glance which steps aren't required. */
  optionalSteps = [],
}: {
  steps: string[];
  current: number;
  onStepClick?: (step: number) => void;
  editMode?: boolean;
  connector?: 'fixed' | 'flex';
  optionalSteps?: number[];
}) {
  return (
    <ol className={cn('mb-6 flex items-center', connector === 'flex' ? 'w-full px-2' : 'gap-2')}>
      {steps.map((label, i) => {
        const s = i + 1;
        const done = s < current;
        const active = s === current;
        const isOptional = optionalSteps.includes(s);
        const clickable = !!onStepClick && (editMode ? !active : done);
        const showConnector = i < steps.length - 1;
        return (
          <li
            key={s}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex items-center',
              connector === 'flex' ? 'flex-1 last:flex-none' : 'gap-2',
            )}
          >
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => onStepClick(s) : undefined}
                aria-label={`Step ${s}: ${label}${isOptional ? ' (optional)' : ''}`}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors disabled:cursor-default',
                  active &&
                    (isOptional
                      ? 'bg-info text-info-foreground ring-4 ring-info/20'
                      : 'bg-primary text-primary-foreground ring-4 ring-primary/20'),
                  !active && done && 'bg-success text-success-foreground',
                  !active && !done && isOptional && 'bg-info/15 text-info',
                  !active && !done && !isOptional && 'bg-muted text-muted-foreground',
                  clickable &&
                    'cursor-pointer hover:opacity-80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                {s}
              </button>
              <span
                className={cn(
                  'whitespace-nowrap text-xs font-medium',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
                {isOptional && <span className="text-muted-foreground/70"> (optional)</span>}
              </span>
            </div>
            {showConnector && (
              <div
                aria-hidden
                className={cn(
                  'mb-4 h-0.5 rounded-full transition-colors',
                  done ? 'bg-success' : 'bg-muted',
                  connector === 'flex' ? 'mx-4 mb-5 flex-1' : 'w-12',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
