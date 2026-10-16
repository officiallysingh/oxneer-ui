'use client';

import { Copy, CopyPlus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { RoleVM } from '@repo/api';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui';

/** Everything a row or card can do to a role. Built once by the page. */
export interface RoleRowHandlers {
  onEdit: (role: RoleVM) => void;
  onDuplicate: (role: RoleVM) => void;
  onCopyName: (role: RoleVM) => void;
  onDelete: (role: RoleVM) => void;
}

/** "⋮" menu with the per-role actions. */
export function RoleActionsMenu({ role, handlers }: { role: RoleVM; handlers: RoleRowHandlers }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label={`More actions for ${role.label}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => handlers.onEdit(role)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handlers.onDuplicate(role)}>
          <CopyPlus className="mr-2 h-4 w-4" />
          Duplicate as new role
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handlers.onCopyName(role)}>
          <Copy className="mr-2 h-4 w-4" />
          Copy name
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => handlers.onDelete(role)}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete role…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
