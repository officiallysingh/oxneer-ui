'use client';

import { Info } from 'lucide-react';
import type { PermissionVM, RoleVM } from '@repo/api';
import {
  AddToRoleMenu,
  PermissionActionsMenu,
  type PermissionRowHandlers,
} from './PermissionActionsMenu';

interface UnusedPermissionsViewProps {
  permissions: PermissionVM[];
  roles: RoleVM[];
  handlers: PermissionRowHandlers;
}

/** Clean-up view for permissions no role includes: add them to a role, or delete them. */
export function UnusedPermissionsView({
  permissions,
  roles,
  handlers,
}: UnusedPermissionsViewProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="flex-1 text-[12.5px] text-muted-foreground">
          These are only usable by assigning them to a user directly. Add them to a role, or delete
          the ones you no longer need.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {permissions.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => handlers.onEdit(p)}
                className="text-left font-semibold hover:underline"
              >
                {p.label}
              </button>
              <div className="truncate font-mono text-xs text-muted-foreground">{p.name}</div>
            </div>
            <AddToRoleMenu permission={p} roles={roles} handlers={handlers} />
            <PermissionActionsMenu permission={p} handlers={handlers} />
          </li>
        ))}
      </ul>
    </div>
  );
}
