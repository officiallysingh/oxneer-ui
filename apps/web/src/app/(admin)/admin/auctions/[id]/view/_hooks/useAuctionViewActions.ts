'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auctionsApi, participantsApi } from '@oxneer/api';
import { toast } from '@oxneer/ui';
import { parseApiError } from '@/lib/api-errors';
import type { ParticipantView } from '../../../_components/wizard/invite/invite';

export type PendingAction = 'cancel' | 'delete' | null;

function errorMessage(err: unknown, fallback: string): string {
  return parseApiError(err).general ?? fallback;
}

/** Header and participant actions on the view page, with their busy state. */
export function useAuctionViewActions(auctionId: string, onChanged: () => void) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(auctionId);
      toast.success('Copied the auction ID');
    } catch {
      toast.error('Couldn’t copy the ID. Select it and copy it by hand.');
    }
  };

  const cancelAuction = async (reason: string): Promise<boolean> => {
    try {
      await auctionsApi.cancelAuction(auctionId, reason);
      toast.success('Cancelled the auction');
      setPending(null);
      onChanged();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn’t cancel the auction. Please try again.'));
      return false;
    }
  };

  const deleteAuction = async (): Promise<boolean> => {
    try {
      await auctionsApi.deleteAuction(auctionId);
      toast.success('Deleted the auction');
      router.push('/admin/auctions');
      return true;
    } catch (err) {
      toast.error(errorMessage(err, 'Couldn’t delete the auction. Please try again.'));
      return false;
    }
  };

  /** Sends the invitation again to people who haven't replied: one request
   *  each (the API invites one person at a time), reported once. */
  const resendInvitations = async (views: ParticipantView[]) => {
    const ids = views.map((view) => view.participant.id);
    setResendingIds((current) => new Set([...current, ...ids]));
    const results = await Promise.allSettled(
      views.map((view) =>
        participantsApi.inviteParticipant(auctionId, {
          emailId: view.email,
          mobileNo: view.mobile,
          forceReInvite: true,
        }),
      ),
    );
    setResendingIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    const failed = results.filter((result) => result.status === 'rejected').length;
    const sent = results.length - failed;
    if (sent)
      toast.success(`Sent the invitation again to ${sent === 1 ? '1 person' : `${sent} people`}`);
    if (failed)
      toast.error(
        `Couldn’t resend to ${failed === 1 ? '1 person' : `${failed} people`}. Please try again.`,
      );
  };

  return {
    pending,
    resendInvitations,
    requestCancel: () => setPending('cancel'),
    requestDelete: () => setPending('delete'),
    closeDialog: () => setPending(null),
    cancelAuction,
    deleteAuction,
    copyId,
    resendingIds,
  };
}

export type AuctionViewActions = ReturnType<typeof useAuctionViewActions>;
