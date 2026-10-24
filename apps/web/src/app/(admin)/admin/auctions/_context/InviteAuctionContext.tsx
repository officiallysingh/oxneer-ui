'use client';

import { createContext, useContext, type ReactNode } from 'react';

/** The part of an auction that the invitation workspace needs. Both the new
 *  auction wizard and the edit screen can build this, so the same Step 7 UI is
 *  used in both places. */
export interface InviteParticipation {
  minimumEnabled: boolean;
  minimumCount: string;
  checkDays: string;
  checkHours: string;
  checkMinutes: string;
}

export interface InviteAuctionContextValue {
  auctionId: string;
  isPublic: boolean;
  published: boolean;
  /** Unknown while an edit screen is still deciding whether it is publishable. */
  readyToPublish?: boolean;
  startTime: string;
  participation: InviteParticipation;
}

const InviteAuctionContext = createContext<InviteAuctionContextValue | null>(null);

export function InviteAuctionProvider({
  value,
  children,
}: {
  value: InviteAuctionContextValue;
  children: ReactNode;
}) {
  return <InviteAuctionContext.Provider value={value}>{children}</InviteAuctionContext.Provider>;
}

export function useInviteAuction(): InviteAuctionContextValue {
  const value = useContext(InviteAuctionContext);
  if (!value) {
    throw new Error('useInviteAuction must be used inside InviteAuctionProvider');
  }
  return value;
}
