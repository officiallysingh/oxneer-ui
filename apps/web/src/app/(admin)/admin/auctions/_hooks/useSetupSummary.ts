'use client';

import { useEffect, useState } from 'react';
import { auctionsApi, type AuctionSetupSummary, type SetupStepKey } from '@repo/api';

/** Wizard step number → the API's setup step. Review (6) and Invite (7) have none. */
export const SETUP_STEP_KEY: Record<number, SetupStepKey> = {
  1: 'BASICS_AND_UNIT',
  2: 'OFFER_RULES',
  3: 'SCHEDULE_AND_CLOSING',
  4: 'PARTICIPATION',
  5: 'AWARD',
};

export interface SetupSummaryState {
  summary: AuctionSetupSummary | null;
  /** True only for the first load; later reloads keep showing the last summary. */
  loading: boolean;
  error: boolean;
}

/** The server's view of each setup step (`GET /{id}/setup-summary`). One call
 *  covers every step, because a change in one step can change another's
 *  findings (e.g. the offer mechanism decides whether a soft close fits).
 *  Reloads whenever `refreshKey` changes: the wizard passes the current step
 *  and the last save time, so it's fresh after each save and step change. */
export function useSetupSummary(auctionId: string | null, refreshKey: string): SetupSummaryState {
  const [summary, setSummary] = useState<AuctionSetupSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(auctionId));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!auctionId) return;
    let active = true;
    auctionsApi
      .getSetupSummary(auctionId)
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setError(false);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [auctionId, refreshKey]);

  return { summary, loading, error };
}
