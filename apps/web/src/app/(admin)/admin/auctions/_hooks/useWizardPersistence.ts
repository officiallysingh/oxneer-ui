'use client';

import { useRef } from 'react';
import {
  auctionsApi,
  listingsApi,
  type AuctionCreationRQ,
  type AuctionScheduleRQ,
  type AuctionUnitType,
  type AddWorkflowStepRQ,
  type PolicyItemRQ,
  type WorkflowStepPhase,
} from '@repo/api';
import {
  AUCTION_TYPE,
  buildOfferRules,
  buildPostAuctionPolicies,
  buildPreAuctionPolicies,
  buildReservePricePolicy,
  buildUnit,
  isClearingPolicy,
  isParticipationPolicy,
  isWizardPhasePolicy,
  workflowStepPhase,
} from '../_lib/wizard/payload';
import { resolveStr } from '@/components/common/admin/format';
import type { SelectedListing, WizardState } from '../_lib/wizard/types';
import { zonedInputToOffsetIso } from '../_lib/wizard/zonedTime';
import {
  EMPTY_PENDING_STEPS,
  pendingRequests,
  type PendingStep,
  type PendingSteps,
} from '../_lib/wizard/pendingSteps';

/** The API saves Award whole: who wins, what they pay and the winner's payment. */
export const AWARD_NEEDS_PAYMENT =
  'Add a payment step for the winner. Award is saved together with it.';

export interface PersistenceOptions {
  /** Null until the create flow saves Basics for the first time. */
  initialAuctionId: string | null;
  /** Edit only: keeps legacy MULTI_UNIT / LOT units in their original shape. */
  unit?: { id?: string; rawType: string; supported: boolean };
  /** Edit only: the auction already has a schedule, which the API sets once. */
  scheduled?: boolean;
  onCreated?: (id: string) => void;
}

/** The auction is filed under the subcategories of the listings in its unit;
 *  the API requires at least one. Items picked in this session carry their
 *  subcategory; for older ones it is looked up from the listing. */
async function unitSubCategories(items: SelectedListing[]): Promise<string[]> {
  const ids = await Promise.all(
    items.map(async (item) => {
      if (item.subCategoryId) return item.subCategoryId;
      try {
        const listing = await listingsApi.getListingById(item.id);
        return typeof listing.subCategory === 'string'
          ? listing.subCategory
          : listing.subCategory?.id;
      } catch {
        return undefined;
      }
    }),
  );
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

/** Body for `PUT /{id}/schedule`, or null while the times are incomplete.
 *  Times are read in the auction's time zone; soft close goes with it, and
 *  only for open bidding. */
export function schedulePayload(state: WizardState): AuctionScheduleRQ | null {
  const { schedule, offer, basics } = state;
  const startTime = zonedInputToOffsetIso(schedule.startTime, basics.timeZone);
  if (!startTime) return null;

  let end: Pick<AuctionScheduleRQ, 'endMode' | 'offerDuration' | 'endTime'>;
  if (schedule.endMode === 'FIXED') {
    const endTime = zonedInputToOffsetIso(schedule.endTime, basics.timeZone);
    if (!endTime) return null;
    end = { endMode: 'TIME_RANGE', endTime };
  } else {
    const hours = parseInt(schedule.durationHours, 10) || 0;
    const minutes = parseInt(schedule.durationMinutes, 10) || 0;
    if (hours * 60 + minutes <= 0) return null;
    end = { endMode: 'DURATION', offerDuration: `PT${hours}H${minutes}M` };
  }

  const extendMinutes = parseInt(schedule.extendMinutes, 10) || 0;
  const limit = parseInt(schedule.extensionLimit, 10) || 0;
  const softClose =
    schedule.softCloseEnabled && offer.mechanism === 'OPEN' && extendMinutes >= 1
      ? {
          reference: schedule.extensionReference,
          duration: `PT${extendMinutes}M`,
          // No limit is sent as no `limit` at all.
          ...(schedule.limitEnabled && limit >= 1 ? { limit } : {}),
        }
      : undefined;

  return { startTime, ...end, ...(softClose ? { softClose } : {}) };
}

/** Every API write the wizard makes. Create and edit share it: the only
 *  difference is whether the auction exists yet, and which policies it already has. */
export function useWizardPersistence({
  initialAuctionId,
  unit,
  scheduled = false,
  onCreated,
}: PersistenceOptions) {
  const auctionIdRef = useRef(initialAuctionId);
  const scheduledRef = useRef(scheduled);

  const requireId = () => {
    if (!auctionIdRef.current) throw new Error('Save Basics and unit first.');
    return auctionIdRef.current;
  };

  /** The update API has no reserve field, so once the auction exists its
   *  reserve is added, changed or removed as a policy. */
  const syncReservePrice = async (id: string, state: WizardState) => {
    const next = buildReservePricePolicy(state.basics);
    const saved = (await auctionsApi.getAuctionPolicies(id)).find(
      (policy) => resolveStr(policy.type) === 'RESERVE_PRICE_POLICY',
    );
    if (next && saved?.id) {
      await auctionsApi.updateAuctionPolicy(id, saved.id, { ...next, order: saved.order });
    } else if (next) {
      await auctionsApi.addAuctionPolicy(id, next);
    } else if (saved?.id) {
      await auctionsApi.deleteAuctionPolicy(id, saved.id);
    }
  };

  /** Creates the draft on first save and updates it afterwards. */
  const persistBasics = async (state: WizardState): Promise<string> => {
    const { basics } = state;
    const regionalSettings = {
      currency: basics.currencyUnit,
      timeZone: basics.timeZone,
      roundingMode: basics.roundingMode,
    };
    const builtUnit = buildUnit(basics, unit?.id);
    if (builtUnit && unit && !unit.supported && unit.rawType) {
      builtUnit.type = unit.rawType as AuctionUnitType;
    }
    const subCategories = await unitSubCategories(basics.items);
    const common = {
      title: basics.title.trim(),
      description: basics.description.trim() || undefined,
      referenceId: basics.referenceId.trim() || undefined,
      direction: basics.direction,
      accessibility: basics.accessibility,
      regionalSettings,
    };

    if (auctionIdRef.current) {
      // Visibilities and the mechanism belong to Offer rules, saved by persistOfferRules.
      await auctionsApi.updateAuction(auctionIdRef.current, {
        ...common,
        unit: builtUnit,
        // Leave an existing auction's subcategories alone if none can be worked out.
        ...(subCategories.length ? { subCategories } : {}),
      });
      await syncReservePrice(auctionIdRef.current, state);
      return auctionIdRef.current;
    }

    if (!subCategories.length) {
      throw new Error(
        'The selected listing has no subcategory, so the auction can’t be filed. Pick a listing with a subcategory.',
      );
    }
    if (!builtUnit) throw new Error('Add a listing and an opening price first.');

    // Step 1 creates the auction, its unit and the optional reserve price in one call.
    const reservePricePolicy = buildReservePricePolicy(basics);
    const payload: AuctionCreationRQ = {
      ...common,
      type: AUCTION_TYPE,
      subCategories,
      unit: builtUnit,
      ...(reservePricePolicy ? { reservePricePolicy } : {}),
    };
    const id = await auctionsApi.createAuction(payload);
    auctionIdRef.current = id;
    onCreated?.(id);
    return id;
  };

  /** Setup step 2. The first save goes to `POST /{id}/offer-rules`, which the
   *  API accepts once. After that the mechanism and visibilities are updated on
   *  the auction, and the saved price progression is changed in place when its
   *  windows keep their types, or replaced when windows are added, removed or
   *  change type (the update API can only change existing children). */
  const persistOfferRules = async (state: WizardState) => {
    const id = requireId();
    const rules = buildOfferRules(state.offer);
    if (!rules) {
      throw new Error('Sealed bidding can’t be saved yet. Choose open bidding or a clock.');
    }

    const saved = (await auctionsApi.getAuctionPolicies(id)).find(
      (policy) => resolveStr(policy.type) === 'PRICE_PROGRESSION_POLICY',
    );
    if (!saved?.id) {
      await auctionsApi.setOfferRules(id, rules);
      return;
    }

    const next = rules.priceProgressionPolicy;
    const savedChildren = [...(saved.policies ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    const nextChildren = next.policies ?? [];
    const sameShape =
      savedChildren.length === nextChildren.length &&
      savedChildren.every((child, index) => resolveStr(child.type) === nextChildren[index]?.type);

    if (sameShape) {
      await auctionsApi.updateAuction(id, {
        offerMechanism: rules.offerMechanism,
        participantVisibility: rules.participantVisibility,
        offerVisibility: rules.offerVisibility,
      });
      await auctionsApi.updateAuctionPolicy(id, saved.id, {
        ...next,
        order: saved.order,
        policies: nextChildren.map((child, index) => ({ ...child, id: savedChildren[index]!.id })),
      });
      return;
    }

    // Remove the old progression first, so a mechanism change never leaves
    // rules on the auction that don't fit the new one.
    await auctionsApi.deleteAuctionPolicy(id, saved.id);
    await auctionsApi.updateAuction(id, {
      offerMechanism: rules.offerMechanism,
      participantVisibility: rules.participantVisibility,
      offerVisibility: rules.offerVisibility,
    });
    await auctionsApi.addAuctionPolicy(id, next);
  };

  /** Saves one phase (Participation or Award): its wizard-owned policies and
   *  its draft workflow steps. While nothing is saved in the phase yet, both go
   *  in one setup call, as the API intends (it accepts that call once). After
   *  that, policies are updated, added or removed one by one, and new steps are
   *  saved by the step editor as they're made. Returns true once the phase is
   *  saved, so the caller can stop keeping its steps as drafts. */
  const persistPhase = async (
    desired: PolicyItemRQ[],
    drafts: PendingStep[],
    phase: {
      isPhasePolicy: (policy: PolicyItemRQ) => boolean;
      stepPhase: WorkflowStepPhase;
      setup: (policies: PolicyItemRQ[], steps: AddWorkflowStepRQ[]) => Promise<void>;
    },
  ): Promise<boolean> => {
    const id = requireId();
    const [policies, workflow] = await Promise.all([
      auctionsApi.getAuctionPolicies(id),
      auctionsApi.getAuctionWorkflow(id),
    ]);
    const saved = policies.filter(phase.isPhasePolicy);
    const savedSteps = workflow.filter((step) => workflowStepPhase(step) === phase.stepPhase);

    if (!saved.length && !savedSteps.length) {
      if (!desired.length && !drafts.length) return false;
      await phase.setup(desired, pendingRequests(drafts));
      return true;
    }

    const savedOfType = (type?: string) =>
      saved.find((policy) => resolveStr(policy.type) === type && policy.id);
    const wanted = new Set(desired.map((policy) => policy.type));
    for (const policy of saved) {
      if (policy.id && isWizardPhasePolicy(policy) && !wanted.has(resolveStr(policy.type))) {
        await auctionsApi.deleteAuctionPolicy(id, policy.id);
      }
    }
    for (const policy of desired) {
      const existing = savedOfType(policy.type);
      if (existing?.id) {
        // An update never moves a policy, so it keeps its saved order.
        await auctionsApi.updateAuctionPolicy(id, existing.id, {
          ...policy,
          order: existing.order,
        });
      } else {
        // Without an order it goes last in its phase.
        await auctionsApi.addAuctionPolicy(id, { ...policy, order: undefined });
      }
    }
    // Only when the phase was saved elsewhere meanwhile: drafts go after its steps.
    for (const request of pendingRequests(drafts)) {
      await auctionsApi.addWorkflowStep(id, {
        ...request,
        order: savedSteps.length + (request.order ?? 1),
      });
    }
    return true;
  };

  /** Setup step 4, `POST /{id}/pre-auction-rules`: minimum participants and the
   *  steps participants complete to join. */
  const persistPreAuctionRules = (state: WizardState, drafts: PendingStep[] = []) =>
    persistPhase(buildPreAuctionPolicies(state), drafts, {
      isPhasePolicy: isParticipationPolicy,
      stepPhase: 'PRE_AUCTION',
      setup: (policies, steps) =>
        auctionsApi.setPreAuctionRules(requireId(), {
          ...(policies.length ? { policies } : {}),
          ...(steps.length ? { steps } : {}),
        }),
    });

  /** Setup step 5, `POST /{id}/post-auction-rules`: who wins, what they pay and
   *  the winner's steps. The API takes the award whole, so the first save needs
   *  a payment step for the winner. */
  const persistPostAuctionRules = (state: WizardState, drafts: PendingStep[] = []) =>
    persistPhase(buildPostAuctionPolicies(state), drafts, {
      isPhasePolicy: isClearingPolicy,
      stepPhase: 'POST_AUCTION',
      setup: async (policies, steps) => {
        if (!steps.some((step) => step.type === 'PAYMENT_STEP')) {
          throw new Error(AWARD_NEEDS_PAYMENT);
        }
        await auctionsApi.setPostAuctionRules(requireId(), { policies, steps });
      },
    });

  /** Setup step 3. The API sets a schedule once (it fails with
   *  AUCTION_ALREADY_SCHEDULED afterwards) and has no reschedule call yet, so a
   *  saved schedule can't be changed from here. */
  const persistSchedule = async (state: WizardState) => {
    if (scheduledRef.current) {
      throw new Error(
        'The schedule is already saved, and it can’t be changed yet. Rescheduling isn’t available.',
      );
    }
    const payload = schedulePayload(state);
    if (!payload) return;
    await auctionsApi.scheduleAuction(requireId(), payload);
    scheduledRef.current = true;
  };

  /** Saves every setup step. Returns which of Participation and Award are now
   *  saved, so the caller can drop their draft steps. */
  const persistAll = async (
    state: WizardState,
    drafts: PendingSteps = EMPTY_PENDING_STEPS,
  ): Promise<{ pre: boolean; post: boolean }> => {
    await persistBasics(state);
    await persistOfferRules(state);
    // Right after offer rules, which the schedule needs. A saved schedule is kept.
    if (!scheduledRef.current) await persistSchedule(state);
    const pre = await persistPreAuctionRules(state, drafts.PRE_AUCTION);
    const post = await persistPostAuctionRules(state, drafts.POST_AUCTION);
    return { pre, post };
  };

  const publish = async (state: WizardState, drafts?: PendingSteps) => {
    const saved = await persistAll(state, drafts);
    await auctionsApi.publishAuction(requireId());
    return saved;
  };

  return {
    /** True once the auction has a schedule, which can't be changed afterwards. */
    isScheduled: () => scheduledRef.current,
    persistBasics,
    persistOfferRules,
    persistPreAuctionRules,
    persistPostAuctionRules,
    persistSchedule,
    persistAll,
    publish,
  };
}
