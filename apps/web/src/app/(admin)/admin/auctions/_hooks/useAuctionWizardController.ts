'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auctionsApi, type PolicyItemRQ } from '@repo/api';
import { toast } from '@repo/ui';
import { parseApiError } from '@/lib/api-errors';
import {
  SETUP_STEPS,
  STEP_LABELS,
  applyPreset,
  blockerSummary,
  flagDependents,
  isSetupStep,
  type ReviewFlags,
  type WizardStepId,
} from '../_lib/wizard/steps';
import type {
  AwardState,
  BasicsState,
  InviteStats,
  OfferState,
  ParticipationState,
  ScheduleState,
  WizardState,
} from '../_lib/wizard/types';
import { collectIssues, validateStep, type ReviewIssue } from '../_lib/wizard/validation';
import { collectWorkflowIssues } from '../_lib/wizard/stepDraft';
import { useAuctionLookups } from './useAuctionLookups';
import { schedulePayload, useWizardPersistence } from './useWizardPersistence';

export interface AuctionWizardConfig {
  mode: 'create' | 'edit';
  initialState: WizardState;
  /** Null for a new auction until Basics and unit is saved. */
  auctionId: string | null;
  auctionType: string;
  initialStep?: number;
  published?: boolean;
  savedPolicies?: PolicyItemRQ[];
  workflowCounts?: { pre: number; post: number };
  unit?: { id?: string; rawType: string; supported: boolean };
  /** Raw ISO start time, used when the form's start is empty. */
  startTimeFallback?: string;
}

export interface WizardProgress {
  mustFix: ReviewIssue[];
  checks: ReviewIssue[];
  /** Setup steps the admin hasn't opened yet. */
  unopened: WizardStepId[];
  /** Setup steps flagged for another look after an upstream change. */
  toReview: WizardStepId[];
  /** Nothing blocks publishing. */
  ready: boolean;
  /** "2 issues to fix and 1 step to review", or empty when ready. */
  blockerText: string;
}

const ALL_STEPS = new Set([1, 2, 3, 4, 5, 6, 7]);

export function useAuctionWizardController(config: AuctionWizardConfig) {
  const router = useRouter();
  const { mode } = config;

  const [state, setState] = useState(config.initialState);
  const [auctionId, setAuctionId] = useState(config.auctionId);
  const [step, setStep] = useState(config.initialStep ?? 1);
  // An existing auction has been through every step already.
  const [visited, setVisited] = useState<ReadonlySet<number>>(() =>
    mode === 'edit' ? ALL_STEPS : new Set([config.initialStep ?? 1]),
  );
  const [reviewFlags, setReviewFlags] = useState<ReviewFlags>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [published, setPublished] = useState(Boolean(config.published));
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState<'step' | 'save' | 'publish' | null>(null);
  const [workflowCount, setWorkflowCount] = useState(config.workflowCounts?.pre ?? 0);
  const [postWorkflowCount, setPostWorkflowCount] = useState(config.workflowCounts?.post ?? 0);
  const [inviteStats, setInviteStats] = useState<InviteStats | null>(null);

  const { roundingModes, formats, unitTypes, directions, accessibilityTypes, policyTypeOrder } =
    useAuctionLookups(config.auctionType);
  const persistence = useWizardPersistence({
    initialAuctionId: config.auctionId,
    policyTypeOrder,
    savedPolicies: config.savedPolicies,
    unit: config.unit,
    onCreated: setAuctionId,
  });

  // Problems in the saved workflow steps (e.g. a payment with no Bank details
  // before it). Loaded here on every step change so the rail is always right,
  // and pushed straight in by Participation and Award after each change.
  const [workflowIssues, setWorkflowIssues] = useState<ReviewIssue[]>([]);
  useEffect(() => {
    if (!auctionId) return;
    let active = true;
    auctionsApi
      .getAuctionWorkflow(auctionId)
      .then((steps) => {
        if (!active) return;
        const sorted = [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setWorkflowIssues(collectWorkflowIssues(sorted));
      })
      .catch(() => {
        // Keep the last known issues; the step screens show load errors themselves.
      });
    return () => {
      active = false;
    };
  }, [auctionId, step]);

  const issues = useMemo(
    () => [...collectIssues(state, { published }), ...(published ? [] : workflowIssues)],
    [state, published, workflowIssues],
  );

  const progress = useMemo<WizardProgress>(() => {
    const mustFix = issues.filter((issue) => issue.severity === 'must-fix');
    const checks = issues.filter((issue) => issue.severity === 'check');
    const unopened = SETUP_STEPS.filter((id) => !visited.has(id));
    const toReview = SETUP_STEPS.filter((id) => visited.has(id) && reviewFlags[id]);
    return {
      mustFix,
      checks,
      unopened,
      toReview,
      ready: !mustFix.length && !unopened.length && !toReview.length,
      blockerText: blockerSummary({
        mustFix: mustFix.length,
        unopened: unopened.length,
        toReview: toReview.length,
      }),
    };
  }, [issues, visited, reviewFlags]);

  /** Publishing locks the rules as version 1: setup steps become read-only. */
  const locked = published && isSetupStep(step);
  const isPrivate = state.basics.accessibility === 'PRIVATE';

  // ---------- editing

  const patch = <K extends keyof WizardState>(key: K, value: Partial<WizardState[K]>) => {
    setErrors({});
    setState((prev) => ({ ...prev, [key]: { ...prev[key], ...value } }));
  };

  const patchBasics = (value: Partial<BasicsState>) => {
    if (value.preset !== undefined && value.preset !== state.basics.preset) {
      const { preset, ...rest } = value;
      setErrors({});
      setState((prev) =>
        applyPreset({ ...prev, basics: { ...prev.basics, ...rest } }, preset ?? 'none'),
      );
      if (preset !== 'none') {
        setReviewFlags((flags) => flagDependents(flags, 'preset', visited, step));
      }
      return;
    }
    if (value.direction && value.direction !== state.basics.direction) {
      setReviewFlags((flags) => flagDependents(flags, 'direction', visited, step));
    }
    patch('basics', value);
  };

  const patchOffer = (value: Partial<OfferState>) => {
    if (value.mechanism && value.mechanism !== state.offer.mechanism) {
      setReviewFlags((flags) => flagDependents(flags, 'mechanism', visited, step));
    }
    patch('offer', value);
  };

  const patchSchedule = (value: Partial<ScheduleState>) => patch('schedule', value);
  const patchParticipation = (value: Partial<ParticipationState>) => patch('participation', value);
  const patchAward = (value: Partial<AwardState>) => patch('award', value);

  const markReviewed = (target: number) =>
    setReviewFlags((flags) => {
      const next = { ...flags };
      delete next[target as WizardStepId];
      return next;
    });

  // ---------- navigation

  const goToStep = (target: number) => {
    if (target >= 4 && target <= 6 && !auctionId) {
      toast.error('Finish Basics and unit before opening this step.');
      return;
    }
    setErrors({});
    setStep(target);
    setVisited((prev) => (prev.has(target) ? prev : new Set(prev).add(target)));
  };

  const reportError = (err: unknown, fallback: string) => {
    const parsed = parseApiError(err);
    // The summary names every violation, e.g. "Sub categories must not be empty."
    const message = parsed.summary || fallback;
    setErrors({ ...parsed.fieldErrors, general: message });
    toast.error(message);
  };

  /** Validates and saves the current setup step, then opens the next one. */
  const goNext = async () => {
    const next = step + 1;
    if (!isSetupStep(step) || locked) {
      goToStep(next);
      return;
    }
    const stepErrors = validateStep(step, state, { published });
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      toast.error(`${STEP_LABELS[step]} still needs attention.`);
      return;
    }

    setBusy('step');
    try {
      if (step === 1) await persistence.persistBasics(state);
      if (step === 2) {
        await persistence.persistBasics(state);
        await persistence.persistPolicies(state);
      }
      if (step === 3 && schedulePayload(state)) await persistence.persistSchedule(state);
      if (step === 4 || step === 5) await persistence.persistPolicies(state);
      setSavedAt(new Date());
      markReviewed(step);
      goToStep(next);
    } catch (err) {
      reportError(err, `Could not save ${STEP_LABELS[step]}.`);
    } finally {
      setBusy(null);
    }
  };

  const goBack = () => goToStep(Math.max(1, step - 1));

  // ---------- saving and publishing

  const saveDraft = async () => {
    if (!state.basics.title.trim()) {
      setErrors({ title: 'Title is required.' });
      goToStep(1);
      toast.error('Add a title before saving.');
      return;
    }
    const basicsErrors = validateStep(1, state);
    if (!auctionId && (basicsErrors.items || basicsErrors.openingPrice)) {
      toast.error('Add a listing and an opening price before saving a draft.');
      return;
    }
    setBusy('save');
    try {
      await persistence.persistBasics(state);
      // Clock and sealed rules aside, broken windows can't be written as policies yet.
      if (!validateStep(2, state).windows) await persistence.persistPolicies(state);
      if (schedulePayload(state)) await persistence.persistSchedule(state);
      setSavedAt(new Date());
      toast.success(mode === 'edit' ? 'Changes saved.' : 'Draft saved.');
    } catch (err) {
      reportError(err, 'Could not save the auction.');
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (published) return;
    const { mustFix, unopened, toReview } = progress;
    if (mustFix.length) {
      const first = mustFix[0]!;
      goToStep(first.goto);
      toast.error(first.message);
      return;
    }
    if (unopened.length || toReview.length) {
      const target = (unopened[0] ?? toReview[0])!;
      goToStep(target);
      toast.error(
        unopened.length
          ? `Open ${STEP_LABELS[target]} before publishing.`
          : `Review ${STEP_LABELS[target]} before publishing.`,
      );
      return;
    }

    setBusy('publish');
    setErrors({});
    try {
      await persistence.publish(state);
      setPublished(true);
      setPublishedAt(new Date().toISOString());
      setSavedAt(new Date());
      toast.success('Auction published.');
      if (isPrivate) goToStep(7);
    } catch (err) {
      reportError(err, 'Could not publish the auction.');
    } finally {
      setBusy(null);
    }
  };

  const exit = () => router.push('/admin/auctions');
  const finish = () =>
    router.push(auctionId ? `/admin/auctions/${auctionId}/view` : '/admin/auctions');

  return {
    mode,
    auctionId,
    state,
    step,
    visited,
    reviewFlags,
    errors,
    issues,
    progress,
    published,
    publishedAt,
    locked,
    isPrivate,
    savedAt,
    busy,
    roundingModes,
    formats,
    unitTypes,
    directions,
    accessibilityTypes,
    workflowCount,
    postWorkflowCount,
    inviteStats,
    unitNotice:
      config.unit && !config.unit.supported && config.unit.rawType
        ? config.unit.rawType.replace(/_/g, ' ').toLowerCase()
        : null,
    startTime: state.schedule.startTime || config.startTimeFallback || '',
    patchBasics,
    patchOffer,
    patchSchedule,
    patchParticipation,
    patchAward,
    markReviewed,
    goToStep,
    goNext,
    goBack,
    saveDraft,
    publish,
    exit,
    finish,
    // React state setters are stable, so children can list them as effect deps.
    setWorkflowCount,
    setPostWorkflowCount,
    setInviteStats,
    setWorkflowIssues,
  };
}

export type AuctionWizardContextValue = ReturnType<typeof useAuctionWizardController>;
