'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  EMPTY_FILTERS,
  filtersToSearchParams,
  parseFilters,
  type AuctionsFilters,
} from '../_lib/auctions-filters';

/** Auctions list filters, initialised from the URL and mirrored back to it,
 *  so a filtered list can be shared and survives a reload. */
export function useAuctionsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<AuctionsFilters>(() => parseFilters(searchParams));

  useEffect(() => {
    const qs = filtersToSearchParams(filters).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  const updateFilters = useCallback(
    (patch: Partial<AuctionsFilters>) => setFilters((prev) => ({ ...prev, ...patch })),
    [],
  );
  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  return { filters, updateFilters, resetFilters };
}
