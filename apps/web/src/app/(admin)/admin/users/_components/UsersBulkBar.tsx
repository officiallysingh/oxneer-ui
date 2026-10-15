'use client';

import { ChevronDown, X } from 'lucide-react';
import type { RoleVM } from '@repo/api';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui';

interface UsersBulkBarProps {
  count: number;
  roles: RoleVM[];
  busy: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onAssignRole: (role: RoleVM) => void;
  onClear: () => void;
}

const BAR_BUTTON =
  'h-8 border border-background/25 bg-transparent text-background hover:bg-background/10 hover:text-background';

/** Actions for the selected users; replaces nothing, sits above the list while a selection exists. */
export function UsersBulkBar({
  count,
  roles,
  busy,
  onEnable,
  onDisable,
  onAssignRole,
  onClear,
}: UsersBulkBarProps) {
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center gap-2 rounded-lg bg-foreground px-3.5 py-2.5 text-background"
    >
      <b className="mr-1 text-[13px]" aria-live="polite">
        {count} selected
      </b>
      <Button size="sm" className={BAR_BUTTON} onClick={onEnable} disabled={busy}>
        Enable
      </Button>
      <Button size="sm" className={BAR_BUTTON} onClick={onDisable} disabled={busy}>
        Disable
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className={BAR_BUTTON} disabled={busy || roles.length === 0}>
            Assign role…
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
          <DropdownMenuLabel>Add role to {count} users</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {roles.map((role) => (
            <DropdownMenuItem key={role.id} onSelect={() => onAssignRole(role)}>
              {role.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex-1" />
      <Button
        size="sm"
        className={`${BAR_BUTTON} border-transparent`}
        onClick={onClear}
        aria-label="Clear selection"
      >
        <X />
      </Button>
    </div>
  );
}
