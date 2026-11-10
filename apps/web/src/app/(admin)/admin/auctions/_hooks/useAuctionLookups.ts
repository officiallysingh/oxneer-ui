'use client';

import { useEffect, useState } from 'react';
import { auctionsApi } from '@repo/api';
import type { SelectOption } from '../_components/AuctionShared';

/** A currency the auction can be priced in, with its symbol. */
export interface CurrencySelectOption extends SelectOption {
  symbol: string;
}

/** Reference data the wizard needs: rounding modes, auction types, unit types,
 *  directions, accessibility types, currencies and time zones. Each falls back
 *  to an empty list, and the screens fall back to their built-in options. */
export function useAuctionLookups() {
  const [roundingModes, setRoundingModes] = useState<SelectOption[]>([]);
  const [formats, setFormats] = useState<SelectOption[]>([]);
  const [unitTypes, setUnitTypes] = useState<SelectOption[]>([]);
  const [directions, setDirections] = useState<SelectOption[]>([]);
  const [accessibilityTypes, setAccessibilityTypes] = useState<SelectOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencySelectOption[]>([]);
  const [timeZones, setTimeZones] = useState<SelectOption[]>([]);

  useEffect(() => {
    let active = true;
    const load = <T>(request: () => Promise<T[]>, set: (options: T[]) => void) =>
      request()
        .then((options) => active && set(options))
        .catch(() => active && set([]));
    void load(auctionsApi.getRoundingModeTypes, setRoundingModes);
    void load(auctionsApi.getFormats, setFormats);
    void load(auctionsApi.getUnitTypes, setUnitTypes);
    void load(auctionsApi.getDirectionTypes, setDirections);
    void load(auctionsApi.getAccessibilityTypes, setAccessibilityTypes);
    void load(
      async () =>
        (await auctionsApi.getCurrencies()).map((currency) => ({
          value: currency.value,
          label: currency.label,
          symbol: currency.symbol,
        })),
      setCurrencies,
    );
    void load(
      async () =>
        (await auctionsApi.getTimeZones()).map((zone) => ({
          value: zone.value,
          label: zone.label,
        })),
      setTimeZones,
    );
    return () => {
      active = false;
    };
  }, []);

  return {
    roundingModes,
    formats,
    unitTypes,
    directions,
    accessibilityTypes,
    currencies,
    timeZones,
  };
}
