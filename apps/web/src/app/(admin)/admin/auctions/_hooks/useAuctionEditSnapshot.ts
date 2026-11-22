'use client';

import { useEffect, useState } from 'react';
import { auctionsApi, type PolicyItemRQ } from '@repo/api';
import { parseApiError } from '@/lib/api-errors';
import { mapAuctionToWizardState, type EditWizardSnapshot } from '../_lib/wizard/editWizardMapping';
import { isPostStep } from '../_lib/wizard/workflow';

export interface LoadedAuction {
  snapshot: EditWizardSnapshot;
  savedPolicies: PolicyItemRQ[];
  workflowCounts: { pre: number; post: number };
}

type LoadResult = { id: string; data: LoadedAuction | null; error: string | null };

/** Loads an existing auction, its policies and its workflow, and maps them into
 *  the wizard's state so the edit route can reuse the create wizard as is. */
export function useAuctionEditSnapshot(id: string) {
  const [result, setResult] = useState<LoadResult | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      auctionsApi.getAuctionById(id, ['*']),
      auctionsApi.getAuctionPolicies(id).catch(() => [] as PolicyItemRQ[]),
      auctionsApi.getAuctionWorkflow(id).catch(() => []),
    ])
      .then(([auction, savedPolicies, workflow]) => {
        if (!active) return;
        setResult({
          id,
          error: null,
          data: {
            snapshot: mapAuctionToWizardState(auction, savedPolicies),
            savedPolicies,
            workflowCounts: {
              pre: workflow.filter((step) => !isPostStep(step)).length,
              post: workflow.filter(isPostStep).length,
            },
          },
        });
      })
      .catch((err) => {
        if (!active) return;
        setResult({
          id,
          data: null,
          error: parseApiError(err).general ?? 'Could not load the auction.',
        });
      });

    return () => {
      active = false;
    };
  }, [id]);

  // A result for a previous id counts as still loading.
  const current = result?.id === id ? result : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: !current };
}
