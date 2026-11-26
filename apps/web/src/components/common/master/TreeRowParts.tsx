'use client';

import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, cn } from '@oxneer/ui';
import Tip from '@/components/common/admin/Tip';

/** Chevron that turns into a spinner while the row's children load. */
function ExpandIcon({
  expanded,
  loading,
  small,
}: {
  expanded: boolean;
  loading: boolean;
  small?: boolean;
}) {
  const size = small ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const className = cn(size, 'shrink-0 text-muted-foreground');
  if (loading) return <Loader2 className={cn(className, 'animate-spin')} />;
  return expanded ? <ChevronDown className={className} /> : <ChevronRight className={className} />;
}

interface ExpandToggleProps {
  expanded: boolean;
  loading: boolean;
  small?: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** The clickable left part of a tree row: chevron + label content. */
export function ExpandToggle({ expanded, loading, small, onToggle, children }: ExpandToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onToggle}
      aria-expanded={expanded}
      className="h-auto flex-1 min-w-0 justify-start gap-2 p-0 text-left font-normal hover:bg-transparent"
    >
      <ExpandIcon expanded={expanded} loading={loading} small={small} />
      {children}
    </Button>
  );
}

interface TreeRowActionsProps {
  noun: string;
  childNoun: string;
  small?: boolean;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
}

/** Edit / add-child / delete buttons on the right of a state or city row. */
export function TreeRowActions({
  noun,
  childNoun,
  small,
  onEdit,
  onAddChild,
  onDelete,
}: TreeRowActionsProps) {
  const square = small ? 'h-6 w-6' : 'h-7 w-7';
  const icon = small ? 'h-3 w-3' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <Tip label={`Edit ${noun}`}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(square, 'p-0 text-muted-foreground hover:text-foreground hover:bg-muted')}
          onClick={onEdit}
          aria-label={`Edit ${noun}`}
        >
          <Pencil className={icon} />
        </Button>
      </Tip>
      <Tip label={`Add ${childNoun}`}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            small ? 'h-6' : 'h-7',
            'px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1',
          )}
          onClick={onAddChild}
        >
          <Plus className="h-3 w-3" />
          <span className="capitalize">{childNoun}</span>
        </Button>
      </Tip>
      <Tip label={`Delete ${noun}`}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            square,
            'p-0 text-destructive hover:text-destructive hover:bg-destructive/10',
          )}
          onClick={onDelete}
          aria-label={`Delete ${noun}`}
        >
          <Trash2 className={icon} />
        </Button>
      </Tip>
    </div>
  );
}

interface NestedStateProps {
  loading: boolean;
  isEmpty: boolean;
  noun: string;
  /** Shows an "Add one" link in the empty line when given. */
  onAdd?: () => void;
  className?: string;
  children: ReactNode;
}

/** Loading line, "No X yet. Add one" line, or the nested content. */
export function NestedState({
  loading,
  isEmpty,
  noun,
  onAdd,
  className,
  children,
}: NestedStateProps) {
  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground text-xs', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading {noun}...
      </div>
    );
  }
  if (isEmpty) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        No {noun} yet.
        {onAdd && (
          <>
            {' '}
            <Button
              type="button"
              variant="link"
              onClick={onAdd}
              className="h-auto p-0 text-xs underline underline-offset-2"
            >
              Add one
            </Button>
          </>
        )}
      </p>
    );
  }
  return <>{children}</>;
}
