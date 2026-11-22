'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auctionsApi, blobsApi, type AuctionWorkflowStep, type WorkflowStepPhase } from '@repo/api';
import { parseApiError } from '@/lib/api-errors';
import { isPostStep } from '../_lib/wizard/workflow';
import {
  emptyDraft,
  toAddRequest,
  toUpdateRequest,
  type StepDraft,
} from '../_lib/wizard/stepDraft';
import {
  EMPTY_PENDING_STEPS,
  isPendingStep,
  pendingStep,
  renumber,
  type PendingStep,
  type PendingSteps,
} from '../_lib/wizard/pendingSteps';

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

/** Steps of a phase whose setup call hasn't been made yet are kept as drafts
 *  (see `pendingSteps.ts`) and saved with that call. */
export interface WorkflowDrafts {
  /** True for each phase whose steps are still drafts. */
  draft: Record<WorkflowStepPhase, boolean>;
  steps: PendingSteps;
  onChange: (steps: PendingSteps) => void;
}

const bySavedOrder = (a: AuctionWorkflowStep, b: AuctionWorkflowStep) =>
  (a.order ?? 0) - (b.order ?? 0);

/** The auction's workflow steps, with the add/edit/delete/reorder actions the
 *  inline step editors need. Saved steps reload from the server after every
 *  change; draft steps change in place.
 *
 *  `order` arguments are positions in the whole list (before-auction steps
 *  first), as the editors count them; the API numbers each phase from 1. */
export function useWorkflow(auctionId: string, drafts?: WorkflowDrafts) {
  const [saved, setSaved] = useState<AuctionWorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handlers can run several actions in a row (add bank details, then the
  // payment) before the parent re-renders, so they read the latest drafts here.
  const pendingRef = useRef<PendingSteps>(drafts?.steps ?? EMPTY_PENDING_STEPS);
  pendingRef.current = drafts?.steps ?? EMPTY_PENDING_STEPS;
  const isDraft = (phase: WorkflowStepPhase) => Boolean(drafts?.draft[phase]);

  /** Reloads the saved steps and returns them, sorted, for callers that act on the result. */
  const load = useCallback(async (): Promise<AuctionWorkflowStep[]> => {
    setError(null);
    try {
      const data = await auctionsApi.getAuctionWorkflow(auctionId);
      const sorted = [...data].sort(bySavedOrder);
      setSaved(sorted);
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

  const merge = (
    savedSteps: AuctionWorkflowStep[],
    pending: PendingSteps,
  ): { pre: AuctionWorkflowStep[]; post: AuctionWorkflowStep[] } => ({
    pre: isDraft('PRE_AUCTION')
      ? pending.PRE_AUCTION
      : savedSteps.filter((step) => !isPostStep(step)),
    post: isDraft('POST_AUCTION') ? pending.POST_AUCTION : savedSteps.filter(isPostStep),
  });

  const draftPre = drafts?.draft.PRE_AUCTION;
  const draftPost = drafts?.draft.POST_AUCTION;
  const pendingSteps = drafts?.steps;
  const { pre, post } = useMemo(
    () => merge(saved, pendingSteps ?? EMPTY_PENDING_STEPS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saved, pendingSteps, draftPre, draftPost],
  );
  const steps = useMemo(() => [...pre, ...post], [pre, post]);

  /** Position in the whole list → place in its phase (1-based). */
  const phaseOrder = (phase: WorkflowStepPhase, order: number, preCount: number) =>
    phase === 'POST_AUCTION' ? Math.max(1, order - preCount) : order;

  /** Updates one phase's drafts and returns the whole list as it now stands. */
  const changeDrafts = (phase: WorkflowStepPhase, next: PendingStep[]) => {
    const pending = { ...pendingRef.current, [phase]: renumber(next) };
    pendingRef.current = pending;
    drafts?.onChange(pending);
    const merged = merge(saved, pending);
    return [...merged.pre, ...merged.post];
  };

  /** Adds a new step at `order`. Throws the API message so the editor can show it. */
  const add = async (draft: StepDraft, order: number): Promise<AuctionWorkflowStep[]> => {
    const { phase } = draft;
    const tncBlobId = await uploadTerms(draft);
    const preCount = merge(saved, pendingRef.current).pre.length;
    const place = phaseOrder(phase, order, preCount);
    if (isDraft(phase)) {
      const list = [...pendingRef.current[phase]];
      list.splice(place - 1, 0, pendingStep(toAddRequest(draft, place, tncBlobId), phase));
      return changeDrafts(phase, list);
    }
    await auctionsApi.addWorkflowStep(auctionId, toAddRequest(draft, place, tncBlobId));
    return load();
  };

  const update = async (
    step: AuctionWorkflowStep,
    draft: StepDraft,
  ): Promise<AuctionWorkflowStep[]> => {
    const tncBlobId = step.implicit ? undefined : await uploadTerms(draft);
    if (isPendingStep(step)) {
      // The step stays in the list it was drafted in.
      const phase: WorkflowStepPhase = isPostStep(step) ? 'POST_AUCTION' : 'PRE_AUCTION';
      const keepBlob = 'tncBlobId' in step.request ? step.request.tncBlobId : undefined;
      const request = toAddRequest(draft, step.order ?? 1, tncBlobId ?? keepBlob);
      const list = pendingRef.current[phase].map((item) =>
        item.id === step.id ? pendingStep(request, phase, step.id) : item,
      );
      return changeDrafts(phase, list);
    }
    await auctionsApi.updateWorkflowStep(
      auctionId,
      step.id,
      toUpdateRequest(draft, step, tncBlobId),
    );
    return load();
  };

  /** Adds a Bank details step right where `order` is, so a refundable payment
   *  saved after it has somewhere to send refunds. Returns the updated steps. */
  const addBankBefore = (order: number) =>
    add(emptyDraft('BANK_DETAIL_FORM_STEP', 'PRE_AUCTION'), order);

  const remove = async (step: AuctionWorkflowStep) => {
    if (isPendingStep(step)) {
      const phase: WorkflowStepPhase = isPostStep(step) ? 'POST_AUCTION' : 'PRE_AUCTION';
      changeDrafts(
        phase,
        pendingRef.current[phase].filter((item) => item.id !== step.id),
      );
      return;
    }
    try {
      await auctionsApi.deleteWorkflowStep(auctionId, step.id);
      await load();
    } catch (err) {
      setError(parseApiError(err).summary);
    }
  };

  /** Puts one phase's steps in the given order (step ids). */
  const arrange = async (postPhase: boolean, ids: string[]) => {
    const phase: WorkflowStepPhase = postPhase ? 'POST_AUCTION' : 'PRE_AUCTION';
    if (isDraft(phase)) {
      const byId = new Map(pendingRef.current[phase].map((step) => [step.id, step]));
      changeDrafts(
        phase,
        ids.map((id) => byId.get(id)).filter((step): step is PendingStep => Boolean(step)),
      );
      return;
    }
    // Each phase is numbered from 1 on its own.
    const order: Record<string, number> = {};
    ids.forEach((id, i) => {
      order[id] = i + 1;
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
    arrange,
  };
}

export type WorkflowController = ReturnType<typeof useWorkflow>;
