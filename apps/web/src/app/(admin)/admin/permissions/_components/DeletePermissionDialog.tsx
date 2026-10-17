'use client';

import type { PermissionVM, RoleVM } from '@repo/api';
import { TypeToConfirmDialog } from '@/components/common/admin/TypeToConfirmDialog';
import { RoleLinkBadge } from './RoleLinkBadge';

interface DeletePermissionDialogProps {
  /** null closes the dialog. */
  permission: PermissionVM | null;
  /** Roles that include it. */
  usedBy: RoleVM[];
  onCancel: () => void;
  onConfirm: (permission: PermissionVM) => Promise<boolean>;
}

/** Type-the-name confirmation; explains who loses access when the permission is in roles. */
export function DeletePermissionDialog({
  permission,
  usedBy,
  onCancel,
  onConfirm,
}: DeletePermissionDialogProps) {
  const name = permission?.name ?? '';
  const inRoles = usedBy.length;
  return (
    <TypeToConfirmDialog
      open={!!permission}
      title={`Delete ${permission?.label ?? 'permission'}?`}
      description={
        inRoles > 0 ? (
          <>
            It’s in {inRoles} {inRoles === 1 ? 'role' : 'roles'}. Everyone with{' '}
            {inRoles === 1 ? 'that role' : 'those roles'} loses it straight away, and any part of
            the app that checks for{' '}
            <code className="font-mono text-[13px] text-foreground">{name}</code> will deny them.
          </>
        ) : (
          <>
            Users who have it directly lose it straight away. Any part of the app that checks for{' '}
            <code className="font-mono text-[13px] text-foreground">{name}</code> will deny them.
          </>
        )
      }
      confirmText={name}
      monospace
      confirmLabel="Delete permission"
      onCancel={onCancel}
      onConfirm={() => (permission ? onConfirm(permission) : Promise.resolve(false))}
    >
      {inRoles > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {usedBy.map((role) => (
            <RoleLinkBadge key={role.id} role={role} />
          ))}
        </div>
      )}
    </TypeToConfirmDialog>
  );
}
