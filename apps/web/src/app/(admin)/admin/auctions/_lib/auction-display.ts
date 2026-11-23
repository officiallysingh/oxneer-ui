import type { AuctionVM } from '@oxneer/api';
import { resolveStr } from '@/components/common/admin/format';

/** What an admin may do to an auction in its current status. Mirrors the API:
 *  updates are allowed only before publishing (`SimpleAuctionVM.isUpdateAllowed`),
 *  delete only for a draft or scheduled auction, cancel only for a published one
 *  (AUCTION_CANCEL_NOT_ALLOWED otherwise). */
export interface AuctionPermittedActions {
  edit: boolean;
  schedule: boolean;
  publish: boolean;
  cancel: boolean;
  delete: boolean;
}

export function auctionStatus(auction: Pick<AuctionVM, 'status'>): string {
  return resolveStr(auction.status).toUpperCase();
}

export function permittedActions(auction: Pick<AuctionVM, 'status'>): AuctionPermittedActions {
  const status = auctionStatus(auction);
  const beforePublish = status === 'DRAFT' || status === 'SCHEDULED';
  return {
    edit: beforePublish,
    schedule: status === 'DRAFT',
    publish: status === 'SCHEDULED',
    cancel: status === 'PUBLISHED',
    delete: beforePublish,
  };
}

export function auctionTitle(auction: Pick<AuctionVM, 'title'>): string {
  return auction.title?.trim() || 'Untitled auction';
}

export function auctionCurrency(auction: Pick<AuctionVM, 'regionalSettings'>): string {
  return resolveStr(auction.regionalSettings?.currency) || 'INR';
}

/** Opening price of the auction's unit, when it has been set up. */
export function openingPrice(auction: Pick<AuctionVM, 'unit'>): number | undefined {
  const price = auction.unit?.openingPrice;
  return typeof price === 'number' ? price : undefined;
}

export function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}
