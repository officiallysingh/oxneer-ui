'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  auctionsApi,
  type AddWorkflowStepRQ,
  type AuctionWorkflowStep,
  type PolicyHeadRQ,
} from '@repo/api';
import { AddStepDialog } from '../../../_components/AddStepDialog';
import { EditStepDialog } from '../../../_components/EditStepDialog';
import { StepTypeIcon } from '../../../_components/WorkflowStepDetails';
import { fmtLabel, paymentStepData, resolveStr } from '../../../_components/PolicyShared';
import Tip from '@/components/common/admin/Tip';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { parseApiError } from '@/lib/api-errors';
import {
  WORKFLOW_TYPE_LABEL,
  headsSummary,
  isPostStep,
  postDeadlineFor,
  stepTitle,
} from '../../../_lib/wizard/workflow';

/** Owns the post-auction workflow: loading, ordering, CRUD dialogs and the
 *  compact list shown at the bottom of the Award step. It reports the count and
 *  payment heads so the winning-price example can include charges. */
export function PostAuctionSteps({
  auctionId,
  closeLabel,
  currencyUnit,
  onWorkflowChange,
}: {
  auctionId: string;
  closeLabel: string;
  currencyUnit: string;
  onWorkflowChange: (count: number, paymentHeads: PolicyHeadRQ[]) => void;
}) {
  const [allSteps, setAllSteps] = useState<AuctionWorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AuctionWorkflowStep | null>(null);
  const [deleting, setDeleting] = useState<AuctionWorkflowStep | null>(null);

  // The parent callback may be recreated on every render; the ref keeps `load`
  // stable so it does not refetch in a loop.
  const onWorkflowChangeRef = useRef(onWorkflowChange);
  useEffect(() => {
    onWorkflowChangeRef.current = onWorkflowChange;
  }, [onWorkflowChange]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const steps = await auctionsApi.getAuctionWorkflow(auctionId);
      const sorted = [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setAllSteps(sorted);
      const post = sorted.filter(isPostStep);
      const paymentHeads = post
        .filter((step) => resolveStr(step.type) === 'PAYMENT_STEP')
        .flatMap((step) => paymentStepData(step).heads);
      onWorkflowChangeRef.current(post.length, paymentHeads);
    } catch (err) {
      setError(parseApiError(err).general ?? 'Could not load the post-auction steps.');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const postSteps = useMemo(() => allSteps.filter(isPostStep), [allSteps]);
  const hasTnC = allSteps.some((step) => resolveStr(step.type) === 'TNC_FORM_STEP');
  const hasBank = allSteps.some((step) => resolveStr(step.type) === 'BANK_DETAIL_FORM_STEP');
  const hasParticipation = allSteps.some(
    (step) => resolveStr(step.type) === 'PARTICIPATION_FORM_STEP',
  );

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= postSteps.length) return;
    const reordered = [...postSteps];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    const preOrders = allSteps.filter((step) => !isPostStep(step)).map((step) => step.order ?? 0);
    const base = Math.max(0, ...preOrders);
    const order: Record<string, number> = {};
    reordered.forEach((step, i) => {
      order[step.id] = base + i + 1;
    });
    setAllSteps((prev) =>
      prev.map((step) => (order[step.id] ? { ...step, order: order[step.id] } : step)),
    );
    try {
      await auctionsApi.reorderWorkflowSteps(auctionId, order);
    } catch (err) {
      setError(parseApiError(err).general ?? 'Could not reorder the steps.');
      void load();
    }
  };

  const handleAdd = async (step: AddWorkflowStepRQ) => {
    try {
      const nextOrder = Math.max(0, ...allSteps.map((item) => item.order ?? 0)) + 1;
      await auctionsApi.addWorkflowStep(auctionId, { ...step, order: nextOrder });
      setAddOpen(false);
      await load();
    } catch (err) {
      setError(parseApiError(err).general ?? 'Could not add the step.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await auctionsApi.deleteWorkflowStep(auctionId, deleting.id);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(parseApiError(err).general ?? 'Could not delete the step.');
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-border bg-muted/20">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success">
            <Check className="h-3 w-3" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">After the auction</p>
            <p className="text-[11px] text-muted-foreground">
              {postSteps.length} workflow step{postSteps.length === 1 ? '' : 's'} · winner only
            </p>
          </div>
          <span className="ml-auto text-[10px] text-muted-foreground">
            from the close · {closeLabel}
          </span>
        </div>

        <div className="space-y-2 p-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading steps…
            </div>
          ) : postSteps.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              No steps after the auction yet. Add a payment step to collect the winning amount.
            </p>
          ) : (
            postSteps.map((step, index) => {
              const data = paymentStepData(step);
              const isPayment = resolveStr(step.type) === 'PAYMENT_STEP';
              return (
                <div
                  key={step.id}
                  className="rounded-md border border-border bg-background px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <StepTypeIcon type={step.type} className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">{stepTitle(step)}</span>
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {isPayment
                        ? 'Payment'
                        : (WORKFLOW_TYPE_LABEL[resolveStr(step.type)] ?? 'Step')}
                    </span>
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Required
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      {isPayment && data.heads.length > 0 && (
                        <span className="hidden text-[10px] text-muted-foreground sm:inline">
                          {fmtLabel(data.mode) || 'Offline'} ·{' '}
                          {headsSummary(data.heads, currencyUnit)}
                        </span>
                      )}
                      <div className="flex items-center gap-0.5">
                        <Tip label="Move up">
                          <button
                            type="button"
                            onClick={() => void move(index, -1)}
                            disabled={index === 0}
                            aria-label={`Move ${stepTitle(step)} up`}
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                          >
                            ↑
                          </button>
                        </Tip>
                        <Tip label="Move down">
                          <button
                            type="button"
                            onClick={() => void move(index, 1)}
                            disabled={index === postSteps.length - 1}
                            aria-label={`Move ${stepTitle(step)} down`}
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </Tip>
                        <Tip label="Edit step">
                          <button
                            type="button"
                            onClick={() => setEditing(step)}
                            aria-label={`Edit ${stepTitle(step)}`}
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </Tip>
                        {!step.implicit && (
                          <Tip label="Delete step">
                            <button
                              type="button"
                              onClick={() => setDeleting(step)}
                              aria-label={`Delete ${stepTitle(step)}`}
                              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </Tip>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-7 text-[10px] text-muted-foreground">
                    <span>{postDeadlineFor(step)}</span>
                    {isPayment && data.heads.length > 0 && (
                      <span className="sm:hidden">{headsSummary(data.heads, currencyUnit)}</span>
                    )}
                    {resolveStr(step.type) === 'BANK_DETAIL_FORM_STEP' && (
                      <span>Bank name · IFSC · Account number</span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add a step after the auction
          </button>

          {error && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
              {error}
            </p>
          )}
        </div>
      </section>

      <AddStepDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        insertionOrder={Math.max(0, ...allSteps.map((step) => step.order ?? 0)) + 1}
        hasTnCStep={hasTnC}
        hasBankDetailStep={hasBank}
        hasParticipationFormStep={hasParticipation}
        workflow={allSteps}
        onAdd={handleAdd}
      />
      <EditStepDialog
        auctionId={auctionId}
        step={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={() => {
          setEditing(null);
          void load();
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting ? stepTitle(deleting) : 'step'}?`}
        description="The winner will no longer be asked to complete this step."
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
