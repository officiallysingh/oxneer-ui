'use client';

import { useEffect, useState } from 'react';
import { auctionsApi, type RoundingModeOption } from '@repo/api';
import type { SelectOption } from '../_components/AuctionShared';

/** Rounding modes from /model/monetary-rounding-modes for `currency`, whose
 *  worked examples follow that currency's decimal places. Reloads when the
 *  currency changes; empty while loading or if the call fails. */
export function useRoundingModes(currency: string): RoundingModeOption[] {
  const [modes, setModes] = useState<RoundingModeOption[]>([]);
  useEffect(() => {
    let active = true;
    auctionsApi
      .getRoundingModes(currency || undefined)
      .then((options) => active && setModes(options))
      .catch(() => active && setModes([]));
    return () => {
      active = false;
    };
  }, [currency]);
  return modes;
}

/** A currency the auction can be priced in. */
export interface CurrencySelectOption extends SelectOption {
  symbol: string;
  /** Decimal places amounts are kept to, set by the currency. */
  decimals: number;
}

/** The reference data that is configured on the server and may change:
 *  currencies and time zones (rounding modes depend on the chosen currency, so
 *  they load through `useRoundingModes`). Everything else the wizard offers
 *  (auction type, direction, who can join, unit type) is a fixed enum kept in
 *  the UI. Each list falls back to empty, and the screens fall back to their
 *  built-in options. */
export function useAuctionLookups() {
  const [currencies, setCurrencies] = useState<CurrencySelectOption[]>([]);
  const [timeZones, setTimeZones] = useState<SelectOption[]>([]);

  useEffect(() => {
    let active = true;
    const load = <T>(request: () => Promise<T[]>, set: (options: T[]) => void) =>
      request()
        .then((options) => active && set(options))
        .catch(() => active && set([]));
    void load(
      async () =>
        (await auctionsApi.getCurrencies()).map((currency) => ({
          value: currency.value,
          label: currency.label,
          symbol: currency.symbol,
          decimals: currency.decimals,
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

  return { currencies, timeZones };
}
