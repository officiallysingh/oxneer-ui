'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auctionsApi, type AuctionCreationRQ, type PolicyItemRQ } from '@repo/api';
import { Button, toast } from '@repo/ui';
import { parseApiError } from '@/lib/api-errors';
import type { SelectOption } from '../_components/AuctionShared';
import { InviteAuctionProvider } from '../_components/InviteContext';
import { AuctionWizardShell } from './_components/shell/AuctionWizardShell';
import { Step1BasicsUnit } from './_components/steps/Step1BasicsUnit';
import { Step2OfferRules } from './_components/steps/Step2OfferRules';
import { Step3Schedule } from './_components/steps/Step3Schedule';
import { Step4Participation } from './_components/steps/Step4Participation';
import { Step5Award } from './_components/steps/Step5Award';
import { Step6Review } from './_components/steps/Step6Review';
import { Step7Invite } from './_components/steps/Step7Invite';
import type {
  AwardState,
  BasicsState,
  InviteStats,
  OfferState,
  ParticipationState,
  ScheduleState,
  WizardState,
} from './_components/shared/types';
import { initialWizardState } from './_components/shared/types';
import {
  AUCTION_TYPE,
  buildPolicyPayload,
  buildUnit,
  offerVisibilityValue,
  participantVisibilityValue,
} from './_components/shared/payload';
import { endTimeFor, latestCloseFor } from './_components/shared/summary';
import {
  STEP_LABELS,
  collectIssues,
  validateBasics,
  validateOffer,
  validateParticipation,
  validateSchedule,
} from './_components/shared/validation';

function freshState(): WizardState {
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

function MissingStep({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
      <p className="text-sm font-semibold text-foreground">Finish Basics and unit first</p>
      <p className="mt-1 text-xs text-muted-foreground">
        The auction has to exist before you can set up participation, award or invitations.
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onBack}>
        Back to Basics and unit
      </Button>
    </div>
  );
}

export default function NewAuctionPage() {
  const router = useRouter();

  const [state, setState] = useState<WizardState>(freshState);
  const [step, setStep] = useState(1);
  const [reached, setReached] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [createdAuctionId, setCreatedAuctionId] = useState<string | null>(null);
  const [savingStep1, setSavingStep1] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  const [roundingModes, setRoundingModes] = useState<SelectOption[]>([]);
  const [policyTypeOrder, setPolicyTypeOrder] = useState<string[]>([]);
  const [inviteStats, setInviteStats] = useState<InviteStats | null>(null);

  const [workflowCount, setWorkflowCount] = useState(0);
  const [postWorkflowCount, setPostWorkflowCount] = useState(0);
  const [minimumPolicy, setMinimumPolicy] = useState<PolicyItemRQ | null>(null);

  useEffect(() => {
    auctionsApi
      .getRoundingModeTypes()
      .then(setRoundingModes)
      .catch(() => setRoundingModes([]));

    auctionsApi
      .getPolicyTypes(AUCTION_TYPE)
      .then((types) => {
        setPolicyTypeOrder(types.map((type) => type.value));
      })
      .catch(() => setPolicyTypeOrder([]));
  }, []);

  const issues = collectIssues(state);

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
    if (published && target !== 6 && target !== 7) {
      toast.error('This auction is already published. Edit it from the auction page.');
      return;
    }
    if (target >= 4 && !createdAuctionId) {
      toast.error('Finish Basics and unit before opening this step.');
      return;
    }
    setErrors({});
    setStep(target);
    setReached((current) => Math.max(current, target));
  };

  const protocol = () => ({
    accessibility: state.basics.accessibility,
    direction: state.basics.direction,
    dimension: 'ONE_DIMENSIONAL',
    participantVisibility: participantVisibilityValue(state.offer.participantVisibility),
    offerVisibility: offerVisibilityValue(state.offer.offerVisibility),
  });

  const monetaryOptions = () => ({
    currencyUnit: state.basics.currencyUnit,
    precision: parseInt(state.basics.precision, 10) || 0,
    roundingMode: state.basics.roundingMode,
  });

  /** Creates the draft on first save and updates it afterwards. Every later step
   *  writes against the same auction id. */
  const persistBasics = async (): Promise<string> => {
    const unit = buildUnit(state.basics);
    const title = state.basics.title.trim();
    const description = state.basics.description.trim() || undefined;
    const referenceId = state.basics.referenceId.trim() || undefined;

    if (createdAuctionId) {
      await auctionsApi.updateAuction(createdAuctionId, {
        title,
        description,
        referenceId,
        accessibility: state.basics.accessibility,
        direction: state.basics.direction,
        participantVisibility: protocol().participantVisibility,
        offerVisibility: protocol().offerVisibility,
        monetaryOptions: monetaryOptions(),
        unit,
      });
      return createdAuctionId;
    }

    const payload: AuctionCreationRQ = {
      type: AUCTION_TYPE,
      format: 'SIMPLE',
      title,
      description,
      referenceId,
      protocol: protocol(),
      monetaryOptions: monetaryOptions(),
      unit,
    };
    const id = await auctionsApi.createAuction(payload);
    setCreatedAuctionId(id);
    return id;
  };

  const handleStep1Next = async () => {
    const nextErrors = validateBasics(state.basics);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      toast.error('Some details still need attention.');
      return;
    }
    setErrors({});
    setSavingStep1(true);
    try {
      await persistBasics();
      goToStep(2);
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors({
        ...parsed.fieldErrors,
        general: parsed.general ?? 'Could not save the auction.',
      });
      toast.error(parsed.general ?? 'Could not save the auction.');
    } finally {
      setSavingStep1(false);
    }
  };

  const handleStep2Next = () => {
    const nextErrors = validateOffer(state.offer);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      toast.error('Some offer rules still need attention.');
      return;
    }
    goToStep(3);
  };

  const handleStep3Next = () => {
    const nextErrors = validateSchedule(state.schedule);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      toast.error('Some schedule details still need attention.');
      return;
    }
    goToStep(4);
  };

  const handleStep4Next = () => {
    const nextErrors = validateParticipation(state.participation);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      toast.error('Some participation details still need attention.');
      return;
    }
    goToStep(5);
  };

  const handleSaveDraft = async () => {
    if (!state.basics.title.trim()) {
      toast.error('Add a title before saving a draft.');
      return;
    }
    const basicsErrors = validateBasics(state.basics);
    if (!createdAuctionId && (basicsErrors.items || basicsErrors.openingPrice)) {
      toast.error('Add a listing and an opening price before saving a draft.');
      return;
    }
    setSavingDraft(true);
    try {
      const id = await persistBasics();
      // Workflow changes are saved by their own dialogs, but the offer rules,
      // extension, minimum-participants and award settings live in policies.
      if (!validateOffer(state.offer).windows) {
        await auctionsApi.setAuctionPolicies(
          id,
          buildPolicyPayload(state, minimumPolicy, policyTypeOrder),
        );
      }
      toast.success('Draft saved. You can finish setting it up later.');
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors({ general: parsed.general ?? 'Could not save the draft.' });
      toast.error(parsed.general ?? 'Could not save the draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
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
    if (!createdAuctionId) {
      toast.error('Finish Basics and unit before publishing.');
      return;
    }

    setPublishing(true);
    setErrors({});
    try {
      await persistBasics();

      const policies = buildPolicyPayload(state, minimumPolicy, policyTypeOrder);
      await auctionsApi.setAuctionPolicies(createdAuctionId, policies);

      const start = new Date(state.schedule.startTime);
      const closing = endTimeFor(state.schedule);
      const end = new Date(closing);
      await auctionsApi.scheduleAuction(createdAuctionId, {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      await auctionsApi.publishAuction(createdAuctionId);

      setPublished(true);
      setPublishedAt(new Date().toISOString());
      setStep(7);
      setReached(7);
      toast.success('Auction published.');
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors({ general: parsed.general ?? 'Could not publish the auction.' });
      toast.error(parsed.general ?? 'Could not publish the auction.');
    } finally {
      setPublishing(false);
    }
  };

  const handleFinish = () => {
    if (createdAuctionId) router.push(`/admin/auctions/${createdAuctionId}/view`);
    else router.push('/admin/auctions');
  };

  return (
    <AuctionWizardShell
      state={state}
      current={step}
      reached={reached}
      workflowCount={workflowCount}
      postWorkflowCount={postWorkflowCount}
      issues={issues}
      savingDraft={savingDraft}
      published={published}
      publishedAt={publishedAt}
      inviteStats={inviteStats}
      onStepClick={goToStep}
      onSaveDraft={() => void handleSaveDraft()}
      onBackToAuctions={() => router.push('/admin/auctions')}
      onInvite={() => goToStep(7)}
    >
      {step === 1 && (
        <Step1BasicsUnit
          form={state.basics}
          onChange={patchBasics}
          errors={errors}
          saving={savingStep1}
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
          saving={false}
          onBack={() => goToStep(1)}
          onNext={handleStep2Next}
        />
      )}

      {step === 3 && (
        <Step3Schedule
          form={state.schedule}
          onChange={patchSchedule}
          clockMechanism={state.offer.mechanism === 'CLOCK'}
          errors={errors}
          saving={false}
          onBack={() => goToStep(2)}
          onNext={handleStep3Next}
        />
      )}

      {step === 4 &&
        (createdAuctionId ? (
          <Step4Participation
            auctionId={createdAuctionId}
            form={state.participation}
            onChange={patchParticipation}
            isPrivate={state.basics.accessibility === 'PRIVATE'}
            startTime={state.schedule.startTime}
            errors={errors}
            saving={false}
            onBack={() => goToStep(3)}
            onNext={handleStep4Next}
            onWorkflowCountChange={handleWorkflowCountChange}
            onWorkflowPolicyChange={handleWorkflowPolicyChange}
          />
        ) : (
          <MissingStep onBack={() => goToStep(1)} />
        ))}

      {step === 5 &&
        (createdAuctionId ? (
          <Step5Award
            auctionId={createdAuctionId}
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
            saving={false}
            onBack={() => goToStep(4)}
            onNext={() => goToStep(6)}
            onGoToBasics={() => goToStep(1)}
            onPostWorkflowCountChange={handlePostWorkflowCountChange}
          />
        ) : (
          <MissingStep onBack={() => goToStep(1)} />
        ))}

      {step === 6 &&
        (createdAuctionId ? (
          <Step6Review
            auctionId={createdAuctionId}
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
        ) : (
          <MissingStep onBack={() => goToStep(1)} />
        ))}

      {step === 7 &&
        (createdAuctionId ? (
          <InviteAuctionProvider
            value={{
              auctionId: createdAuctionId,
              isPublic: state.basics.accessibility === 'PUBLIC',
              published,
              readyToPublish: !issues.some((issue) => issue.severity === 'must-fix'),
              startTime: state.schedule.startTime,
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
        ) : (
          <MissingStep onBack={() => goToStep(1)} />
        ))}
    </AuctionWizardShell>
  );
}
