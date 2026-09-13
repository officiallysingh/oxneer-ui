'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  Search,
  Upload,
  Landmark,
  CreditCard,
  UserCheck,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import {
  Button,
  Label,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  RichTextEditor,
} from '@repo/ui';
import {
  auctionsApi,
  metadataApi,
  blobsApi,
  AuctionWorkflowStep,
  ManagedTypeListItemFull,
  ManagedTypeVM,
  WorkflowStepPhase,
  PolicyHeadRQ,
  AddWorkflowStepRQ,
} from '@repo/api';
import { DismissibleError } from './AuctionShared';
import {
  resolveStr,
  SELECT_CLS,
  DayHourMinuteFields,
  formatOffsetDuration,
  allowedStepTypesAt,
  isRefundablePrePayment,
} from './PolicyShared';
import { PropertyFormPreview } from '../../metadata/_components/PropertyFormPreview';
import { parseApiError } from '@/lib/api-errors';

type AddStepMode =
  | 'choose'
  | 'FORM_STEP'
  | 'TNC_FORM_STEP'
  | 'BANK_DETAIL_FORM_STEP'
  | 'PRE_PAYMENT_STEP'
  | 'POST_PAYMENT_STEP'
  | 'PARTICIPATION_FORM_STEP';

function emptyHead(): PolicyHeadRQ {
  return { name: '', description: '', basis: 'AMOUNT_BASED', value: 0, refundable: false };
}

/** Tiptap emits "<p></p>" for an empty doc — strip tags to check for real content. */
function isRichTextEmpty(html: string): boolean {
  return !html.replace(/<[^>]*>/g, '').trim();
}

/** One selectable step-type tile in the "choose a step" grid. */
function StepChoiceTile({
  icon,
  title,
  description,
  disabled,
  onClick,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onClick()}
      className={`w-full text-left rounded-lg border p-3.5 transition-colors space-y-1 bg-background/70 ${
        disabled
          ? 'border-border/50 opacity-50 cursor-not-allowed'
          : 'border-border hover:border-primary/50 hover:bg-background'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

/**
 * Builds a draft workflow step request locally — nothing is persisted here.
 * The caller accumulates drafts and saves them all at once (after previewing)
 * via POST /workflow/add, mirroring the policies step's review-then-save flow.
 */
export function AddStepDialog({
  open,
  onOpenChange,
  insertionOrder,
  hasTnCStep,
  hasBankDetailStep,
  hasParticipationFormStep,
  workflow,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insertionOrder: number;
  hasTnCStep: boolean;
  hasBankDetailStep: boolean;
  hasParticipationFormStep: boolean;
  /** Combined (saved + draft) workflow steps — used to enforce ordering constraints. */
  workflow: AuctionWorkflowStep[];
  /** Receives the fully-built step request. May return a promise — when it does
   *  (direct-save mode) the dialog stays open until it resolves and surfaces any
   *  rejection as an inline error instead of closing. */
  onAdd: (step: AddWorkflowStepRQ) => void | Promise<void>;
}) {
  const [mode, setMode] = useState<AddStepMode>('choose');
  const [error, setError] = useState<string | null>(null);
  // True while an awaited onAdd (direct-save mode) is in flight.
  const [savingStep, setSavingStep] = useState(false);
  // True when the last validation failure was specifically "needs a Bank
  // Detail step first" — offers a one-click way into the Bank Detail step's own form.
  const [needsBankDetailStep, setNeedsBankDetailStep] = useState(false);
  // Set while walking the "add Bank Detail step first" detour from the Payment step
  // form — remembers which phase to return to (with its already-filled fields intact)
  // once the admin explicitly submits the Bank Detail step form.
  const [pendingPaymentPhase, setPendingPaymentPhase] = useState<WorkflowStepPhase | null>(null);

  // Shared order field (used by every concrete step form)
  const [selectedOrder, setSelectedOrder] = useState(insertionOrder);

  // Managed-form picker state — shared by FORM_STEP and PARTICIPATION_FORM_STEP
  const [formQuery, setFormQuery] = useState('');
  const [formSearching, setFormSearching] = useState(false);
  const [formResults, setFormResults] = useState<ManagedTypeListItemFull[]>([]);
  const [selectedType, setSelectedType] = useState<ManagedTypeListItemFull | null>(null);
  const [selectedTypeDetail, setSelectedTypeDetail] = useState<ManagedTypeVM | null>(null);
  const [loadingTypeDetail, setLoadingTypeDetail] = useState(false);
  const formDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TNC_FORM_STEP state
  const [tncName, setTncName] = useState('');
  const [tncDescription, setTncDescription] = useState('');
  const [tncText, setTncText] = useState('');
  const [tncFile, setTncFile] = useState<File | null>(null);
  const [uploadingTnc, setUploadingTnc] = useState(false);

  // PRE_PAYMENT_STEP / POST_PAYMENT_STEP state
  const [paymentModeValue, setPaymentModeValue] = useState('');
  const [paymentModes, setPaymentModes] = useState<{ value: string; label: string }[]>([]);
  const [offsetDays, setOffsetDays] = useState('0');
  const [offsetHours, setOffsetHours] = useState('0');
  const [offsetMinutes, setOffsetMinutes] = useState('0');
  const [heads, setHeads] = useState<PolicyHeadRQ[]>([emptyHead()]);

  // PARTICIPATION_FORM_STEP state
  const [partManualApproval, setPartManualApproval] = useState(false);
  const [partValDays, setPartValDays] = useState('0');
  const [partValHours, setPartValHours] = useState('0');
  const [partValMinutes, setPartValMinutes] = useState('0');

  // FORM_STEP state — whether the custom form is collected before or after the auction.
  const [formPhase, setFormPhase] = useState<WorkflowStepPhase>('PRE_AUCTION');

  // Keep the internal order in sync when the dialog opens or insertion slot changes.
  useEffect(() => {
    setSelectedOrder(insertionOrder);
  }, [insertionOrder, open]);

  useEffect(() => {
    if (
      (mode === 'PRE_PAYMENT_STEP' || mode === 'POST_PAYMENT_STEP') &&
      paymentModes.length === 0
    ) {
      auctionsApi
        .getPaymentModes()
        .then((modes) => {
          setPaymentModes(modes);
          if (!paymentModeValue) {
            const online = modes.find((m) => /online/i.test(m.value) || /online/i.test(m.label));
            if (online) setPaymentModeValue(online.value);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const reset = () => {
    setMode('choose');
    setError(null);
    setNeedsBankDetailStep(false);
    setPendingPaymentPhase(null);
    setFormQuery('');
    setFormResults([]);
    setSelectedType(null);
    setSelectedTypeDetail(null);
    setTncName('');
    setTncDescription('');
    setTncText('');
    setTncFile(null);
    setPaymentModeValue('');
    setOffsetDays('0');
    setOffsetHours('0');
    setOffsetMinutes('0');
    setHeads([emptyHead()]);
    setPartManualApproval(false);
    setPartValDays('0');
    setPartValHours('0');
    setPartValMinutes('0');
    setFormPhase('PRE_AUCTION');
  };

  const close = () => {
    onOpenChange(false);
    reset();
  };

  /** Runs onAdd and closes only on success — lets direct-save callers surface
   *  API errors inline while draft mode resolves synchronously. */
  const runSubmit = async (buildRq: () => AddWorkflowStepRQ, onSuccess?: () => void) => {
    setSavingStep(true);
    setError(null);
    try {
      await onAdd(buildRq());
      if (onSuccess) {
        onSuccess();
      } else {
        close();
      }
    } catch (err) {
      setError(parseApiError(err).general ?? 'Failed to add step. Please try again.');
    } finally {
      setSavingStep(false);
    }
  };

  const searchFormTypes = useCallback((q: string) => {
    if (formDebounceRef.current) clearTimeout(formDebounceRef.current);
    formDebounceRef.current = setTimeout(async () => {
      setFormSearching(true);
      try {
        const results = await metadataApi.searchManagedTypeListItems({
          phrases: q.trim() ? [q.trim()] : [],
          type: 'CUSTOM_FORM',
        });
        setFormResults(results);
      } catch {
        // silently ignore search errors
      } finally {
        setFormSearching(false);
      }
    }, 300);
  }, []);

  const handleFormQueryChange = (q: string) => {
    setFormQuery(q);
    searchFormTypes(q);
  };

  useEffect(() => {
    if (open && (mode === 'FORM_STEP' || mode === 'PARTICIPATION_FORM_STEP'))
      searchFormTypes(formQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const selectType = (t: ManagedTypeListItemFull) => {
    setSelectedType(t);
    setSelectedTypeDetail(null);
    setLoadingTypeDetail(true);
    metadataApi
      .getManagedTypeById(t.id)
      .then(setSelectedTypeDetail)
      .catch(() => {})
      .finally(() => setLoadingTypeDetail(false));
  };

  // A refundable Pre Payment step requires a Bank Detail step positioned before it
  // (bank details are needed to issue the refund). Non-refundable pre-payments and
  // post-payments have no such requirement — Bank Details stays optional for them.
  const earliestRefundablePrePaymentOrder = workflow
    .filter((s) => isRefundablePrePayment(s))
    .reduce<number | null>((min, s) => {
      const order = s.order ?? Infinity;
      return min === null || order < min ? order : min;
    }, null);

  // Step types valid at this insertion point, given the workflow's structural
  // rules (Bank Details before refundable Pre Payments, only Pre Payments between
  // a Pre Payment and its Bank Details, Post Payments always last).
  const allowed = allowedStepTypesAt(
    workflow,
    selectedOrder,
    hasTnCStep,
    hasBankDetailStep,
    hasParticipationFormStep,
  );

  // Keep the selected Custom Form Step phase valid as the insertion point changes —
  // fall back to whichever of Pre/Post Auction is actually allowed here.
  useEffect(() => {
    if (mode !== 'FORM_STEP') return;
    if (formPhase === 'PRE_AUCTION' && !allowed.formPreAuction && allowed.formPostAuction) {
      setFormPhase('POST_AUCTION');
    } else if (formPhase === 'POST_AUCTION' && !allowed.formPostAuction && allowed.formPreAuction) {
      setFormPhase('PRE_AUCTION');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, allowed.formPreAuction, allowed.formPostAuction]);

  const submitFormStep = () => {
    if (!selectedType) {
      setError('Please select a form template.');
      return;
    }
    void runSubmit(() => ({
      type: 'FORM_STEP',
      name: selectedType.name,
      description: selectedType.description || selectedType.name,
      order: selectedOrder,
      typeId: selectedType.id,
      phase: formPhase,
    }));
  };

  const submitParticipationFormStep = () => {
    if (!selectedType) {
      setError('Please select a registration form template.');
      return;
    }
    void runSubmit(() => ({
      type: 'PARTICIPATION_FORM_STEP',
      name: selectedType.name,
      description: selectedType.description || selectedType.name,
      order: selectedOrder,
      manualApproval: partManualApproval,
      preStartDeadlineDuration: formatOffsetDuration(partValDays, partValHours, partValMinutes),
      typeId: selectedType.id,
    }));
  };

  const submitTncStep = async () => {
    if (isRichTextEmpty(tncText) && !tncFile) {
      setError('Provide either Terms and Conditions text or upload a document.');
      return;
    }
    let tncBlobId: string | undefined;
    if (tncFile) {
      try {
        setUploadingTnc(true);
        const blob = await blobsApi.upload(tncFile, {
          bucket: 'auction-workflow',
          classifier: 'DOCUMENT',
        });
        tncBlobId = blob.id || undefined;
      } catch (err) {
        setError(parseApiError(err).general ?? 'Failed to upload document.');
        return;
      } finally {
        setUploadingTnc(false);
      }
    }
    void runSubmit(() => ({
      type: 'TNC_FORM_STEP',
      name: tncName.trim() || undefined,
      description: tncDescription.trim() || undefined,
      order: selectedOrder,
      tncText: isRichTextEmpty(tncText) ? undefined : tncText,
      tncBlobId,
    }));
  };

  const submitBankDetailStep = () => {
    if (
      earliestRefundablePrePaymentOrder !== null &&
      selectedOrder > earliestRefundablePrePaymentOrder
    ) {
      setError(
        'A refundable Pre Payment step already exists — the Bank Detail step must be positioned before it.',
      );
      return;
    }
    // Refundable when it's backing an already-added refundable Pre Payment step, or
    // when walking the "add Bank Detail first" detour from a refundable Payment form
    // that hasn't been submitted yet (so it isn't in `workflow` to detect above).
    const refundable = earliestRefundablePrePaymentOrder !== null || pendingPaymentPhase !== null;
    void runSubmit(
      () => ({
        type: 'BANK_DETAIL_FORM_STEP',
        name: 'Bank Details',
        description: 'Participant provides bank details for payouts',
        order: selectedOrder,
        implicit: refundable,
        phase: pendingPaymentPhase ?? 'PRE_AUCTION',
      }),
      pendingPaymentPhase
        ? () => {
            // Came from the Payment step's "needs Bank Detail first" detour — return to
            // that (still-filled) form, now one position later since Bank Detail took
            // this slot, so the admin can review and explicitly submit it themselves.
            const phase = pendingPaymentPhase;
            setPendingPaymentPhase(null);
            setSelectedOrder((o) => o + 1);
            setMode(phase === 'PRE_AUCTION' ? 'PRE_PAYMENT_STEP' : 'POST_PAYMENT_STEP');
          }
        : undefined,
    );
  };

  const addHead = () => setHeads((prev) => [...prev, emptyHead()]);
  const removeHead = (i: number) => setHeads((prev) => prev.filter((_, idx) => idx !== i));
  const updateHead = (i: number, patch: Partial<PolicyHeadRQ>) =>
    setHeads((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));

  const submitPaymentStep = async (phase: WorkflowStepPhase) => {
    setNeedsBankDetailStep(false);
    if (!paymentModeValue) {
      setError('Please select a payment mode.');
      return;
    }
    if (heads.length === 0 || heads.some((h) => !h.name?.trim() || !h.description?.trim())) {
      setError('Every payment head needs a name, description and value.');
      return;
    }
    if (
      phase === 'PRE_AUCTION' &&
      heads.some((h) => h.refundable) &&
      !workflow.some(
        (s) => resolveStr(s.type) === 'BANK_DETAIL_FORM_STEP' && (s.order ?? 0) < selectedOrder,
      )
    ) {
      // Only offer the one-click fix when no Bank Detail step exists yet — if one
      // already exists but is positioned too late, the fix is repositioning it via
      // drag-reorder, not adding a second one (only one is ever allowed).
      if (!hasBankDetailStep) setNeedsBankDetailStep(true);
      setError(
        hasBankDetailStep
          ? 'This Pre Payment step has a refundable head — reposition the Bank Detail step to before it.'
          : 'This Pre Payment step has a refundable head — add a Bank Detail step at an earlier position first.',
      );
      return;
    }
    void runSubmit(() => ({
      type: 'PAYMENT_STEP',
      name: mode === 'PRE_PAYMENT_STEP' ? 'Pre Payment' : 'Post Payment',
      description: '',
      order: selectedOrder,
      mode: paymentModeValue,
      phase,
      offset: formatOffsetDuration(offsetDays, offsetHours, offsetMinutes),
      heads,
    }));
  };

  const backTarget = pendingPaymentPhase
    ? () => {
        const phase = pendingPaymentPhase;
        setPendingPaymentPhase(null);
        setMode(phase === 'PRE_AUCTION' ? 'PRE_PAYMENT_STEP' : 'POST_PAYMENT_STEP');
      }
    : () => setMode('choose');

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'choose'
              ? 'Add Step'
              : mode === 'FORM_STEP'
                ? 'Add Additional Details Step'
                : mode === 'BANK_DETAIL_FORM_STEP'
                  ? 'Add Bank Detail Form Step'
                  : mode === 'PRE_PAYMENT_STEP'
                    ? 'Add Pre Payment Step'
                    : mode === 'POST_PAYMENT_STEP'
                      ? 'Add Post Payment Step'
                      : mode === 'PARTICIPATION_FORM_STEP'
                        ? 'Add Participation Form Step'
                        : 'Add Terms and Conditions Form Step'}
          </DialogTitle>
        </DialogHeader>

        <DismissibleError message={error} />

        {needsBankDetailStep && error && (
          <div className="flex justify-end -mt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setPendingPaymentPhase(
                  mode === 'PRE_PAYMENT_STEP' ? 'PRE_AUCTION' : 'POST_AUCTION',
                );
                setNeedsBankDetailStep(false);
                setError(null);
                setMode('BANK_DETAIL_FORM_STEP');
              }}
            >
              Add Bank Detail step now
            </Button>
          </div>
        )}

        {mode === 'choose' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-2 items-start">
            {/* Pre Auction block */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 p-3 space-y-2">
              <h3 className="px-1 text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                Pre Auction
              </h3>
              <div className="space-y-2">
                <StepChoiceTile
                  icon={<CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />}
                  title="Pre Payment Step"
                  disabled={!allowed.prePayment}
                  onClick={() => setMode('PRE_PAYMENT_STEP')}
                  description={
                    allowed.prePayment
                      ? 'Collect payment before the auction outcome is finalized. Can be added multiple times.'
                      : 'Not allowed at this position — Post Payments must stay last.'
                  }
                />
                <StepChoiceTile
                  icon={<ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />}
                  title="Terms and Conditions Form Step"
                  disabled={!allowed.tnc}
                  onClick={() => setMode('TNC_FORM_STEP')}
                  description={
                    !allowed.tnc
                      ? hasTnCStep
                        ? 'Already added — only one is allowed per workflow.'
                        : 'Not allowed at this position — Post Payments must stay last.'
                      : 'Terms and Conditions step. Only one allowed.'
                  }
                />
                <StepChoiceTile
                  icon={<FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                  title="Additional Details Step"
                  disabled={!allowed.formPreAuction}
                  onClick={() => {
                    setFormPhase('PRE_AUCTION');
                    setMode('FORM_STEP');
                  }}
                  description={
                    allowed.formPreAuction
                      ? 'Pick a managed form template. Can be added multiple times.'
                      : 'Not allowed at this position — only Pre Payments go between a Pre Payment and its Bank Details.'
                  }
                />
                <StepChoiceTile
                  icon={<UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />}
                  title="Participation Form Step"
                  disabled={!allowed.participationForm}
                  onClick={() => setMode('PARTICIPATION_FORM_STEP')}
                  description={
                    allowed.participationForm
                      ? 'Collect registration/KYC details before participants can join. Only one allowed.'
                      : hasParticipationFormStep
                        ? 'Already added — only one is allowed per workflow.'
                        : 'Not allowed at this position — Post Payments must stay last.'
                  }
                />
                <StepChoiceTile
                  icon={<Landmark className="h-4 w-4 text-muted-foreground shrink-0" />}
                  title="Bank Detail Form Step"
                  disabled={!allowed.bank}
                  onClick={() => setMode('BANK_DETAIL_FORM_STEP')}
                  description={
                    !allowed.bank
                      ? hasBankDetailStep
                        ? 'Already added — only one is allowed per workflow.'
                        : 'Not allowed here — the Bank Detail step must be before any refundable Pre Payment.'
                      : 'Collect participant bank details for payouts. Only one allowed.'
                  }
                />
              </div>
            </div>

            {/* Post Auction block */}
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 dark:bg-orange-500/10 p-3 space-y-2">
              <h3 className="px-1 text-xs font-bold uppercase tracking-wide text-orange-700 dark:text-orange-400">
                Post Auction
              </h3>
              <div className="space-y-2">
                <StepChoiceTile
                  icon={<FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                  title="Additional Details Step"
                  disabled={!allowed.formPostAuction}
                  onClick={() => {
                    setFormPhase('POST_AUCTION');
                    setMode('FORM_STEP');
                  }}
                  description={
                    allowed.formPostAuction
                      ? 'Pick a managed form template. Can be added multiple times.'
                      : 'Not allowed here — Post Auction steps must be added after all Pre Auction steps.'
                  }
                />
                <StepChoiceTile
                  icon={<CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />}
                  title="Post Payment Step"
                  disabled={!allowed.postPayment}
                  onClick={() => setMode('POST_PAYMENT_STEP')}
                  description={
                    allowed.postPayment
                      ? 'Collect payment after the participant wins. Can be added multiple times.'
                      : 'Not allowed here — Post Auction steps must be added after all Pre Auction steps.'
                  }
                />
              </div>
            </div>
          </div>
        )}

        {(mode === 'FORM_STEP' || mode === 'PARTICIPATION_FORM_STEP') && (
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              {mode === 'PARTICIPATION_FORM_STEP'
                ? 'Participant fills this form to register for the auction. Optionally require manual approval of each submission.'
                : 'Pick a managed form template the participant fills in during this step.'}
            </p>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Search form templates
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={formQuery}
                  onChange={(e) => handleFormQueryChange(e.target.value)}
                  placeholder="Search form template by name..."
                  className="pl-8 text-sm"
                />
                {formSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card shadow-lg overflow-hidden">
              {formSearching && !formResults.length ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              ) : formResults.length === 0 ? (
                <p className="text-center py-8 text-xs text-muted-foreground">
                  No managed types found
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-border/50">
                  {formResults.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectType(t)}
                      className={`w-full text-left px-3 py-2.5 transition-colors ${
                        selectedType?.id === t.id ? 'bg-primary/10' : 'hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{t.name}</span>
                        {selectedType?.id === t.id && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {t.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedType && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Form preview</Label>
                {loadingTypeDetail ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 rounded-md border border-border">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Loading form...</span>
                  </div>
                ) : (
                  <PropertyFormPreview properties={selectedTypeDetail?.properties ?? []} />
                )}
              </div>
            )}

            {mode === 'FORM_STEP' && (
              <p className="text-xs text-muted-foreground">
                This form will be collected{' '}
                <span className="font-medium text-foreground">
                  {formPhase === 'PRE_AUCTION' ? 'before' : 'after'} the auction
                </span>
                .
              </p>
            )}

            {mode === 'PARTICIPATION_FORM_STEP' && (
              <>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={partManualApproval}
                    onChange={(e) => setPartManualApproval(e.target.checked)}
                    className="h-4 w-4 border-input text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  Require manual approval of each submission
                </label>
                <DayHourMinuteFields
                  label="Validate submissions within (before auction start)"
                  daysValue={partValDays}
                  hoursValue={partValHours}
                  minutesValue={partValMinutes}
                  onDaysChange={setPartValDays}
                  onHoursChange={setPartValHours}
                  onMinutesChange={setPartValMinutes}
                />
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode('choose')}>
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={mode === 'FORM_STEP' ? submitFormStep : submitParticipationFormStep}
                disabled={!selectedType || savingStep}
                className="gap-2"
              >
                {savingStep && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {savingStep ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </div>
        )}

        {mode === 'TNC_FORM_STEP' && (
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              Participant would only be able to join the auction after accepting terms and
              conditions.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="tncName">Name</Label>
              <Input
                id="tncName"
                value={tncName}
                onChange={(e) => setTncName(e.target.value)}
                placeholder="Terms and Conditions"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tncDescription">Description</Label>
              <Input
                id="tncDescription"
                value={tncDescription}
                onChange={(e) => setTncDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tncText">Terms and Conditions text</Label>
              <RichTextEditor
                value={tncText}
                onChange={setTncText}
                placeholder="Enter terms and conditions text, or upload a document below..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Or upload a document (.doc, .docx)</Label>
              <label className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2.5 text-xs cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors">
                <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">
                  {tncFile ? tncFile.name : 'Choose a .doc or .docx file...'}
                </span>
                <input
                  type="file"
                  accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  onChange={(e) => setTncFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {tncFile && (
                <button
                  type="button"
                  onClick={() => setTncFile(null)}
                  className="text-[11px] text-destructive hover:underline"
                >
                  Remove file
                </button>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode('choose')}>
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={submitTncStep}
                disabled={uploadingTnc || savingStep}
                className="gap-2"
              >
                {(uploadingTnc || savingStep) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {uploadingTnc ? 'Uploading...' : savingStep ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </div>
        )}

        {mode === 'BANK_DETAIL_FORM_STEP' && (
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              Participant provides their bank details (bank name, IFSC code, account number and a
              cancelled cheque) to receive winning-amount refunds or payouts.
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
              {[
                { label: 'Bank Name', placeholder: 'e.g. State Bank of India' },
                { label: 'Bank IFSC Code', placeholder: 'ICIC0000733' },
                { label: 'Bank Account Number', placeholder: '003210513654' },
              ].map((f) => (
                <div key={f.label} className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                  <div className="rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground/60">
                    {f.placeholder}
                  </div>
                </div>
              ))}
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Cancel Check</span>
                <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground/60">
                  <Upload className="h-3.5 w-3.5" />
                  Cancelled cheque image upload
                </div>
              </div>
            </div>

            {pendingPaymentPhase && (
              <p className="text-xs text-muted-foreground">
                Your {pendingPaymentPhase === 'PRE_AUCTION' ? 'Pre' : 'Post'} Payment step details
                are kept — add this Bank Detail step first, then you&apos;ll return to finish it.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={backTarget}>
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={submitBankDetailStep}
                disabled={savingStep}
                className="gap-2"
              >
                {savingStep && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {savingStep ? 'Adding…' : 'Add Bank Detail Step'}
              </Button>
            </div>
          </div>
        )}

        {(mode === 'PRE_PAYMENT_STEP' || mode === 'POST_PAYMENT_STEP') && (
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              {mode === 'PRE_PAYMENT_STEP'
                ? 'Participant pays this amount before the auction outcome is finalized (e.g. earnest money).'
                : 'Participant pays this amount after winning the auction (e.g. final settlement).'}
            </p>

            <div className="space-y-1.5">
              <Label>Payment mode</Label>
              <div className="flex flex-wrap gap-4 pt-1">
                {paymentModes.map((m) => (
                  <label
                    key={m.value}
                    className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="paymentMode"
                      value={m.value}
                      checked={paymentModeValue === m.value}
                      onChange={() => setPaymentModeValue(m.value)}
                      className="h-4 w-4 border-input text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            <DayHourMinuteFields
              label={
                mode === 'PRE_PAYMENT_STEP'
                  ? 'Offset from auction start time'
                  : 'Offset from auction end time'
              }
              daysValue={offsetDays}
              hoursValue={offsetHours}
              minutesValue={offsetMinutes}
              onDaysChange={setOffsetDays}
              onHoursChange={setOffsetHours}
              onMinutesChange={setOffsetMinutes}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Payment Heads</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={addHead}
                >
                  + Add Head
                </Button>
              </div>
              <div className="space-y-2">
                {heads.map((h, i) => (
                  <div key={i} className="rounded-md border border-border/60 p-2.5 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="Name"
                        value={h.name ?? ''}
                        onChange={(e) => updateHead(i, { name: e.target.value })}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Description"
                        value={h.description ?? ''}
                        onChange={(e) => updateHead(i, { description: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                      <select
                        value={h.basis}
                        onChange={(e) => updateHead(i, { basis: e.target.value })}
                        className={SELECT_CLS}
                      >
                        <option value="PERCENTAGE_BASED">Percentage</option>
                        <option value="AMOUNT_BASED">Amount</option>
                      </select>
                      <Input
                        type="number"
                        placeholder="Value"
                        value={h.value ?? ''}
                        onChange={(e) => updateHead(i, { value: Number(e.target.value) })}
                        className="text-sm"
                      />
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={!!h.refundable}
                          onChange={(e) => updateHead(i, { refundable: e.target.checked })}
                        />
                        Refundable
                      </label>
                      <button
                        type="button"
                        onClick={() => removeHead(i)}
                        disabled={heads.length === 1}
                        className="text-[11px] text-destructive hover:underline justify-self-end disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode('choose')}>
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  submitPaymentStep(mode === 'PRE_PAYMENT_STEP' ? 'PRE_AUCTION' : 'POST_AUCTION')
                }
                disabled={savingStep}
                className="gap-2"
              >
                {savingStep && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {savingStep ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
