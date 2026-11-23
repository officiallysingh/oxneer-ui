'use client';

import { TypeToConfirmDialog } from '@/components/common/admin/TypeToConfirmDialog';

interface DeleteAuctionDialogProps {
  open: boolean;
  /** The auction's title, which the admin types to confirm. */
  name: string;
  onCancel: () => void;
  /** Resolves true when deleted, which closes the dialog. */
  onConfirm: () => Promise<boolean>;
}

/** Type-the-title confirmation before an auction is permanently deleted. */
export function DeleteAuctionDialog({ open, name, onCancel, onConfirm }: DeleteAuctionDialogProps) {
  return (
    <TypeToConfirmDialog
      open={open}
      title={`Delete auction “${name}”?`}
      description="This permanently removes the auction, its rules, its steps and its participants."
      confirmText={name}
      confirmLabel="Delete auction"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
