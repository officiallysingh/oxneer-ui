'use client';

import { useEffect, useState } from 'react';
import { auctionsApi } from '@repo/api';
import type { SelectOption } from '../_components/AuctionShared';

/** Reference data the wizard needs: rounding modes and the policy order the
 *  backend expects for this auction type. Both fall back to empty lists. */
export function useAuctionLookups(auctionType: string) {
  const [roundingModes, setRoundingModes] = useState<SelectOption[]>([]);
  const [policyTypeOrder, setPolicyTypeOrder] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    auctionsApi
      .getRoundingModeTypes()
      .then((modes) => active && setRoundingModes(modes))
      .catch(() => active && setRoundingModes([]));
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

  return { roundingModes, policyTypeOrder };
}
