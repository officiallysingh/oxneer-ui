'use client';

import { Plus, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button, cn } from '@oxneer/ui';

interface ListToolbarActionsProps {
  onAdd: () => void;
  addLabel: string;
  onRefresh: () => void;
  refreshing?: boolean;
  addDisabled?: boolean;
  addIcon?: LucideIcon;
}

/** Add + Refresh buttons used in PageHeader actions on list pages. */
export function ListToolbarActions({
  onAdd,
  addLabel,
  onRefresh,
  refreshing = false,
  addDisabled = false,
  addIcon: AddIcon = Plus,
}: ListToolbarActionsProps) {
  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={onAdd} disabled={addDisabled}>
        <AddIcon className="h-4 w-4 mr-1" />
        {addLabel}
      </Button>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw className={cn('h-4 w-4 mr-1', refreshing ? 'animate-spin' : '')} />
        Refresh
      </Button>
    </div>
  );
}
