'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  auctionsApi,
  type AuctionScheduleRQ,
  type AuctionUnitType,
  type AuctionUpdationRQ,
  type PolicyItemRQ,
} from '@repo/api';
import { Button, toast } from '@repo/ui';
import { Loader2 } from 'lucide-react';
import { parseApiError } from '@/lib/api-errors';
import type { SelectOption } from '../../_components/AuctionShared';
import { InviteAuctionProvider } from '../../_components/InviteContext';
import { mapAuctionToWizardState } from '../../_components/editWizardMapping';
import { AuctionWizardShell } from '../../new/_components/shell/AuctionWizardShell';
import { Step1BasicsUnit } from '../../new/_components/steps/Step1BasicsUnit';
import { Step2OfferRules } from '../../new/_components/steps/Step2OfferRules';
import { Step3Schedule } from '../../new/_components/steps/Step3Schedule';
import { Step4Participation } from '../../new/_components/steps/Step4Participation';
import { Step5Award } from '../../new/_components/steps/Step5Award';
import { Step6Review } from '../../new/_components/steps/Step6Review';
import { Step7Invite } from '../../new/_components/steps/Step7Invite';
import type {
  AwardState,
  BasicsState,
  InviteStats,
  OfferState,
  ParticipationState,
  ScheduleState,
  WizardState,
} from '../../new/_components/shared/types';
import { initialWizardState } from '../../new/_components/shared/types';
import {
  buildPolicyPayload,
  buildUnit,
  mergePolicyPayload,
  offerVisibilityValue,
  participantVisibilityValue,
} from '../../new/_components/shared/payload';
import { endTimeFor, latestCloseFor } from '../../new/_components/shared/summary';
import {
  STEP_LABELS,
  collectIssues,
  validateBasics,
  validateOffer,
  validateParticipation,
  validateSchedule,
} from '../../new/_components/shared/validation';
import { isPostStep } from '../../new/_components/shared/workflow';

function emptyState(): WizardState {
  return {
    ...initialWizardState,
    basics: { ...initialWizardState.basics, items: [] },
    offer: {
      ...initialWizardState.offer,
      windows: initialWizardState.offer.windows.map((window) => ({ ...window })),
    },
    schedule: { ...initialWizardState.schedule },
    participation: { ...initialWizardState.participation },
    award: { ...initialWizardState.award },
  };
}

/** The edit route originally had six steps. Keep existing deep links working
 *  while accepting the new seven-step numbers. */
function requestedStep(raw: string | null): number {
  const requested = parseInt(raw ?? '', 10);
  if (Number.isNaN(requested)) return 1;
  const legacy: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 3, 6: 7 };
  return legacy[requested] ?? (requested >= 1 && requested <= 7 ? requested : 1);
}

function LoadState({ error, onBack }: { error?: string | null; onBack?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      {error ? (
        <>
          <p className="text-sm font-semibold text-foreground">Could not load the auction</p>
          <p className="max-w-md text-xs text-muted-foreground">{error}</p>
          {onBack && (
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              Back to auctions
            </Button>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading auction…
        </div>
      )}
    </div>
  );
}

export default function EditAuctionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(() => requestedStep(searchParams.get('step')));
  const [reached, setReached] = useState(1);
  const [state, setState] = useState<WizardState>(emptyState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [unitId, setUnitId] = useState<string | undefined>(undefined);
  const [rawUnitType, setRawUnitType] = useState('');
  const [unitSupported, setUnitSupported] = useState(true);
  const [auctionType, setAuctionType] = useState('');
  const [startTimeRaw, setStartTimeRaw] = useState('');

  const [savingStep, setSavingStep] = useState(false);
  const [savingShell, setSavingShell] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  const [roundingModes, setRoundingModes] = useState<SelectOption[]>([]);
  const [policyTypeOrder, setPolicyTypeOrder] = useState<string[]>([]);
  const [inviteStats, setInviteStats] = useState<InviteStats | null>(null);
  const [workflowCount, setWorkflowCount] = useState(0);
  const [postWorkflowCount, setPostWorkflowCount] = useState(0);
  const [minimumPolicy, setMinimumPolicy] = useState<PolicyItemRQ | null>(null);

  const savedPoliciesRef = useRef<PolicyItemRQ[]>([]);

  useEffect(() => {
    let active = true;
    setPageLoading(true);
    setLoadError(null);

    Promise.all([
      auctionsApi.getAuctionById(id, ['*']),
      auctionsApi.getAuctionPolicies(id).catch(() => [] as PolicyItemRQ[]),
      auctionsApi.getAuctionWorkflow(id).catch(() => []),
    ])
      .then(([auction, savedPolicies, workflow]) => {
        if (!active) return;
        const snapshot = mapAuctionToWizardState(auction, savedPolicies);
        setState(snapshot.state);
        setUnitId(snapshot.unitId);
        setRawUnitType(snapshot.rawUnitType);
        setUnitSupported(snapshot.unitSupported);
        setAuctionType(snapshot.auctionType);
        setStartTimeRaw(snapshot.startTime);
        savedPoliciesRef.current = savedPolicies;

        const isPublished = snapshot.status === 'PUBLISHED' || snapshot.status === 'LIVE';
        setPublished(isPublished);
        // The auction model has no separate publish timestamp; updatedAt moves
        // on every edit, so leave the date blank rather than claim a false one.
        setPublishedAt(null);
        setReached(7);

        const sorted = [...workflow].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setWorkflowCount(sorted.filter((item) => !isPostStep(item)).length);
        setPostWorkflowCount(sorted.filter(isPostStep).length);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(parseApiError(err).general ?? 'Could not load the auction.');
      })
      .finally(() => {
        if (active) setPageLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    auctionsApi
      .getRoundingModeTypes()
      .then(setRoundingModes)
      .catch(() => setRoundingModes([]));
  }, []);

  useEffect(() => {
    if (!auctionType) return;
    auctionsApi
      .getPolicyTypes(auctionType)
      .then((types) => setPolicyTypeOrder(types.map((type) => type.value)))
      .catch(() => setPolicyTypeOrder([]));
  }, [auctionType]);

  const issues = useMemo(
    () =>
      collectIssues(state).filter((issue) => {
        // A published or live auction legitimately has a start in the past.
        if (published && issue.step === 3 && issue.message === 'Set a start time in the future.') {
          return false;
        }
        // Clock and sealed auctions do not use price-progression windows.
        if (
          state.offer.mechanism !== 'OPEN' &&
          issue.step === 2 &&
          issue.message === 'Add at least one price window.'
        ) {
          return false;
        }
        return true;
      }),
    [published, state],
  );

  const patchBasics = (patch: Partial<BasicsState>) => {
    setErrors({});
    setState((prev) => ({ ...prev, basics: { ...prev.basics, ...patch } }));
  };
  const patchOffer = (patch: Partial<OfferState>) => {
    setErrors({});
    setState((prev) => ({ ...prev, offer: { ...prev.offer, ...patch } }));
  };
  const patchSchedule = (patch: Partial<ScheduleState>) => {
    setErrors({});
    setState((prev) => ({ ...prev, schedule: { ...prev.schedule, ...patch } }));
  };
  const patchParticipation = (patch: Partial<ParticipationState>) => {
    setErrors({});
    setState((prev) => ({ ...prev, participation: { ...prev.participation, ...patch } }));
  };
  const patchAward = (patch: Partial<AwardState>) => {
    setErrors({});
    setState((prev) => ({ ...prev, award: { ...prev.award, ...patch } }));
  };

  const handleWorkflowCountChange = useCallback((count: number) => setWorkflowCount(count), []);
  const handlePostWorkflowCountChange = useCallback(
    (count: number) => setPostWorkflowCount(count),
    [],
  );
  const handleWorkflowPolicyChange = useCallback(
    (policy: PolicyItemRQ | null) => setMinimumPolicy(policy),
    [],
  );
  const handleInviteStatsChange = useCallback((stats: InviteStats) => setInviteStats(stats), []);

  const goToStep = (target: number) => {
    setErrors({});
    setStep(target);
    setReached((current) => Math.max(current, target));
  };

  const buildUnitPayload = () => {
    const unit = buildUnit(state.basics, unitId);
    if (unit && !unitSupported && rawUnitType) {
      // Keep legacy MULTI_UNIT / LOT auctions in their original shape.
      unit.type = rawUnitType as AuctionUnitType;
    }
    return unit;
  };

  const persistBasics = async () => {
    const payload: AuctionUpdationRQ = {
      title: state.basics.title.trim(),
      description: state.basics.description.trim() || undefined,
      referenceId: state.basics.referenceId.trim() || undefined,
      accessibility: state.basics.accessibility,
      direction: state.basics.direction,
      participantVisibility: participantVisibilityValue(state.offer.participantVisibility),
      offerVisibility: offerVisibilityValue(state.offer.offerVisibility),
      monetaryOptions: {
        currencyUnit: state.basics.currencyUnit,
        precision: parseInt(state.basics.precision, 10) || 0,
        roundingMode: state.basics.roundingMode,
      },
    };
    const unit = buildUnitPayload();
    if (unit) payload.unit = unit;
    await auctionsApi.updateAuction(id, payload);
  };

  const persistPolicies = async () => {
    const next = buildPolicyPayload(state, minimumPolicy, policyTypeOrder);
    const merged = mergePolicyPayload(savedPoliciesRef.current, next);
    await auctionsApi.setAuctionPolicies(id, merged);
    savedPoliciesRef.current = merged;
  };

  const schedulePayload = (): AuctionScheduleRQ | null => {
    const start = new Date(state.schedule.startTime);
    const closing = endTimeFor(state.schedule);
    const end = closing ? new Date(closing) : null;
    if (Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) return null;
    return { startTime: start.toISOString(), endTime: end.toISOString() };
  };

  const persistSchedule = async () => {
    const payload = schedulePayload();
    if (payload) await auctionsApi.scheduleAuction(id, payload);
  };

  const persistAll = async () => {
    await persistBasics();
    await persistPolicies();
    await persistSchedule();
  };

  const reportError = (err: unknown, fallback: string) => {
    const parsed = parseApiError(err);
    const message = parsed.general ?? (err instanceof Error ? err.message : fallback);
    setErrors({ ...parsed.fieldErrors, general: message });
    toast.error(message);
  };

  const handleStep1Next = async () => {
    const nextErrors = validateBasics(state.basics);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      toast.error('Some details still need attention.');
      return;
    }
    setErrors({});
    setSavingStep(true);
    try {
      await persistBasics();
      goToStep(2);
    } catch (err) {
      reportError(err, 'Could not save the auction.');
    } finally {
      setSavingStep(false);
    }
  };

  const handleStep2Next = async () => {
    const nextErrors = validateOffer(state.offer);
    if (
      state.offer.mechanism !== 'OPEN' &&
      nextErrors.windows === 'Add at least one price window.'
    ) {
      delete nextErrors.windows;
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      toast.error('Some offer rules still need attention.');
      return;
    }
    setErrors({});
    setSavingStep(true);
    try {
      await persistBasics();
      await persistPolicies();
      goToStep(3);
    } catch (err) {
      reportError(err, 'Could not save the offer rules.');
    } finally {
      setSavingStep(false);
    }
  };

  const handleStep3Next = async () => {
    const nextErrors = validateSchedule(state.schedule);
    if (published && nextErrors.startTime === 'Bidding must open in the future.') {
      delete nextErrors.startTime;
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      toast.error('Some schedule details still need attention.');
      return;
    }
    setErrors({});
    setSavingStep(true);
    try {
      if (schedulePayload()) await persistSchedule();
      goToStep(4);
    } catch (err) {
      reportError(err, 'Could not save the schedule.');
    } finally {
      setSavingStep(false);
    }
  };

  const handleStep4Next = async () => {
    const nextErrors = validateParticipation(state.participation);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      toast.error('Some participation details still need attention.');
      return;
    }
    setErrors({});
    setSavingStep(true);
    try {
      await persistPolicies();
      goToStep(5);
    } catch (err) {
      reportError(err, 'Could not save the participation rules.');
    } finally {
      setSavingStep(false);
    }
  };

  const handleStep5Next = async () => {
    setErrors({});
    setSavingStep(true);
    try {
      await persistPolicies();
      goToStep(6);
    } catch (err) {
      reportError(err, 'Could not save the award rules.');
    } finally {
      setSavingStep(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!state.basics.title.trim()) {
      setErrors({ title: 'Title is required.' });
      setStep(1);
      toast.error('Add a title before saving.');
      return;
    }
    setErrors({});
    setSavingShell(true);
    try {
      await persistAll();
      toast.success('Changes saved.');
    } catch (err) {
      reportError(err, 'Could not save the auction changes.');
    } finally {
      setSavingShell(false);
    }
  };

  const handlePublish = async () => {
    if (published) return;
    const blocking = issues.filter((issue) => issue.severity === 'must-fix');
    if (blocking.length > 0) {
      const first = blocking[0]!;
      setStep(first.goto);
      setErrors({ general: first.message });
      toast.error(first.message);
      return;
    }
    if (reached < 5) {
      const next = [1, 2, 3, 4, 5].find((target) => target > reached) ?? 5;
      setStep(next);
      setErrors({});
      toast.error(`Open ${STEP_LABELS[next]} before publishing.`);
      return;
    }

    setPublishing(true);
    setErrors({});
    try {
      await persistAll();
      await auctionsApi.publishAuction(id);
      setPublished(true);
      setPublishedAt(new Date().toISOString());
      setStep(7);
      setReached(7);
      toast.success('Auction published.');
    } catch (err) {
      reportError(err, 'Could not publish the auction.');
    } finally {
      setPublishing(false);
    }
  };

  const handleFinish = () => router.push(`/admin/auctions/${id}/view`);

  if (pageLoading) return <LoadState />;
  if (loadError) {
    return <LoadState error={loadError} onBack={() => router.push('/admin/auctions')} />;
  }

  return (
    <AuctionWizardShell
      state={state}
      current={step}
      reached={reached}
      workflowCount={workflowCount}
      postWorkflowCount={postWorkflowCount}
      issues={issues}
      savingDraft={savingShell}
      published={published}
      publishedAt={publishedAt}
      inviteStats={inviteStats}
      editMode
      onStepClick={goToStep}
      onSaveDraft={() => void handleSaveChanges()}
      onBackToAuctions={() => router.push('/admin/auctions')}
      onInvite={() => goToStep(7)}
    >
      {!unitSupported && step === 1 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-foreground">
          This auction uses a{' '}
          <span className="font-semibold">{rawUnitType.replace(/_/g, ' ').toLowerCase()}</span>{' '}
          unit. The simple editor keeps that unit type when saving; its listings still appear below.
        </div>
      )}

      {step === 1 && (
        <Step1BasicsUnit
          form={state.basics}
          onChange={patchBasics}
          errors={errors}
          saving={savingStep}
          onNext={() => void handleStep1Next()}
        />
      )}

      {step === 2 && (
        <Step2OfferRules
          form={state.offer}
          onChange={patchOffer}
          schedule={state.schedule}
          direction={state.basics.direction}
          openingPrice={state.basics.openingPrice}
          currencyUnit={state.basics.currencyUnit}
          roundingModes={roundingModes}
          roundingMode={state.basics.roundingMode}
          onRoundingModeChange={(value) => patchBasics({ roundingMode: value })}
          errors={errors}
          saving={savingStep}
          onBack={() => goToStep(1)}
          onNext={() => void handleStep2Next()}
        />
      )}

      {step === 3 && (
        <Step3Schedule
          form={state.schedule}
          onChange={patchSchedule}
          clockMechanism={state.offer.mechanism === 'CLOCK'}
          errors={errors}
          saving={savingStep}
          onBack={() => goToStep(2)}
          onNext={() => void handleStep3Next()}
        />
      )}

      {step === 4 && (
        <Step4Participation
          auctionId={id}
          form={state.participation}
          onChange={patchParticipation}
          isPrivate={state.basics.accessibility === 'PRIVATE'}
          startTime={state.schedule.startTime}
          errors={errors}
          saving={savingStep}
          onBack={() => goToStep(3)}
          onNext={() => void handleStep4Next()}
          onWorkflowCountChange={handleWorkflowCountChange}
          onWorkflowPolicyChange={handleWorkflowPolicyChange}
        />
      )}

      {step === 5 && (
        <Step5Award
          auctionId={id}
          form={state.award}
          onChange={patchAward}
          direction={state.basics.direction}
          mechanism={state.offer.mechanism}
          offerVisibility={state.offer.offerVisibility}
          reserveEnabled={state.basics.reserveEnabled}
          openingPrice={state.basics.openingPrice}
          currencyUnit={state.basics.currencyUnit}
          endTime={endTimeFor(state.schedule)}
          latestClose={latestCloseFor(state.schedule)}
          saving={savingStep}
          onBack={() => goToStep(4)}
          onNext={() => void handleStep5Next()}
          onGoToBasics={() => goToStep(1)}
          onPostWorkflowCountChange={handlePostWorkflowCountChange}
        />
      )}

      {step === 6 && (
        <Step6Review
          auctionId={id}
          state={state}
          workflowCount={workflowCount}
          postWorkflowCount={postWorkflowCount}
          issues={issues}
          reached={reached}
          publishing={publishing}
          published={published}
          publishedAt={publishedAt}
          error={errors.general ?? null}
          onEdit={goToStep}
          onBack={() => goToStep(5)}
          onPublish={() => void handlePublish()}
          onInvite={() => goToStep(7)}
        />
      )}

      {step === 7 && (
        <InviteAuctionProvider
          value={{
            auctionId: id,
            isPublic: state.basics.accessibility === 'PUBLIC',
            published,
            readyToPublish: !issues.some((issue) => issue.severity === 'must-fix'),
            startTime: state.schedule.startTime || startTimeRaw,
            participation: state.participation,
          }}
        >
          <Step7Invite
            onChangeAccess={() => goToStep(1)}
            onBack={() => goToStep(6)}
            onFinish={handleFinish}
            onStatsChange={handleInviteStatsChange}
          />
        </InviteAuctionProvider>
      )}
    </AuctionWizardShell>
  );
}
