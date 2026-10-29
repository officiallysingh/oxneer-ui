'use client';

import { useRef } from 'react';
import {
  auctionsApi,
  listingsApi,
  type AuctionCreationRQ,
  type AuctionScheduleRQ,
  type AuctionUnitType,
  type PolicyItemRQ,
} from '@repo/api';
import {
  AUCTION_TYPE,
  buildPolicyPayload,
  buildUnit,
  mergePolicyPayload,
  offerVisibilityValue,
  participantVisibilityValue,
} from '../_lib/wizard/payload';
import { endTimeFor } from '../_lib/wizard/summary';
import type { SelectedListing, WizardState } from '../_lib/wizard/types';

export interface PersistenceOptions {
  /** Null until the create flow saves Basics for the first time. */
  initialAuctionId: string | null;
  policyTypeOrder: string[];
  /** Edit only: policies already on the auction, merged rather than replaced. */
  savedPolicies?: PolicyItemRQ[];
  /** Edit only: keeps legacy MULTI_UNIT / LOT units in their original shape. */
  unit?: { id?: string; rawType: string; supported: boolean };
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

export function schedulePayload(state: WizardState): AuctionScheduleRQ | null {
  const start = new Date(state.schedule.startTime);
  const closing = endTimeFor(state.schedule);
  const end = closing ? new Date(closing) : null;
  if (Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) return null;
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

/** Every API write the wizard makes. Create and edit share it: the only
 *  difference is whether the auction exists yet, and which policies it already has. */
export function useWizardPersistence({
  initialAuctionId,
  policyTypeOrder,
  savedPolicies = [],
  unit,
  onCreated,
}: PersistenceOptions) {
  const auctionIdRef = useRef(initialAuctionId);
  const savedPoliciesRef = useRef(savedPolicies);

  const requireId = () => {
    if (!auctionIdRef.current) throw new Error('Save Basics and unit first.');
    return auctionIdRef.current;
  };

  /** Creates the draft on first save and updates it afterwards. */
  const persistBasics = async (state: WizardState): Promise<string> => {
    const { basics, offer } = state;
    const monetaryOptions = {
      currencyUnit: basics.currencyUnit,
      precision: parseInt(basics.precision, 10) || 0,
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
      monetaryOptions,
      unit: builtUnit,
      // Leave an existing auction's subcategories alone if none can be worked out.
      ...(subCategories.length ? { subCategories } : {}),
    };

    if (!auctionIdRef.current && !subCategories.length) {
      throw new Error(
        'The selected listing has no subcategory, so the auction can’t be filed. Pick a listing with a subcategory.',
      );
    }

    if (auctionIdRef.current) {
      await auctionsApi.updateAuction(auctionIdRef.current, {
        ...common,
        accessibility: basics.accessibility,
        direction: basics.direction,
        participantVisibility: participantVisibilityValue(offer.participantVisibility),
        offerVisibility: offerVisibilityValue(offer.offerVisibility),
      });
      return auctionIdRef.current;
    }

    const payload: AuctionCreationRQ = {
      ...common,
      type: AUCTION_TYPE,
      format: 'SIMPLE',
      protocol: {
        accessibility: basics.accessibility,
        direction: basics.direction,
        dimension: 'ONE_DIMENSIONAL',
        participantVisibility: participantVisibilityValue(offer.participantVisibility),
        offerVisibility: offerVisibilityValue(offer.offerVisibility),
      },
    };
    const id = await auctionsApi.createAuction(payload);
    auctionIdRef.current = id;
    onCreated?.(id);
    return id;
  };

  const persistPolicies = async (state: WizardState) => {
    const merged = mergePolicyPayload(
      savedPoliciesRef.current,
      buildPolicyPayload(state, policyTypeOrder),
    );
    await auctionsApi.setAuctionPolicies(requireId(), merged);
    savedPoliciesRef.current = merged;
  };

  const persistSchedule = async (state: WizardState) => {
    const payload = schedulePayload(state);
    if (payload) await auctionsApi.scheduleAuction(requireId(), payload);
  };

  const persistAll = async (state: WizardState) => {
    await persistBasics(state);
    await persistPolicies(state);
    await persistSchedule(state);
  };

  const publish = async (state: WizardState) => {
    await persistAll(state);
    await auctionsApi.publishAuction(requireId());
  };

  return { persistBasics, persistPolicies, persistSchedule, persistAll, publish };
}
