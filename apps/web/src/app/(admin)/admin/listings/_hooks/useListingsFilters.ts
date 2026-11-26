'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  EMPTY_LISTINGS_FILTERS,
  listingsFiltersToSearchParams,
  parseListingsFilters,
  type ListingsFilters,
} from '../_lib/listings-filters';

interface AppliedSearch {
  filters: ListingsFilters;
  /** Bumped on every search so an unchanged search still reloads. */
  run: number;
}

/**
 * Listings filter state. The panel edits a draft; Search applies it and mirrors it
 * to the URL so the view can be shared and reloaded.
 */
export function useListingsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<ListingsFilters>(() => parseListingsFilters(searchParams));
  const [applied, setApplied] = useState<AppliedSearch>(() => ({ filters: draft, run: 0 }));

  const writeUrl = useCallback(
    (filters: ListingsFilters) => {
      const qs = listingsFiltersToSearchParams(filters).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const updateDraft = useCallback(
    (patch: Partial<ListingsFilters>) => setDraft((prev) => ({ ...prev, ...patch })),
    [],
  );

  const applyFilters = useCallback(() => {
    writeUrl(draft);
    setApplied((prev) => ({ filters: draft, run: prev.run + 1 }));
  }, [draft, writeUrl]);

  const resetFilters = useCallback(() => {
    setDraft(EMPTY_LISTINGS_FILTERS);
    writeUrl(EMPTY_LISTINGS_FILTERS);
    setApplied((prev) => ({ filters: EMPTY_LISTINGS_FILTERS, run: prev.run + 1 }));
  }, [writeUrl]);

  return {
    draft,
    updateDraft,
    appliedFilters: applied.filters,
    searchRun: applied.run,
    applyFilters,
    resetFilters,
  };
}
