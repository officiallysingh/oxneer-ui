'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { auctionsApi, blobsApi, type AuctionWorkflowStep } from '@repo/api';
import { parseApiError } from '@/lib/api-errors';
import { isPostStep } from '../_lib/wizard/workflow';
import {
  emptyDraft,
  toAddRequest,
  toUpdateRequest,
  type StepDraft,
} from '../_lib/wizard/stepDraft';

async function uploadTerms(draft: StepDraft): Promise<string | undefined> {
  if (draft.type !== 'TNC_FORM_STEP' || draft.tncSource !== 'DOCUMENT' || !draft.tncFile) {
    return undefined;
  }
  const blob = await blobsApi.upload(draft.tncFile, {
    bucket: 'auction-workflow',
    classifier: 'DOCUMENT',
  });
  return blob.id || undefined;
}

/** The auction's workflow steps, with the add/edit/delete/reorder actions the
 *  inline step editors need. Every change reloads the list from the server. */
export function useWorkflow(auctionId: string) {
  const [steps, setSteps] = useState<AuctionWorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Reloads the steps and returns them, sorted, for callers that act on the result. */
  const load = useCallback(async (): Promise<AuctionWorkflowStep[]> => {
    setError(null);
    try {
      const data = await auctionsApi.getAuctionWorkflow(auctionId);
      const sorted = [...data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setSteps(sorted);
      return sorted;
    } catch (err) {
      setError(parseApiError(err).summary);
      return [];
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pre = useMemo(() => steps.filter((step) => !isPostStep(step)), [steps]);
  const post = useMemo(() => steps.filter(isPostStep), [steps]);

  /** Saves a new step at `order`. Throws the API message so the editor can show it. */
  const add = async (draft: StepDraft, order: number) => {
    const tncBlobId = await uploadTerms(draft);
    await auctionsApi.addWorkflowStep(auctionId, toAddRequest(draft, order, tncBlobId));
    return load();
  };

  const update = async (step: AuctionWorkflowStep, draft: StepDraft) => {
    const tncBlobId = step.implicit ? undefined : await uploadTerms(draft);
    await auctionsApi.updateWorkflowStep(
      auctionId,
      step.id,
      toUpdateRequest(draft, step, tncBlobId),
    );
    return load();
  };

  /** Adds a Bank details step right where `order` is, so a refundable payment
   *  saved after it has somewhere to send refunds. Returns the reloaded steps. */
  const addBankBefore = (order: number) =>
    add(emptyDraft('BANK_DETAIL_FORM_STEP', 'PRE_AUCTION'), order);

  const remove = async (step: AuctionWorkflowStep) => {
    try {
      await auctionsApi.deleteWorkflowStep(auctionId, step.id);
      await load();
    } catch (err) {
      setError(parseApiError(err).summary);
    }
  };

  /** Swaps a step with its neighbour inside its own phase. Pre-auction steps
   *  always come before post-auction ones. */
  const move = async (step: AuctionWorkflowStep, dir: -1 | 1) => {
    const phase = isPostStep(step) ? post : pre;
    const index = phase.findIndex((item) => item.id === step.id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= phase.length) return;
    const reordered = [...phase];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    const all = isPostStep(step) ? [...pre, ...reordered] : [...reordered, ...post];
    const order: Record<string, number> = {};
    all.forEach((item, i) => {
      order[item.id] = i + 1;
    });
    try {
      await auctionsApi.reorderWorkflowSteps(auctionId, order);
    } catch (err) {
      setError(parseApiError(err).summary);
    } finally {
      await load();
    }
  };

  return {
    steps,
    pre,
    post,
    loading,
    error,
    setError,
    reload: load,
    add,
    update,
    addBankBefore,
    remove,
    move,
  };
}

export type WorkflowController = ReturnType<typeof useWorkflow>;
