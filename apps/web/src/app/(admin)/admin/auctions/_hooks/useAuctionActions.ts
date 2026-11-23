'use client';

import { useState } from 'react';
import { auctionsApi, getApiErrorMessage, type AuctionVM } from '@oxneer/api';
import { toast } from '@oxneer/ui';
import { auctionTitle } from '../_lib/auction-display';

interface AuctionActionsOptions {
  /** Apply a successful status change to locally held auction data. */
  onUpdated?: (id: string, patch: Partial<AuctionVM>) => void;
  onDeleted?: (id: string) => void;
  /** Called after any change that moves an auction between status tabs. */
  onStatusChanged?: () => void;
}

/** Publish, cancel and delete for the auctions list, with busy state and toasts.
 *  Each resolves true on success so a confirmation dialog knows to close. */
export function useAuctionActions({
  onUpdated,
  onDeleted,
  onStatusChanged,
}: AuctionActionsOptions = {}) {
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());

  const track = (id: string, busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });

  const run = async (
    auction: AuctionVM,
    request: () => Promise<void>,
    success: string,
    failure: string,
  ): Promise<boolean> => {
    track(auction.id, true);
    try {
      await request();
      toast.success(success);
      return true;
    } catch (err) {
      // e.g. AUCTION_SETUP_INCOMPLETE names the setup steps still missing.
      toast.error(getApiErrorMessage(err, failure));
      return false;
    } finally {
      track(auction.id, false);
    }
  };

  const publish = async (auction: AuctionVM) => {
    const done = await run(
      auction,
      () => auctionsApi.publishAuction(auction.id),
      `Published “${auctionTitle(auction)}”`,
      'Couldn’t publish the auction. Please try again.',
    );
    if (done) {
      onUpdated?.(auction.id, { status: 'PUBLISHED' });
      onStatusChanged?.();
    }
    return done;
  };

  const cancel = async (auction: AuctionVM, reason: string) => {
    const done = await run(
      auction,
      () => auctionsApi.cancelAuction(auction.id, reason),
      `Cancelled “${auctionTitle(auction)}”`,
      'Couldn’t cancel the auction. Please try again.',
    );
    if (done) {
      onUpdated?.(auction.id, { status: 'CANCELLED' });
      onStatusChanged?.();
    }
    return done;
  };

  const remove = async (auction: AuctionVM) => {
    const done = await run(
      auction,
      () => auctionsApi.deleteAuction(auction.id),
      `Deleted “${auctionTitle(auction)}”`,
      'Couldn’t delete the auction. Please try again.',
    );
    if (done) {
      onDeleted?.(auction.id);
      onStatusChanged?.();
    }
    return done;
  };

  return { busyIds, publish, cancel, remove };
}
