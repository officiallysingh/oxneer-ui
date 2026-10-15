'use client';

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
  /** 1-based step numbers that can be skipped — badged with a distinct accent
   *  color on their circle so admins can see at a glance which steps aren't required. */
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
    <div className={`flex items-center mb-6 ${connector === 'flex' ? 'w-full px-2' : 'gap-2'}`}>
      {steps.map((label, i) => {
        const s = i + 1;
        const done = s < current;
        const active = s === current;
        const isOptional = optionalSteps.includes(s);
        const clickable = !!onStepClick && (editMode ? !active : done);
        const showConnector = i < steps.length - 1;
        return (
          <div
            key={s}
            className={`flex items-center ${connector === 'flex' ? 'flex-1 last:flex-none' : 'gap-2'}`}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onStepClick(s) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') onStepClick(s);
                      }
                    : undefined
                }
                className={`flex items-center justify-center h-9 w-9 rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? isOptional
                      ? 'bg-violet-500 text-white ring-4 ring-violet-500/20'
                      : 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : done
                      ? 'bg-success text-success-foreground'
                      : isOptional
                        ? 'bg-violet-500/15 text-violet-600'
                        : 'bg-muted text-muted-foreground'
                } ${clickable ? 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-success/40' : ''}`}
              >
                {s}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${active ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {label}
                {isOptional && <span className="text-muted-foreground/70"> (optional)</span>}
              </span>
            </div>
            {showConnector && (
              <div
                className={`h-0.5 mb-4 rounded-full transition-colors ${
                  done ? 'bg-success' : 'bg-muted'
                } ${connector === 'flex' ? 'flex-1 mx-4 mb-5' : 'w-12'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
