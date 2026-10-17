'use client';

import type { PermissionVM, RoleVM } from '@repo/api';
import { Sheet, SheetContent } from '@repo/ui';
import type { ResourceGroup } from '@/lib/access/permission-matrix';
import type { PermissionEditorTarget } from '../_lib/permission-form';
import { CreatePermissionForm } from './CreatePermissionForm';
import { EditPermissionForm } from './EditPermissionForm';

interface PermissionEditorSheetProps {
  /** null closes the sheet. */
  target: PermissionEditorTarget | null;
  groups: ResourceGroup[];
  permissions: PermissionVM[];
  usedBy: Map<string, RoleVM[]>;
  onClose: () => void;
  onSaved: () => void;
}

/** Right-hand sheet for adding or editing a permission. */
export function PermissionEditorSheet({
  target,
  groups,
  permissions,
  usedBy,
  onClose,
  onSaved,
}: PermissionEditorSheetProps) {
  // Keyed so each open starts from fresh form state.
  const key = !target
    ? 'closed'
    : target.mode === 'edit'
      ? `edit-${target.permission.id}`
      : 'create';
  return (
    <Sheet open={!!target} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 bg-background p-0 sm:max-w-[560px]">
        {target?.mode === 'create' && (
          <CreatePermissionForm
            key={key}
            initialResourceKey={target.resourceKey}
            groups={groups}
            permissions={permissions}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
        {target?.mode === 'edit' && (
          <EditPermissionForm
            key={key}
            permission={target.permission}
            usedBy={usedBy.get(target.permission.id) ?? []}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
