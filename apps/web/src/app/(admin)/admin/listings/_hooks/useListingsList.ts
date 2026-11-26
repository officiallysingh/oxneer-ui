'use client';

import { useCallback, useMemo, useState } from 'react';
import { listingsApi, type ListingVM } from '@oxneer/api';
import { useFetchPaginatedList } from '@/hooks/admin';
import { toListingsQuery, type ListingsFilters } from '../_lib/listings-filters';

export const LISTINGS_PAGE_SIZE = 16;

/**
 * Server-paginated listings for the applied filters. `searchRun` changes on every
 * Search click, so searching again with the same filters still reloads page 1.
 */
export function useListingsList(filters: ListingsFilters, searchRun: number) {
  const query = useMemo(() => toListingsQuery(filters), [filters]);

  const fetcher = useCallback(
    (page: number) => listingsApi.getListings({ ...query, page, size: LISTINGS_PAGE_SIZE }),
    [query],
  );

  const list = useFetchPaginatedList<ListingVM>(fetcher, `${searchRun}:${JSON.stringify(query)}`, {
    errorMessage: 'Failed to load listings.',
  });

  const { setData, setError } = list;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteListing = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await listingsApi.deleteListing(id);
        setData((prev) => prev.filter((listing) => listing.id !== id));
      } catch {
        setError('Failed to delete listing.');
      } finally {
        setDeletingId(null);
      }
    },
    [setData, setError],
  );

  return { ...list, deletingId, deleteListing };
}
