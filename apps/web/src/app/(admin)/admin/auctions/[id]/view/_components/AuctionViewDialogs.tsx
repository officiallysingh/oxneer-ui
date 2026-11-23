'use client';

import { CancelAuctionDialog } from '../../../_components/CancelAuctionDialog';
import { DeleteAuctionDialog } from '../../../_components/DeleteAuctionDialog';
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
      <CancelAuctionDialog
        open={actions.pending === 'cancel'}
        name={name}
        onCancel={actions.closeDialog}
        onConfirm={actions.cancelAuction}
      />
      <DeleteAuctionDialog
        open={actions.pending === 'delete'}
        name={name}
        onCancel={actions.closeDialog}
        onConfirm={actions.deleteAuction}
      />
    </>
  );
}
