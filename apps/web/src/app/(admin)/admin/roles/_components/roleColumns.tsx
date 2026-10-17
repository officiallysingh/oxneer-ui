'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import type { RoleVM } from '@repo/api';
import { Badge, Button } from '@repo/ui';
import { resourcesCovered, type PermissionGroups } from '@/lib/access/permission-matrix';
import { RoleActionsMenu, type RoleRowHandlers } from './RoleActionsMenu';

const MAX_RESOURCES = 3;

/** Permission count plus the resources the role covers, e.g. "18  Users  Roles  +2". */
export function CanManage({ role, groups }: { role: RoleVM; groups: PermissionGroups }) {
  const perms = role.permissions ?? [];
  const resources = resourcesCovered(
    perms.map((p) => p.id),
    groups,
  );
  if (perms.length === 0) return <span className="text-muted-foreground">No permissions</span>;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="min-w-[22px] text-right font-semibold tabular-nums text-foreground">
        {perms.length}
      </span>
      <span className="flex min-w-0 flex-wrap gap-1">
        {resources.slice(0, MAX_RESOURCES).map((r) => (
          <Badge key={r} variant="secondary" className="font-medium">
            {r}
          </Badge>
        ))}
        {resources.length > MAX_RESOURCES && (
          <Badge variant="secondary" className="font-medium text-muted-foreground">
            +{resources.length - MAX_RESOURCES}
          </Badge>
        )}
      </span>
    </div>
  );
}

export function buildRoleColumns(
  handlers: RoleRowHandlers,
  groups: PermissionGroups,
): ColumnDef<RoleVM>[] {
  return [
    {
      id: 'role',
      accessorKey: 'label',
      header: 'Role',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{row.original.label}</div>
          <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {row.original.name}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-[13.5px] leading-snug text-muted-foreground">
          {row.original.description || '—'}
        </span>
      ),
    },
    {
      id: 'permissions',
      header: 'Can manage',
      enableSorting: false,
      cell: ({ row }) => <CanManage role={row.original} groups={groups} />,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${row.original.label}`}
            onClick={(e) => {
              e.stopPropagation();
              handlers.onEdit(row.original);
            }}
          >
            <Pencil />
          </Button>
          <RoleActionsMenu role={row.original} handlers={handlers} />
        </div>
      ),
    },
  ];
}
