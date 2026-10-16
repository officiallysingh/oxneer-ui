'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { RoleVM } from '@repo/api';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
} from '@repo/ui';
import { plural } from '../_lib/role-form';

const MAX_BADGES = 8;

interface DeleteRoleDialogProps {
  /** The role to delete; null closes the dialog. */
  role: RoleVM | null;
  onCancel: () => void;
  /** Resolves true when deleted, which closes the dialog. */
  onConfirm: (role: RoleVM) => Promise<boolean>;
}

/** Confirms deleting a role and lists the permissions its users lose. */
export function DeleteRoleDialog({ role, onCancel, onConfirm }: DeleteRoleDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const perms = role?.permissions ?? [];

  const confirm = async () => {
    if (!role) return;
    setDeleting(true);
    const deleted = await onConfirm(role);
    setDeleting(false);
    if (deleted) onCancel();
  };

  return (
    <AlertDialog open={!!role} onOpenChange={(open) => !open && !deleting && onCancel()}>
      <AlertDialogContent className="max-w-[440px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-lg">
            Delete {role?.label}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {perms.length > 0
              ? `Users with this role lose its ${plural(perms.length, 'permission')} straight away. Users who also have them directly keep them.`
              : 'Users with this role lose it straight away.'}{' '}
            This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {perms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {perms.slice(0, MAX_BADGES).map((p) => (
              <Badge key={p.id} variant="outline" className="font-medium">
                {p.label || p.name}
              </Badge>
            ))}
            {perms.length > MAX_BADGES && (
              <Badge variant="outline" className="font-medium text-muted-foreground">
                +{perms.length - MAX_BADGES} more
              </Badge>
            )}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting && <Loader2 className="animate-spin" />}
            Delete role
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
