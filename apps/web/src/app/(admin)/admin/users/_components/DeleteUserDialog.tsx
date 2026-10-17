'use client';

import type { UserDetailVM } from '@repo/api';
import { TypeToConfirmDialog } from '@/components/common/admin/TypeToConfirmDialog';
import { fullName } from '../_lib/user-display';

interface DeleteUserDialogProps {
  /** The user to delete; null closes the dialog. */
  user: UserDetailVM | null;
  onCancel: () => void;
  /** Resolves true when deleted, which closes the dialog. */
  onConfirm: (user: UserDetailVM) => Promise<boolean>;
}

/** Type-the-username confirmation before a permanent delete. */
export function DeleteUserDialog({ user, onCancel, onConfirm }: DeleteUserDialogProps) {
  const handle = user?.username ?? user?.emailId ?? '';
  return (
    <TypeToConfirmDialog
      open={!!user}
      title={`Delete ${handle}?`}
      description={`This permanently removes ${user ? fullName(user) : 'this user'} and all their access. This can’t be undone. Consider disabling the account instead.`}
      confirmText={handle}
      confirmLabel="Delete user"
      onCancel={onCancel}
      onConfirm={() => (user ? onConfirm(user) : Promise.resolve(false))}
    />
  );
}
