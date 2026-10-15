'use client';

import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { UserDetailVM } from '@repo/api';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Label,
} from '@repo/ui';
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
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handle = user?.username ?? user?.emailId ?? '';
  const matches = typed.trim() === handle;

  const close = () => {
    setTyped('');
    onCancel();
  };

  const confirm = async () => {
    if (!user || !matches) return;
    setDeleting(true);
    const deleted = await onConfirm(user);
    setDeleting(false);
    if (deleted) close();
  };

  return (
    <AlertDialog open={!!user} onOpenChange={(open) => !open && !deleting && close()}>
      <AlertDialogContent className="max-w-[400px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-lg">Delete {handle}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes {user ? fullName(user) : 'this user'} and all their access.
            This can’t be undone. Consider disabling the account instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
          className="space-y-1.5"
        >
          <Label htmlFor={inputId}>
            Type <b>{handle}</b> to confirm
          </Label>
          <Input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={!matches || deleting}>
            {deleting && <Loader2 className="animate-spin" />}
            Delete user
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
