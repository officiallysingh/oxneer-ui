'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { Button } from '@repo/ui';
import { auctionsApi, type AddWorkflowStepRQ, type AuctionWorkflowStep } from '@repo/api';
import { AddStepDialog } from '../../../_components/AddStepDialog';
import { EditStepDialog } from '../../../_components/EditStepDialog';
import { StepTypeIcon } from '../../../_components/WorkflowStepDetails';
import { fmtLabel, paymentStepData, resolveStr } from '../../../_components/PolicyShared';
import Tip from '@/components/common/admin/Tip';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { parseApiError } from '@/lib/api-errors';
import type { ParticipationState } from '../../../_lib/wizard/types';
import { Field, InfoNote, MutedNote, PolicyBadge, WizardRow, inputClass } from '../ui/wizard-ui';
import { formatDateTime, minimumCheckAt } from '../../../_lib/wizard/summary';
import { WORKFLOW_TYPE_LABEL, headsSummary, stepTitle } from '../../../_lib/wizard/workflow';

function offsetLabel(step: AuctionWorkflowStep): string {
  const type = resolveStr(step.type);
  const offset =
    type === 'PARTICIPATION_FORM_STEP'
      ? step.preStartDeadlineDuration
      : type === 'PAYMENT_STEP'
        ? step.offset
        : undefined;
  if (!offset) return '';
  if (type === 'TNC_FORM_STEP') return 'No deadline of its own';
  const days = offset.match(/(\d+)D/);
  const hours = offset.match(/(\d+)H/);
  const minutes = offset.match(/(\d+)M/);
  const parts = [
    days ? `${days[1]} d` : '',
    hours ? `${hours[1]} h` : '',
    minutes ? `${minutes[1]} min` : '',
  ].filter(Boolean);
  if (!parts.length) return '';
  return `${parts.join(' ')} before start`;
}

function stepMeta(step: AuctionWorkflowStep): string {
  const type = resolveStr(step.type);
  if (type === 'TNC_FORM_STEP') {
    return step.tncText ? 'Edited in place · tick to accept' : 'Document · tick to accept';
  }
  if (type === 'PARTICIPATION_FORM_STEP') {
    return step.manualApproval ? 'You approve each one' : 'Anyone who submits can bid';
  }
  if (type === 'BANK_DETAIL_FORM_STEP') return '4 fixed fields · for deposit refunds';
  if (type === 'PAYMENT_STEP') {
    const data = paymentStepData(step);
    return `${fmtLabel(data.mode) || 'Online'} · ${headsSummary(data.heads)}`;
  }
  const properties = step.embedded?.properties ?? [];
  return properties.length ? `${properties.length} fields` : 'Custom form';
}

export function Step4Participation({
  auctionId,
  form,
  onChange,
  isPrivate,
  startTime,
  onWorkflowCountChange,
}: {
  auctionId: string;
  form: ParticipationState;
  onChange: (patch: Partial<ParticipationState>) => void;
  isPrivate: boolean;
  startTime: string;
  onWorkflowCountChange: (count: number) => void;
}) {
  const [workflow, setWorkflow] = useState<AuctionWorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AuctionWorkflowStep | null>(null);
  const [deleting, setDeleting] = useState<AuctionWorkflowStep | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const steps = await auctionsApi.getAuctionWorkflow(auctionId);
      const sorted = [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setWorkflow(sorted);
      onWorkflowCountChange(
        sorted.filter((step) => resolveStr(step.phase) !== 'POST_AUCTION').length,
      );
    } catch (err) {
      setError(parseApiError(err).general ?? 'Could not load the participation steps.');
    } finally {
      setLoading(false);
    }
  }, [auctionId, onWorkflowCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasTnC = workflow.some((step) => resolveStr(step.type) === 'TNC_FORM_STEP');
  const hasBank = workflow.some((step) => resolveStr(step.type) === 'BANK_DETAIL_FORM_STEP');
  const hasParticipation = workflow.some(
    (step) => resolveStr(step.type) === 'PARTICIPATION_FORM_STEP',
  );

  const checkAt = minimumCheckAt(startTime, form);

  const preWorkflow = workflow.filter((step) => resolveStr(step.phase) !== 'POST_AUCTION');

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= preWorkflow.length) return;
    const reordered = [...preWorkflow];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    const order: Record<string, number> = {};
    reordered.forEach((step, i) => {
      order[step.id] = i + 1;
    });
    workflow
      .filter((step) => resolveStr(step.phase) === 'POST_AUCTION')
      .forEach((step, i) => {
        order[step.id] = reordered.length + i + 1;
      });
    try {
      await auctionsApi.reorderWorkflowSteps(auctionId, order);
      await load();
    } catch (err) {
      setError(parseApiError(err).general ?? 'Could not reorder the steps.');
      void load();
    }
  };

  const handleAdd = async (step: AddWorkflowStepRQ) => {
    try {
      await auctionsApi.addWorkflowStep(auctionId, { ...step, order: preWorkflow.length + 1 });
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
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 bg-muted/40 px-4 py-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Zap className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {form.minimumEnabled ? 'Minimum participants' : 'No minimum participants'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {form.minimumEnabled
                ? `At least ${form.minimumCount || 0} participants`
                : 'The auction goes live however many people are ready.'}
            </p>
          </div>
          <PolicyBadge tone="warning" className="px-2 text-[10px]" />
          <span className="hidden text-[10px] text-muted-foreground sm:inline">
            {form.minimumEnabled ? 'Go-live check' : 'Off'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {form.minimumEnabled && checkAt && (
              <div className="hidden text-right sm:block">
                <p className="text-[10px] font-semibold text-foreground">{checkAt}</p>
                <p className="text-[10px] text-muted-foreground">go-live check</p>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => onChange({ minimumEnabled: !form.minimumEnabled })}
            >
              {form.minimumEnabled ? (
                <Trash2 className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {form.minimumEnabled ? 'Remove' : 'Add'}
            </Button>
          </div>
        </div>

        {form.minimumEnabled && (
          <>
            <WizardRow
              label="Rule"
              description="The auction only goes live if enough people are ready."
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="At least">
                    <input
                      type="number"
                      min={1}
                      value={form.minimumCount}
                      onChange={(e) => onChange({ minimumCount: e.target.value })}
                      className={`${inputClass} h-9 w-20`}
                      aria-label="Minimum participants"
                    />
                  </Field>
                  <span className="pb-2 text-xs text-muted-foreground">participants</span>
                  <Field label="Checked">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        value={form.checkDays}
                        onChange={(e) => onChange({ checkDays: e.target.value })}
                        className="h-9 w-12 rounded-md border border-input bg-background px-1.5 text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        aria-label="Check days before start"
                      />
                      <span className="text-[11px] text-muted-foreground">d</span>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={form.checkHours}
                        onChange={(e) => onChange({ checkHours: e.target.value })}
                        className="h-9 w-12 rounded-md border border-input bg-background px-1.5 text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        aria-label="Check hours before start"
                      />
                      <span className="text-[11px] text-muted-foreground">h</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={form.checkMinutes}
                        onChange={(e) => onChange({ checkMinutes: e.target.value })}
                        className="h-9 w-12 rounded-md border border-input bg-background px-1.5 text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        aria-label="Check minutes before start"
                      />
                      <span className="text-[11px] text-muted-foreground">min before start</span>
                    </div>
                  </Field>
                </div>
                {checkAt && (
                  <p className="rounded bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wider text-foreground">
                      Checked at
                    </span>{' '}
                    {checkAt}
                  </p>
                )}
              </div>
            </WizardRow>

            <WizardRow label="Who counts" description="Only people who are ready to bid.">
              <InfoNote>
                Counts participants who have finished every required step due by then. People who
                are still in the middle of a step do not count.
              </InfoNote>
            </WizardRow>

            <WizardRow label="If it isn't met" description="Fixed outcome.">
              <div className="space-y-2">
                <div className="rounded-md bg-foreground px-3 py-2 text-[11px] leading-snug text-background">
                  If fewer than {form.minimumCount || 0} participants are ready at{' '}
                  {checkAt || 'the check time'}, the auction is cancelled automatically.
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Everyone who signed up is told, and refundable payments are returned.
                </p>
              </div>
            </WizardRow>
          </>
        )}
      </section>

      <InfoNote>
        {isPrivate
          ? 'This auction is private. You invite people after you publish it, in step 7. Everyone you invite completes the steps below before they can bid.'
          : "This auction is public. Once it's published, anyone registered can join by completing the steps below."}
      </InfoNote>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-2.5">
          <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Before the auction</p>
            <p className="text-[11px] text-muted-foreground">
              {preWorkflow.length} workflow step{preWorkflow.length === 1 ? '' : 's'} for every
              participant
            </p>
          </div>
          {startTime && (
            <span className="ml-auto text-[11px] text-muted-foreground">
              until {formatDateTime(startTime)}
            </span>
          )}
        </div>

        <div className="space-y-2 p-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading workflow…
            </div>
          ) : preWorkflow.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">No participation steps yet</p>
              <p className="text-xs text-muted-foreground">
                Add terms and conditions, a participation form, bank details or a payment.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 gap-1.5"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add a step
              </Button>
            </div>
          ) : (
            preWorkflow.map((step, index) => {
              const type = resolveStr(step.type);
              const deadline = offsetLabel(step);
              return (
                <div
                  key={step.id}
                  className="rounded-md border border-border bg-background px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <StepTypeIcon type={step.type} className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">{stepTitle(step)}</span>
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {WORKFLOW_TYPE_LABEL[type] ?? fmtLabel(type)}
                    </span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                      Required
                    </span>
                    {deadline && (
                      <span className="ml-auto text-right text-[10px] text-muted-foreground">
                        {deadline}
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
                          disabled={index === preWorkflow.length - 1}
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
                  <p className="mt-1 pl-8 text-[11px] text-muted-foreground">{stepMeta(step)}</p>
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
            Add a step before the auction
          </button>

          {error && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
              {error}
            </p>
          )}
        </div>
      </section>

      <MutedNote>
        Only participants who finish every required step by its deadline can bid. Steps set by the
        platform are locked.
      </MutedNote>

      <AddStepDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        insertionOrder={preWorkflow.length + 1}
        hasTnCStep={hasTnC}
        hasBankDetailStep={hasBank}
        hasParticipationFormStep={hasParticipation}
        workflow={workflow}
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
        description="Participants will no longer be asked to complete this step."
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
