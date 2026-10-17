'use client';

import { ChevronDown, Copy, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { PermissionVM, RoleVM } from '@repo/api';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui';

/** Everything a row can do to a permission. Built once by the page. */
export interface PermissionRowHandlers {
  onEdit: (permission: PermissionVM) => void;
  onCopyName: (permission: PermissionVM) => void;
  onDelete: (permission: PermissionVM) => void;
  onAddToRole: (permission: PermissionVM, role: RoleVM) => void;
  /** Permission currently being changed, if any. */
  busyId: string | null;
}

/** "⋮" menu: edit, copy name, delete. */
export function PermissionActionsMenu({
  permission,
  handlers,
}: {
  permission: PermissionVM;
  handlers: PermissionRowHandlers;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label={`More actions for ${permission.label}`}
          disabled={handlers.busyId === permission.id}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => handlers.onEdit(permission)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handlers.onCopyName(permission)}>
          <Copy className="mr-2 h-4 w-4" />
          Copy name
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => handlers.onDelete(permission)}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "Add to role…" button listing the roles that don't have the permission yet. */
export function AddToRoleMenu({
  permission,
  roles,
  handlers,
}: {
  permission: PermissionVM;
  roles: RoleVM[];
  handlers: PermissionRowHandlers;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={roles.length === 0 || handlers.busyId === permission.id}
        >
          Add to role…
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
        <DropdownMenuLabel>Add {permission.label} to</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => (
          <DropdownMenuItem key={role.id} onSelect={() => handlers.onAddToRole(permission, role)}>
            {role.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
