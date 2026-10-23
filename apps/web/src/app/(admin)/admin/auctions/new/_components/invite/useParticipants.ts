'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { participantsApi, type AuctionWorkflowStep, type ParticipantVM } from '@repo/api';
import { parseApiError } from '@/lib/api-errors';
import { buildParticipantViews, inviteCounts } from './invite';

/** Loads everyone invited to the auction and derives the review-friendly view
 *  models used by the Step 7 invitation screen. */
export function useParticipants(auctionId: string, preSteps: AuctionWorkflowStep[]) {
  const [participants, setParticipants] = useState<ParticipantVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await participantsApi.getAllParticipants(auctionId, {
        page: 0,
        size: 100,
      });
      setParticipants(result.content ?? []);
    } catch (err) {
      setError(parseApiError(err).general ?? 'Could not load participants.');
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const views = useMemo(
    () => buildParticipantViews(participants, preSteps),
    [participants, preSteps],
  );

  const counts = useMemo(() => inviteCounts(views), [views]);

  return { participants, views, counts, loading, error, refresh };
}
