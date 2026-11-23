import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface ListEmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint: string;
  /** e.g. "Clear all filters" when filtered, or the create action when the list is empty. */
  action?: ReactNode;
}

/** Empty state inside a list's table area: icon, title, one-line hint, optional action. */
export function ListEmptyState({ icon: Icon, title, hint, action }: ListEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="font-display text-[17px] font-semibold text-foreground">{title}</h3>
      <p className="max-w-[280px] text-[13px] text-muted-foreground">{hint}</p>
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
