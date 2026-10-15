import type { ReactNode } from 'react';

interface StickyActionBarProps {
  /** Status text on the left, e.g. "2 unsaved changes". */
  status?: ReactNode;
  /** Buttons on the right. */
  children: ReactNode;
}

/**
 * Form footer that sticks to the bottom of the admin content area while scrolling.
 * Bleeds over the layout's `p-6` padding so it spans the full content width.
 */
export function StickyActionBar({ status, children }: StickyActionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 -mb-6 border-t border-border bg-background/90 px-6 py-3.5 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-[1_1_200px] text-[13px] text-muted-foreground">{status}</div>
        {children}
      </div>
    </div>
  );
}
