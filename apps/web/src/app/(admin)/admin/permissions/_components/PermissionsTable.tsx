'use client';

import { ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import type { PermissionVM, RoleVM } from '@repo/api';
import { Button } from '@repo/ui';
import { Pill } from '@/components/common/admin/Pill';
import Tip from '@/components/common/admin/Tip';
import type { ResourceGroup } from '@/lib/access/permission-matrix';
import { PermissionActionsMenu, type PermissionRowHandlers } from './PermissionActionsMenu';
import { RoleLinkBadge } from './RoleLinkBadge';

const GRID = 'grid grid-cols-[2.4fr_2.6fr_2.2fr_84px] items-center gap-6';

interface PermissionsTableProps {
  groups: ResourceGroup[];
  usedBy: Map<string, RoleVM[]>;
  /** Keys of collapsed groups. */
  collapsed: ReadonlySet<string>;
  onToggleGroup: (key: string) => void;
  handlers: PermissionRowHandlers;
}

/** Permissions grouped by resource, each group collapsible; scrolls sideways on phones. */
export function PermissionsTable({
  groups,
  usedBy,
  collapsed,
  onToggleGroup,
  handlers,
}: PermissionsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]" role="table" aria-label="Permissions">
          <div
            role="row"
            className={`${GRID} h-11 border-b border-border bg-muted/50 px-5 text-[13px] font-medium text-muted-foreground`}
          >
            <div role="columnheader">Permission</div>
            <div role="columnheader">Description</div>
            <div role="columnheader">Used by roles</div>
            <div role="columnheader" className="text-right">
              Actions
            </div>
          </div>

          {groups.map((group) => {
            const open = !collapsed.has(group.key);
            const Chevron = open ? ChevronDown : ChevronRight;
            return (
              <section key={group.key} aria-label={`${group.label} permissions`}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onToggleGroup(group.key)}
                  className="flex w-full items-center gap-2.5 border-b border-border bg-muted/35 px-5 py-3 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <Chevron className="h-4 w-4" aria-hidden />
                  <span className="font-semibold">{group.label}</span>
                  {group.key && (
                    <span className="font-mono text-xs text-muted-foreground">{group.key}</span>
                  )}
                  <span className="flex-1" />
                  <span className="text-[13px] text-muted-foreground tabular-nums">
                    {group.permissions.length}{' '}
                    {group.permissions.length === 1 ? 'permission' : 'permissions'}
                  </span>
                </button>
                {open &&
                  group.permissions.map((p) => (
                    <PermissionRow
                      key={p.id}
                      permission={p}
                      roles={usedBy.get(p.id) ?? []}
                      handlers={handlers}
                    />
                  ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PermissionRow({
  permission,
  roles,
  handlers,
}: {
  permission: PermissionVM;
  roles: RoleVM[];
  handlers: PermissionRowHandlers;
}) {
  return (
    <div
      role="row"
      className={`${GRID} min-h-14 border-b border-border py-2 pl-[46px] pr-5 last:border-b-0`}
    >
      <div role="cell" className="min-w-0">
        <button
          type="button"
          onClick={() => handlers.onEdit(permission)}
          className="text-left font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          {permission.label}
        </button>
        <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          {permission.name}
        </div>
      </div>
      <div role="cell" className="text-[13.5px] text-muted-foreground">
        {permission.description || '—'}
      </div>
      <div role="cell" className="flex flex-wrap items-center gap-1">
        {roles.length > 0 ? (
          roles.map((role) => <RoleLinkBadge key={role.id} role={role} />)
        ) : (
          <span title="Only usable by assigning it to a user directly">
            <Pill tone="warning">Not in any role</Pill>
          </span>
        )}
      </div>
      <div role="cell" className="flex justify-end gap-0.5">
        <Tip label="Edit permission">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => handlers.onEdit(permission)}
            aria-label={`Edit ${permission.label}`}
          >
            <Pencil />
          </Button>
        </Tip>
        <PermissionActionsMenu permission={permission} handlers={handlers} />
      </div>
    </div>
  );
}
