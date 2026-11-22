'use client';

import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@oxneer/ui';
import Tip from './Tip';

interface RowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  deleting?: boolean;
  size?: 'sm' | 'md';
}

/** Edit + delete icon buttons for a table or list row. */
export function RowActions({
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  deleting = false,
  size = 'md',
}: RowActionsProps) {
  const btnSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {onEdit && (
        <Tip label={editLabel}>
          <Button
            variant="ghost"
            size="sm"
            className={`${btnSize} p-0 text-muted-foreground hover:text-foreground hover:bg-muted`}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </Tip>
      )}
      {onDelete && (
        <Tip label={deleteLabel}>
          <Button
            variant="ghost"
            size="sm"
            className={`${btnSize} p-0 text-destructive hover:text-destructive hover:bg-destructive/10`}
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </Tip>
      )}
    </div>
  );
}
