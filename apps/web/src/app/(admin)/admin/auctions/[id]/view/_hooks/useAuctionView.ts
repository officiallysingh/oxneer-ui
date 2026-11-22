'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  auctionsApi,
  type AuctionVM,
  type AuctionWorkflowStep,
  type PolicyItemRQ,
} from '@oxneer/api';
import { toast } from '@oxneer/ui';
import { parseApiError } from '@/lib/api-errors';
import { mapAuctionToWizardState } from '../../../_lib/wizard/editWizardMapping';
import type { WizardState } from '../../../_lib/wizard/types';
import { isPostStep } from '../../../_lib/wizard/workflow';
import { useParticipants } from '../../../_components/wizard/invite/useParticipants';

export interface AuctionViewData {
  auction: AuctionVM;
  policies: PolicyItemRQ[];
  /** The saved auction mapped into the wizard's shape, so the view can reuse
   *  the wizard's plain-language helpers. */
  state: WizardState;
  preSteps: AuctionWorkflowStep[];
  postSteps: AuctionWorkflowStep[];
}

type LoadResult = { id: string; data: AuctionViewData | null; error: string | null };

const NO_STEPS: AuctionWorkflowStep[] = [];

function byOrder(a: AuctionWorkflowStep, b: AuctionWorkflowStep): number {
  return (a.order ?? 0) - (b.order ?? 0);
}

async function loadAuctionView(id: string): Promise<AuctionViewData> {
  const [auction, policies, workflow] = await Promise.all([
    auctionsApi.getAuctionById(id, ['*']),
    auctionsApi.getAuctionPolicies(id).catch(() => [] as PolicyItemRQ[]),
    auctionsApi.getAuctionWorkflow(id).catch(() => [] as AuctionWorkflowStep[]),
  ]);
  const steps = [...workflow].sort(byOrder);
  return {
    auction,
    policies,
    state: mapAuctionToWizardState(auction, policies).state,
    preSteps: steps.filter((step) => !isPostStep(step)),
    postSteps: steps.filter(isPostStep),
  };
}

/** Everything the auction view shows: the auction, its rules and workflow, and
 *  the people invited to it. */
export function useAuctionView(id: string) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);
  // The auction id whose data is on screen, so a failed reload can keep it.
  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    loadAuctionView(id)
      .then((data) => {
        if (!active) return;
        loadedIdRef.current = id;
        setResult({ id, data, error: null });
      })
      .catch((err) => {
        if (!active) return;
        if (loadedIdRef.current === id) {
          toast.error('Couldn’t refresh the auction. Showing the last loaded version.');
          return;
        }
        setResult({
          id,
          data: null,
          error: parseApiError(err).general ?? 'Could not load the auction.',
        });
      });
    return () => {
      active = false;
    };
  }, [id, version]);

  // A result for another auction id counts as still loading.
  const current = result?.id === id ? result : null;
  const data = current?.data ?? null;

  const participants = useParticipants(
    id,
    data?.preSteps ?? NO_STEPS,
    data?.state.basics.direction ?? 'FORWARD',
  );

  const { refresh: refreshParticipants } = participants;
  const reload = useCallback(() => {
    setVersion((value) => value + 1);
    void refreshParticipants();
  }, [refreshParticipants]);

  return {
    data,
    loading: !current,
    error: current?.error ?? null,
    participants,
    reload,
  };
}

export type AuctionViewController = ReturnType<typeof useAuctionView>;
