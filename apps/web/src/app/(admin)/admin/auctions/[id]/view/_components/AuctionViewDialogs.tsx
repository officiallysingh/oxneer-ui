'use client';

import { TypeToConfirmDialog } from '@/components/common/admin/TypeToConfirmDialog';
import type { AuctionViewActions } from '../_hooks/useAuctionViewActions';

interface AuctionViewDialogsProps {
  title: string;
  actions: AuctionViewActions;
}

/** Cancel and delete both end the auction for everyone, so both ask the admin
 *  to type the auction's name first. */
export function AuctionViewDialogs({ title, actions }: AuctionViewDialogsProps) {
  const name = title || 'Untitled auction';
  return (
    <>
      <TypeToConfirmDialog
        open={actions.pending === 'cancel'}
        title={`Cancel auction “${name}”?`}
        description="Nobody will be able to bid, and everyone taking part is told it is cancelled. This can’t be undone."
        confirmText={name}
        confirmLabel="Cancel auction"
        onCancel={actions.closeDialog}
        onConfirm={actions.cancelAuction}
      />
      <TypeToConfirmDialog
        open={actions.pending === 'delete'}
        title={`Delete auction “${name}”?`}
        description="This permanently removes the auction, its rules, its steps and its participants."
        confirmText={name}
        confirmLabel="Delete auction"
        onCancel={actions.closeDialog}
        onConfirm={actions.deleteAuction}
      />
    </>
  );
}
