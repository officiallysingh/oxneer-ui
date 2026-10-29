'use client';

import { useEffect, useState } from 'react';
import { auctionsApi } from '@repo/api';
import type { SelectOption } from '../_components/AuctionShared';

/** Reference data the wizard needs: rounding modes, auction formats, unit types,
 *  directions, accessibility types and the policy order the backend expects for
 *  this auction type. Each falls back to an empty list, and the screens fall
 *  back to their built-in options. */
export function useAuctionLookups(auctionType: string) {
  const [roundingModes, setRoundingModes] = useState<SelectOption[]>([]);
  const [formats, setFormats] = useState<SelectOption[]>([]);
  const [unitTypes, setUnitTypes] = useState<SelectOption[]>([]);
  const [directions, setDirections] = useState<SelectOption[]>([]);
  const [accessibilityTypes, setAccessibilityTypes] = useState<SelectOption[]>([]);
  const [policyTypeOrder, setPolicyTypeOrder] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const load = (request: () => Promise<SelectOption[]>, set: (options: SelectOption[]) => void) =>
      request()
        .then((options) => active && set(options))
        .catch(() => active && set([]));
    void load(auctionsApi.getRoundingModeTypes, setRoundingModes);
    void load(auctionsApi.getFormats, setFormats);
    void load(auctionsApi.getUnitTypes, setUnitTypes);
    void load(auctionsApi.getDirectionTypes, setDirections);
    void load(auctionsApi.getAccessibilityTypes, setAccessibilityTypes);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!auctionType) return;
    let active = true;
    auctionsApi
      .getPolicyTypes(auctionType)
      .then((types) => active && setPolicyTypeOrder(types.map((type) => type.value)))
      .catch(() => active && setPolicyTypeOrder([]));
    return () => {
      active = false;
    };
  }, [auctionType]);

  return { roundingModes, formats, unitTypes, directions, accessibilityTypes, policyTypeOrder };
}
