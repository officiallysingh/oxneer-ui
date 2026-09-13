'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Loader2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Label,
  DateTimePicker,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';
import {
  auctionsApi,
  AddWorkflowStepRQ,
  AuctionWorkflowStep,
  PolicyEvaluationMap,
  PolicyItemRQ,
} from '@repo/api';
import { DismissibleError, FieldError } from './AuctionShared';
import { PropertyFormPreview } from '@/app/(admin)/admin/metadata/_components/PropertyFormPreview';
import {
  SELECT_CLS,
  resolveStr,
  fmtLabel,
  categoryForPolicyType,
  buildEvaluationsByPolicy,
  isRefundablePrePayment,
} from './PolicyShared';
import {
  StepTypeIcon,
  WorkflowStepPhaseBadge,
  PaymentStepDetails,
  BankDetailStepDetails,
  ParticipationFormStepDetails,
  TnCStepDetails,
  FormStepDetails,
} from './WorkflowStepDetails';
import { PolicyItemCard, EvaluationList } from './PolicyEvaluationDisplay';
import { AddStepDialog } from './AddStepDialog';
import { EditStepDialog } from './EditStepDialog';
import Tip from '@/components/common/admin/Tip';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { parseApiError } from '@/lib/api-errors';

interface Props {
  auctionId: string;
  onBack: () => void;
  onNext?: () => void;
  onFinish: () => void;
  showScheduleOnly?: boolean;
  /**
   * 'draft' (default): added steps accumulate locally as drafts and are
   * preview-evaluated + persisted together on Continue — used by the
   * new-auction wizard where nothing is saved yet.
   * 'direct': each added step is persisted immediately, one by one — used by
   * the edit flow where steps are already saved on the server.
   */
  saveMode?: 'draft' | 'direct';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalInputValue(dateValue?: string) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDuration(days: number, hours: number, minutes: number) {
  return `${days}d ${hours}h ${minutes}m`;
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function NumberSelect({
  id,
  label,
  value,
  onChange,
  max,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT_CLS}
      >
        {Array.from({ length: max + 1 }, (_, i) => (
          <option key={i} value={String(i)}>
            {i}
          </option>
        ))}
      </select>
    </div>
  );
}

function validateSchedule(finalStart: string, finalEnd: string): Record<string, string> {
  const errs: Record<string, string> = {};
  const now = new Date();
  const start = new Date(finalStart);
  const end = new Date(finalEnd);
  if (!finalStart || Number.isNaN(start.getTime()))
    errs.startTime = 'Start date & time is required.';
  else if (start <= now) errs.startTime = 'Start date & time must be in the future.';
  if (!finalEnd || Number.isNaN(end.getTime())) errs.endTime = 'End date & time is required.';
  else if (end <= now) errs.endTime = 'End date & time must be in the future.';
  else if (!Number.isNaN(start.getTime()) && end <= start)
    errs.endTime = 'End date & time must be after start time.';
  return errs;
}

/** PAYMENT_STEP has no distinct type label of its own — "Pre Payment N"/"Post Payment N"
 *  are always used regardless of any stored name, with N being the sequential
 *  position among payment steps of the same phase in the workflow. */
function paymentStepLabel(step: AuctionWorkflowStep, allSteps: AuctionWorkflowStep[]): string {
  const phase = resolveStr(step.phase);
  const isPre = phase !== 'POST_AUCTION';
  const samePhase = allSteps.filter(
    (s) =>
      resolveStr(s.type) === 'PAYMENT_STEP' &&
      (isPre ? resolveStr(s.phase) !== 'POST_AUCTION' : resolveStr(s.phase) === 'POST_AUCTION'),
  );
  const order = samePhase.findIndex((s) => s.id === step.id) + 1;
  return isPre ? `Pre Payment ${order}` : `Post Payment ${order}`;
}

function stepDisplayName(
  step: AuctionWorkflowStep,
  index: number,
  allSteps?: AuctionWorkflowStep[],
): string {
  if (resolveStr(step.type) === 'PAYMENT_STEP') {
    return paymentStepLabel(step, allSteps ?? [step]);
  }
  if (step.name) return step.name;
  return fmtLabel(step.type) || `Step ${index + 1}`;
}

/** Turns an unsaved step request into a displayable step projection so drafts
 *  render identically to persisted ones. */
function projectDraft(id: string, rq: AddWorkflowStepRQ): AuctionWorkflowStep {
  const shared = { id, name: rq.name, description: rq.description };
  switch (rq.type) {
    case 'PAYMENT_STEP':
      return {
        ...shared,
        type: 'PAYMENT_STEP',
        mode: rq.mode,
        phase: rq.phase,
        offset: rq.offset,
        heads: rq.heads,
      };
    case 'TNC_FORM_STEP':
      return { ...shared, type: 'TNC_FORM_STEP', tncText: rq.tncText };
    case 'PARTICIPATION_FORM_STEP':
      return {
        ...shared,
        type: 'PARTICIPATION_FORM_STEP',
        manualApproval: rq.manualApproval,
        preStartDeadlineDuration: rq.preStartDeadlineDuration,
        embedded: { typeId: rq.typeId },
      };
    case 'FORM_STEP':
      return { ...shared, type: 'FORM_STEP', phase: rq.phase, embedded: { typeId: rq.typeId } };
    default:
      return { ...shared, type: 'BANK_DETAIL_FORM_STEP', implicit: rq.implicit };
  }
}

/** Keeps `order` contiguous (1..n) after any local mutation of the combined list. */
function resequence(steps: AuctionWorkflowStep[]): AuctionWorkflowStep[] {
  return steps.map((s, i) => (s.order === i + 1 ? s : { ...s, order: i + 1 }));
}

// ── Workflow step accordion card ──────────────────────────────────────────────

function WorkflowStepCard({
  auctionId,
  step,
  index,
  allSteps,
  isDraft,
  dragHandleProps,
  dragDisabled,
  isDragTarget,
  participationPolicies,
  evaluationsByPolicyId,
  onEdit,
  onDelete,
}: {
  auctionId: string;
  step: AuctionWorkflowStep;
  index: number;
  allSteps: AuctionWorkflowStep[];
  isDraft?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  dragDisabled?: boolean;
  isDragTarget?: boolean;
  participationPolicies?: PolicyItemRQ[];
  evaluationsByPolicyId?: Record<string, PolicyEvaluationMap>;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const statusType = resolveStr(step.status?.type);
  const isCompleted = statusType === 'COMPLETED';
  const isRunning = statusType === 'IN_PROGRESS' || statusType === 'RUNNING';

  const bubbleClass = isCompleted
    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
    : isRunning
      ? 'border-blue-500 bg-blue-500/10 text-blue-600'
      : 'border-border bg-muted text-muted-foreground';

  return (
    <div
      className={`rounded-xl border bg-card transition-all ${isDragTarget ? 'border-primary/60 shadow-md' : 'border-border'}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className={`shrink-0 touch-none ${
            dragDisabled
              ? 'cursor-not-allowed text-muted-foreground/20'
              : 'cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground'
          }`}
          title={dragDisabled ? 'Save draft steps to enable reordering' : 'Drag to reorder'}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Step bubble */}
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border-2 shrink-0 ${bubbleClass}`}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : isRunning ? (
            <Clock className="h-3.5 w-3.5" />
          ) : (
            index + 1
          )}
        </div>

        {/* Type icon */}
        <StepTypeIcon type={step.type} className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {stepDisplayName(step, index, allSteps)}
          </p>
          {step.type && fmtLabel(step.type) !== stepDisplayName(step, index, allSteps) && (
            <p className="text-[10px] text-muted-foreground truncate">{fmtLabel(step.type)}</p>
          )}
        </div>

        {/* Pre/Post Auction phase — hidden for TNC/Participation, which are always Pre Auction */}
        {resolveStr(step.type) !== 'TNC_FORM_STEP' &&
          resolveStr(step.type) !== 'PARTICIPATION_FORM_STEP' && (
            <WorkflowStepPhaseBadge phase={step.phase} />
          )}

        {/* Draft chip */}
        {isDraft && (
          <span className="rounded-full bg-amber-500/15 text-amber-600 px-2 py-0.5 text-[10px] font-medium shrink-0">
            Draft
          </span>
        )}

        {/* Edit step */}
        {onEdit && (
          <Tip label="Edit step">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
        )}

        {/* Delete step — implicit steps can't be removed once saved (auto-generated by the
            backend, or a Bank Detail step required by a refundable payment); drafts stay
            removable regardless, since nothing has been persisted yet. */}
        {onDelete && (isDraft || !step.implicit) && (
          <Tip label={isDraft ? 'Remove draft step' : 'Delete step'}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </Tip>
        )}

        {/* Expand */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-border/50 px-4 py-3 space-y-2 bg-muted/10 rounded-b-xl">
          {/* Payment steps never show name/description — title is always generated */}
          {step.description && resolveStr(step.type) !== 'PAYMENT_STEP' && (
            <p className="text-xs text-muted-foreground">{step.description}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {step.implicit && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-[10px]">
                Implicit
              </span>
            )}
            {step.status?.updatedAt && (
              <span className="text-muted-foreground">
                Updated:{' '}
                <span className="text-foreground">{fmtDateTime(step.status.updatedAt)}</span>
              </span>
            )}
          </div>

          {/* Step status details — e.g. transaction ref, bank verification status */}
          {step.status?.details && Object.keys(step.status.details).length > 0 && (
            <div className="mt-1.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {Object.entries(step.status.details).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs"
                  >
                    <span className="text-muted-foreground">{fmtLabel(key)}</span>
                    <span className="text-foreground font-medium truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment step — mode/phase/offset/heads, view-only */}
          {resolveStr(step.type) === 'PAYMENT_STEP' && (
            <div className="mt-1.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Payment
              </p>
              <PaymentStepDetails step={step} />
            </div>
          )}

          {/* Bank details — fixed schema, view-only */}
          {resolveStr(step.type) === 'BANK_DETAIL_FORM_STEP' && (
            <div className="mt-1.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Bank Details
              </p>
              <BankDetailStepDetails />
            </div>
          )}

          {/* Participation form step — approval/validation settings, view-only */}
          {resolveStr(step.type) === 'PARTICIPATION_FORM_STEP' && (
            <div className="mt-1.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Participation
              </p>
              <ParticipationFormStepDetails step={step} />
            </div>
          )}

          {/* Custom form step — before/after-auction phase, view-only */}
          {resolveStr(step.type) === 'FORM_STEP' && (
            <div className="mt-1.5 space-y-1">
              <FormStepDetails step={step} />
            </div>
          )}

          {/* Custom/participation form step — properties embedded on the step itself, view-only */}
          {(resolveStr(step.type) === 'FORM_STEP' ||
            resolveStr(step.type) === 'PARTICIPATION_FORM_STEP') &&
            (step.embedded?.properties?.length ?? 0) > 0 && (
              <div className="mt-1.5 space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Form Fields
                </p>
                <PropertyFormPreview properties={step.embedded!.properties!} disabled={true} />
              </div>
            )}

          {/* Step-level policies — the participation step falls back to the auction's
              participation policy when the step itself doesn't carry an embedded policy. */}
          {(() => {
            const isParticipationStep =
              resolveStr(step.type) === 'PARTICIPATION_STEP' ||
              resolveStr(step.type) === 'PARTICIPATION_FORM_STEP' ||
              (participationPolicies ?? []).some((p) => p.name && p.name === step.name);
            const embeddedPolicies =
              step.policies && step.policies.length > 0
                ? step.policies
                : step.policy
                  ? [step.policy]
                  : [];
            const policiesToShow =
              embeddedPolicies.length > 0
                ? embeddedPolicies
                : isParticipationStep
                  ? (participationPolicies ?? [])
                  : [];
            if (policiesToShow.length === 0) return null;
            return (
              <div className="mt-1.5 space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Policies
                </p>
                {policiesToShow.map((p, pi) => (
                  <PolicyItemCard
                    key={p.id ?? pi}
                    auctionId={auctionId}
                    policyId={p.id}
                    name={p.name}
                    type={p.type}
                    evaluations={p.id ? evaluationsByPolicyId?.[p.id] : undefined}
                  />
                ))}
              </div>
            );
          })()}

          {resolveStr(step.type) === 'TNC_FORM_STEP' && (
            <div className="mt-2 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Terms & Conditions
              </p>
              <TnCStepDetails step={step} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reorder constraint ─────────────────────────────────────────────────────────
// A Pre Payment step with a refundable head requires a Bank Detail step to be
// positioned before it (bank details are needed to issue that refund). Non-refundable
// pre-payments and post-payments carry no such requirement.

function violatesBankBeforeRefundablePayment(list: AuctionWorkflowStep[]): boolean {
  const bankIdx = list.findIndex((s) => resolveStr(s.type) === 'BANK_DETAIL_FORM_STEP');
  return list.some((s, i) => {
    if (!isRefundablePrePayment(s)) return false;
    return bankIdx === -1 || bankIdx > i;
  });
}

// Post Auction steps (payment or form) always form the final segment of the
// workflow — no non-Post-Auction step may appear after one.
function violatesPostAuctionLast(list: AuctionWorkflowStep[]): boolean {
  let seenPost = false;
  for (const s of list) {
    const isPost = resolveStr(s.phase) === 'POST_AUCTION';
    if (isPost) {
      seenPost = true;
      continue;
    }
    if (seenPost) return true;
  }
  return false;
}

// ── Main component ────────────────────────────────────────────────────────────

export function AuctionStep5Workflow({
  auctionId,
  onBack,
  onNext,
  onFinish,
  showScheduleOnly = false,
  saveMode = 'draft',
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'schedule' | 'publish' | 'save' | null>(null);
  /** Combined list — persisted steps mixed with local draft projections (ids `draft-*`). */
  const [workflow, setWorkflow] = useState<AuctionWorkflowStep[]>([]);
  /** Draft step requests keyed by their local draft id — the payloads sent on save. */
  const [draftRequests, setDraftRequests] = useState<Record<string, AddWorkflowStepRQ>>({});
  const draftIdSeq = useRef(1);

  const [participationPolicies, setParticipationPolicies] = useState<PolicyItemRQ[]>([]);
  const [evaluationsByPolicyId, setEvaluationsByPolicyId] = useState<
    Record<string, PolicyEvaluationMap>
  >({});
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [addStepOrder, setAddStepOrder] = useState(1);
  const [editingStep, setEditingStep] = useState<AuctionWorkflowStep | null>(null);
  const [deletingStep, setDeletingStep] = useState<AuctionWorkflowStep | null>(null);
  const [deletingStepBusy, setDeletingStepBusy] = useState(false);
  const [deleteStepError, setDeleteStepError] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

  // Preview-before-save review state (mirrors the policies step's review dialog)
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewData, setReviewData] = useState<
    { id: string; label: string; evaluations: PolicyEvaluationMap | null }[]
  >([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Schedule state
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationDays, setDurationDays] = useState('0');
  const [durationHours, setDurationHours] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('0');
  const [scheduleMode, setScheduleMode] = useState<'duration' | 'end'>('duration');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Drag state
  const dragIndexRef = useRef<number | null>(null);
  const dragHandleActiveRef = useRef(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const hasDrafts = Object.keys(draftRequests).length > 0;

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  // Load workflow + participation + policies
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      auctionsApi.getAuctionWorkflow(auctionId).catch(() => [] as AuctionWorkflowStep[]),
      auctionsApi.getAuctionPolicies(auctionId).catch(() => null),
      auctionsApi.getAuctionById(auctionId).catch(() => null),
    ])
      .then(([wf, pol, auction]) => {
        if (!mounted) return;
        setWorkflow(wf);
        const allItems = pol ?? [];
        // The implicit Participation step doesn't embed its own policy on the workflow
        // step object — fall back to the participation policy from the policies endpoint.
        setParticipationPolicies(
          allItems.filter((p) => categoryForPolicyType(p.type) === 'PARTICIPATION'),
        );

        // Populate existing schedule when in schedule-only mode
        if (showScheduleOnly && auction?.schedule) {
          const existingStart = toLocalInputValue(auction.schedule.startTime);
          const existingEnd = toLocalInputValue(auction.schedule.endTime);
          if (existingStart) setStartTime(existingStart);
          if (existingEnd) setEndTime(existingEnd);
        }

        // Evaluate every saved policy (workflow-embedded + auction-level) by id,
        // in a single bulk request (POST /policies/evaluate) instead of N+1 calls.
        const policyIds = Array.from(
          new Set(
            [...wf.flatMap((s) => s.policies ?? []), ...allItems]
              .map((p) => p.id)
              .filter((id): id is string => Boolean(id)),
          ),
        );
        if (policyIds.length > 0) {
          auctionsApi
            .evaluateAuctionPolicies(auctionId, policyIds)
            .then((evals) => {
              if (mounted) setEvaluationsByPolicyId(buildEvaluationsByPolicy(evals, allItems));
            })
            .catch(() => {});
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [auctionId, showScheduleOnly]);

  const reloadWorkflow = useCallback(() => {
    auctionsApi
      .getAuctionWorkflow(auctionId)
      .then(setWorkflow)
      .catch(() => {});
  }, [auctionId]);

  // ── Local draft management ───────────────────────────────────────────────

  const addDraft = (rq: AddWorkflowStepRQ) => {
    const id = `draft-${draftIdSeq.current++}`;
    const projected = { ...projectDraft(id, rq), order: rq.order };
    setDraftRequests((prev) => ({ ...prev, [id]: rq }));
    setWorkflow((prev) =>
      resequence([
        ...prev.slice(0, (rq.order ?? prev.length + 1) - 1),
        projected,
        ...prev.slice(Math.max((rq.order ?? prev.length + 1) - 1, 0)),
      ]),
    );
  };

  const removeDraft = (id: string) => {
    setDraftRequests((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setWorkflow((prev) => resequence(prev.filter((s) => s.id !== id)));
  };

  // ── Step creation ────────────────────────────────────────────────────────
  // Draft mode buffers the request locally until Continue previews and saves
  // everything together; direct mode persists each step immediately (errors
  // propagate back into AddStepDialog, which stays open).
  const handleAddStep = async (rq: AddWorkflowStepRQ) => {
    if (saveMode !== 'direct') {
      addDraft(rq);
      return;
    }
    await auctionsApi.addWorkflowStep(auctionId, rq);
    reloadWorkflow();
  };

  // ── Saved-step mutations (direct API) ────────────────────────────────────

  const handleDeleteStep = async () => {
    if (!deletingStep) return;
    setDeletingStepBusy(true);
    setDeleteStepError(null);
    try {
      await auctionsApi.deleteWorkflowStep(auctionId, deletingStep.id);
      setDeletingStep(null);
      reloadWorkflow();
    } catch {
      setDeleteStepError('Failed to delete step. Please try again.');
    } finally {
      setDeletingStepBusy(false);
    }
  };

  const handleDeleteAllWorkflow = async () => {
    if (saveMode !== 'direct') return;
    setDeletingAll(true);
    setDeleteAllError(null);
    try {
      await auctionsApi.deleteWorkflow(auctionId);
      setWorkflow([]);
      setDraftRequests({});
      setEvaluationsByPolicyId({});
      setDeleteAllOpen(false);
    } catch (err) {
      setDeleteAllError(parseApiError(err).general ?? 'Failed to delete the workflow.');
    } finally {
      setDeletingAll(false);
    }
  };

  const hasTnCStep = workflow.some((s) => resolveStr(s.type) === 'TNC_FORM_STEP');
  const hasBankDetailStep = workflow.some((s) => resolveStr(s.type) === 'BANK_DETAIL_FORM_STEP');
  const hasParticipationFormStep = workflow.some(
    (s) => resolveStr(s.type) === 'PARTICIPATION_FORM_STEP',
  );

  const openAddStep = (order: number) => {
    setAddStepOrder(order);
    setAddStepOpen(true);
  };

  // Reorder handler — only reachable while there are no unsaved drafts, so the
  // list consists purely of persisted steps and can be synced immediately.
  const handleReorder = useCallback(
    async (newSteps: AuctionWorkflowStep[]) => {
      setWorkflow(resequence(newSteps));
      setReordering(true);
      setReorderError(null);
      try {
        const order: Record<string, number> = {};
        resequence(newSteps).forEach((s, i) => {
          if (s.id) order[s.id] = i + 1;
        });
        await auctionsApi.reorderWorkflowSteps(auctionId, order);
      } catch {
        setReorderError('Failed to save new order. Please try again.');
      } finally {
        setReordering(false);
      }
    },
    [auctionId],
  );

  const moveStep = (from: number, to: number) => {
    if (from === to || hasDrafts) return;
    const next = [...workflow];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    if (violatesBankBeforeRefundablePayment(next)) {
      setReorderError(
        'A refundable Pre Payment step must have its Bank Detail step positioned before it.',
      );
      return;
    }
    if (violatesPostAuctionLast(next)) {
      setReorderError('Post Auction steps must always be the last steps in the workflow.');
      return;
    }
    handleReorder(next);
  };

  // ── Preview-then-save flow ───────────────────────────────────────────────

  const handleContinue = () => {
    if (!hasDrafts) {
      onNext?.();
      return;
    }
    runReview();
  };

  const runReview = async () => {
    setReviewOpen(true);
    setReviewLoading(true);
    setSaveError(null);
    setReviewData([]);

    const draftSteps = workflow
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => draftRequests[step.id])
      .sort((a, b) => (a.step.order ?? 0) - (b.step.order ?? 0));

    const results = await Promise.all(
      draftSteps.map(async ({ step, index }) => {
        const rq = draftRequests[step.id];
        const label = stepDisplayName(step, index, workflow);
        if (!rq) return { id: step.id, label, evaluations: null };
        try {
          const evaluation = await auctionsApi.previewWorkflowStep(auctionId, rq);
          // previewWorkflowStep returns a single PolicyEvaluation — wrap it into
          // a PolicyEvaluationMap so EvaluationList can render it as a named card.
          const evaluations: PolicyEvaluationMap = { [label]: evaluation };
          return { id: step.id, label, evaluations };
        } catch {
          return { id: step.id, label, evaluations: null };
        }
      }),
    );

    setReviewData(results);
    setReviewLoading(false);
  };

  const confirmSaveAll = async () => {
    setSaving('save');
    setSaveError(null);
    try {
      // Build the full ordered workflow payload — persisted steps keep their id,
      // draft steps are included as new entries (no id).
      const steps: AddWorkflowStepRQ[] = workflow
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((step) => {
          const draft = draftRequests[step.id];
          if (draft) {
            // New step — send the draft request at the correct order
            return { ...draft, order: step.order };
          }
          // Existing persisted step — include its id so the backend keeps it
          return { ...(step as unknown as AddWorkflowStepRQ), id: step.id, order: step.order };
        });

      await auctionsApi.setAuctionWorkflow(auctionId, steps);
      setDraftRequests({});
      setReviewOpen(false);
      reloadWorkflow();
      onNext?.();
    } catch (err) {
      setSaveError(parseApiError(err).general ?? 'Failed to save workflow steps.');
    } finally {
      setSaving(null);
    }
  };

  // Schedule compute
  const computedEndTime = useMemo(() => {
    if (scheduleMode !== 'duration' || !startTime) return '';
    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) return '';
    const totalMinutes =
      parseInt(durationDays || '0', 10) * 24 * 60 +
      parseInt(durationHours || '0', 10) * 60 +
      parseInt(durationMinutes || '0', 10);
    if (totalMinutes <= 0) return '';
    return toLocalInputValue(new Date(start.getTime() + totalMinutes * 60000).toISOString());
  }, [scheduleMode, startTime, durationDays, durationHours, durationMinutes]);

  useEffect(() => {
    if (scheduleMode === 'duration' && computedEndTime) setEndTime(computedEndTime);
  }, [scheduleMode, computedEndTime]);

  const handleScheduleSubmit = async (publish: boolean) => {
    const finalStart = startTime;
    const finalEnd = scheduleMode === 'duration' ? computedEndTime : endTime;
    setGeneralError(null);
    const errs = validateSchedule(finalStart, finalEnd);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSaving(publish ? 'publish' : 'schedule');
    try {
      await auctionsApi.scheduleAuction(auctionId, {
        startTime: new Date(finalStart).toISOString(),
        endTime: new Date(finalEnd).toISOString(),
        publish,
      });
      onFinish();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setGeneralError(parsed.general ?? 'Failed to schedule auction.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Workflow section ────────────────────────────────────────────── */}
      {!showScheduleOnly && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Workflow</span>
            {!loading && (
              <span className="text-xs text-muted-foreground">
                {workflow.length} step{workflow.length !== 1 ? 's' : ''}
              </span>
            )}
            {reordering && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground hidden sm:inline select-none">
                Drag to reorder
              </span>
              {saveMode === 'direct' && workflow.length > 0 && !hasDrafts && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteAllOpen(true)}
                  className="h-8 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete all
                </Button>
              )}
            </div>
          </div>

          {/* Errors / notices */}
          {reorderError && (
            <div className="px-4 py-2 text-xs text-destructive bg-destructive/5 border-b border-destructive/20">
              {reorderError}
            </div>
          )}
          {hasDrafts && (
            <div className="px-4 py-2 text-xs bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400">
              {Object.keys(draftRequests).length} unsaved step
              {Object.keys(draftRequests).length !== 1 ? 's' : ''} — marked as Draft, they are
              evaluated and saved together when you continue.
            </div>
          )}

          {/* Body */}
          <div className="p-4 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading workflow…</span>
              </div>
            ) : workflow.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                <p className="text-sm">No workflow steps yet.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => openAddStep(1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add first step
                </Button>
              </div>
            ) : (
              <>
                {/* Insert before the first step. */}
                <div className="flex items-center justify-center py-1">
                  <button
                    type="button"
                    onClick={() => openAddStep(1)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 border border-dashed border-border hover:border-primary/40 transition-all"
                    title="Add step here"
                  >
                    <Plus className="h-3 w-3" />
                    Add step
                  </button>
                </div>
                {workflow.map((step, i) => {
                  const isDraft = step.id.startsWith('draft-');
                  return (
                    <div key={step.id}>
                      <div
                        draggable={!hasDrafts}
                        onDragStart={(e) => {
                          if (!dragHandleActiveRef.current) {
                            e.preventDefault();
                            return;
                          }
                          dragIndexRef.current = i;
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverIdx(i);
                        }}
                        onDragLeave={() => setDragOverIdx(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          const from = dragIndexRef.current;
                          if (from !== null && from !== i) moveStep(from, i);
                          dragIndexRef.current = null;
                          setDragOverIdx(null);
                        }}
                        onDragEnd={() => {
                          dragHandleActiveRef.current = false;
                          dragIndexRef.current = null;
                          setDragOverIdx(null);
                        }}
                        className={`transition-opacity ${dragOverIdx === i ? 'opacity-50' : ''}`}
                      >
                        <WorkflowStepCard
                          auctionId={auctionId}
                          step={step}
                          index={i}
                          allSteps={workflow}
                          isDraft={isDraft}
                          isDragTarget={dragOverIdx === i}
                          dragDisabled={hasDrafts}
                          participationPolicies={participationPolicies}
                          evaluationsByPolicyId={evaluationsByPolicyId}
                          onEdit={!isDraft && !hasDrafts ? () => setEditingStep(step) : undefined}
                          onDelete={
                            isDraft
                              ? () => removeDraft(step.id)
                              : !hasDrafts
                                ? () => setDeletingStep(step)
                                : undefined
                          }
                          dragHandleProps={{
                            onPointerDown: () => {
                              if (!hasDrafts) dragHandleActiveRef.current = true;
                            },
                          }}
                        />
                      </div>
                      {/* Insert-between button */}
                      <div className="flex items-center justify-center py-1">
                        <button
                          type="button"
                          onClick={() => openAddStep(i + 2)}
                          className="flex items-center gap-1 px-3 py-1 rounded-full text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 border border-dashed border-border hover:border-primary/40 transition-all"
                          title="Add step here"
                        >
                          <Plus className="h-3 w-3" />
                          Add step
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Schedule section ────────────────────────────────────────────── */}
      {showScheduleOnly && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Schedule</p>
          </div>

          <DismissibleError message={generalError} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start date & time</Label>
              <DateTimePicker
                id="startTime"
                value={startTime}
                onChange={(v) => {
                  setStartTime(v);
                  clearErr('startTime');
                }}
              />
              <FieldError message={fieldErrors.startTime} />
            </div>
            <div className="space-y-2">
              <Label>Schedule by</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={scheduleMode === 'duration' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScheduleMode('duration')}
                >
                  Duration
                </Button>
                <Button
                  type="button"
                  variant={scheduleMode === 'end' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScheduleMode('end')}
                >
                  End datetime
                </Button>
              </div>
            </div>
          </div>

          {scheduleMode === 'duration' ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <NumberSelect
                  id="durationDays"
                  label="Days"
                  max={30}
                  value={durationDays}
                  onChange={(v) => {
                    setDurationDays(v);
                    clearErr('endTime');
                  }}
                />
                <NumberSelect
                  id="durationHours"
                  label="Hours"
                  max={23}
                  value={durationHours}
                  onChange={(v) => {
                    setDurationHours(v);
                    clearErr('endTime');
                  }}
                />
                <NumberSelect
                  id="durationMinutes"
                  label="Minutes"
                  max={59}
                  value={durationMinutes}
                  onChange={(v) => {
                    setDurationMinutes(v);
                    clearErr('endTime');
                  }}
                />
              </div>
              <FieldError message={fieldErrors.endTime} />
              {computedEndTime && (
                <p className="text-xs text-muted-foreground">
                  End time will be{' '}
                  {formatDuration(
                    parseInt(durationDays || '0', 10),
                    parseInt(durationHours || '0', 10),
                    parseInt(durationMinutes || '0', 10),
                  )}{' '}
                  after start.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="endTime">End date & time</Label>
              <DateTimePicker
                id="endTime"
                value={endTime}
                onChange={(v) => {
                  setEndTime(v);
                  clearErr('endTime');
                }}
              />
              <FieldError message={fieldErrors.endTime} />
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving !== null}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {showScheduleOnly ? (
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onFinish} disabled={saving !== null}>
              Skip
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleScheduleSubmit(false)}
              disabled={saving !== null}
              className="gap-2"
            >
              {saving === 'schedule' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Schedule'
              )}
            </Button>
            <Button
              type="button"
              onClick={() => handleScheduleSubmit(true)}
              disabled={saving !== null}
              className="gap-2"
            >
              {saving === 'publish' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Schedule & Publish'
              )}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            onClick={handleContinue}
            disabled={saving !== null}
            className="gap-2"
          >
            {hasDrafts ? 'Preview & Continue' : 'Continue'} <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AddStepDialog
        open={addStepOpen}
        onOpenChange={setAddStepOpen}
        insertionOrder={addStepOrder}
        hasTnCStep={hasTnCStep}
        hasBankDetailStep={hasBankDetailStep}
        hasParticipationFormStep={hasParticipationFormStep}
        workflow={workflow}
        onAdd={handleAddStep}
      />

      <EditStepDialog
        auctionId={auctionId}
        step={editingStep}
        onOpenChange={(open) => !open && setEditingStep(null)}
        onSaved={() => {
          setEditingStep(null);
          reloadWorkflow();
        }}
      />

      <ConfirmDialog
        open={deletingStep !== null}
        title="Delete step?"
        description={
          deleteStepError ??
          `This removes "${deletingStep?.name ?? fmtLabel(deletingStep?.type) ?? 'this step'}" from the auction workflow. This action cannot be undone.`
        }
        confirmLabel={deletingStepBusy ? 'Deleting...' : 'Delete'}
        onConfirm={handleDeleteStep}
        onCancel={() => {
          if (deletingStepBusy) return;
          setDeletingStep(null);
          setDeleteStepError(null);
        }}
      />

      <ConfirmDialog
        open={deleteAllOpen}
        title="Delete entire workflow?"
        description={
          deleteAllError ??
          'This permanently removes every workflow step from this auction. This action cannot be undone.'
        }
        confirmLabel={deletingAll ? 'Deleting...' : 'Delete all'}
        onConfirm={handleDeleteAllWorkflow}
        onCancel={() => {
          if (!deletingAll) {
            setDeleteAllOpen(false);
            setDeleteAllError(null);
          }
        }}
      />

      {/* ── Preview-before-save review dialog ─────────────────────────────── */}
      <Dialog
        open={reviewOpen}
        onOpenChange={(o) => {
          if (!o && saving !== 'save') setReviewOpen(false);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review workflow evaluation</DialogTitle>
          </DialogHeader>

          {reviewLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Evaluating workflow steps...</span>
            </div>
          ) : (
            <div className="space-y-3 py-1">
              {reviewData.map((r) =>
                r.evaluations ? (
                  <EvaluationList key={r.id} evaluations={r.evaluations} />
                ) : (
                  <div key={r.id} className="rounded-lg border border-border/60 bg-muted/10 p-3">
                    <h4 className="text-xs font-semibold text-foreground">{r.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">No evaluation available.</p>
                  </div>
                ),
              )}
              {reviewData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No workflow step evaluations available.
                </p>
              )}
            </div>
          )}

          {saveError && (
            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
              {saveError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewOpen(false)}
              disabled={saving === 'save'}
            >
              Back to edit
            </Button>
            <Button
              type="button"
              onClick={confirmSaveAll}
              disabled={saving !== null || reviewLoading}
              className="gap-2"
            >
              {saving === 'save' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save & Continue <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
