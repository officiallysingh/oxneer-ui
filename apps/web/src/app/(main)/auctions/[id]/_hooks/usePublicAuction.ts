'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auctionsApi, participantsApi, type AuctionVM, type ParticipantVM } from '@oxneer/api';
import { toast } from '@oxneer/ui';
import { isStatusDone } from '@/components/common/workflow-steps';
import { useAuthStore } from '@/store/authStore';

function httpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

/** The public auction, the signed-in user's participation in it, and joining it. */
export function usePublicAuction(id: string) {
  const router = useRouter();
  const { user } = useAuthStore();
  const isLoggedIn = !!user?.authenticated;

  const [auction, setAuction] = useState<AuctionVM | null>(null);
  const [participant, setParticipant] = useState<ParticipantVM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [justJoined, setJustJoined] = useState(false);

  const loadParticipant = useCallback(
    () => participantsApi.getSelfParticipant(id).catch(() => null),
    [id],
  );

  const load = useCallback(async () => {
    try {
      // The public detail carries the workflow; /auctions/{id}/workflow is admin-only.
      const [auctionData, self] = await Promise.all([
        auctionsApi.getPublicAuctionById(id),
        isLoggedIn ? loadParticipant() : Promise.resolve(null),
      ]);
      setAuction(auctionData);
      setParticipant(self);
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404) {
        setError('This auction doesn’t exist, or it is no longer open to the public.');
      } else if (status !== 401 && status !== 403) {
        setError('We couldn’t load this auction. Please try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  }, [id, isLoggedIn, loadParticipant]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshParticipant = async () => setParticipant(await loadParticipant());

  const join = async () => {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=/auctions/${id}`);
      return;
    }
    setJoining(true);
    try {
      await participantsApi.createSelfParticipant(id);
      await refreshParticipant();
      setJustJoined(true);
      toast.success('You’ve joined this auction');
    } catch (err) {
      if (httpStatus(err) === 409) {
        await refreshParticipant();
        toast.success('You’re already registered for this auction');
      } else {
        toast.error('Couldn’t join the auction. Please try again.');
      }
    } finally {
      setJoining(false);
    }
  };

  const steps = Object.values(participant?.workflowStatus ?? {});
  const hasSteps = steps.length > 0;
  const allStepsDone = hasSteps && steps.every(isStatusDone);

  return {
    auction,
    participant,
    isLoggedIn,
    loading,
    error,
    joining,
    justJoined,
    hasSteps,
    allStepsDone,
    join,
    refreshParticipant,
  };
}

export type PublicAuctionState = ReturnType<typeof usePublicAuction>;
