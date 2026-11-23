'use client';

import { useCallback, useMemo, useState } from 'react';
import { auctionsApi, type AuctionVM } from '@oxneer/api';
import { useFetchPaginatedList } from '@/hooks/admin';
import { toApiFilter, type AuctionsFilters } from '../_lib/auctions-filters';

const DEFAULT_PAGE_SIZE = 16;
export const PAGE_SIZE_OPTIONS = [DEFAULT_PAGE_SIZE, 32, 64];

/** Server-paginated auctions for the current filters. The API always orders them
 *  by start time, newest first, and ignores `sort`, so the table isn't sortable. */
export function useAuctionsList(filters: AuctionsFilters) {
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const query = useMemo(() => ({ ...toApiFilter(filters), size: pageSize }), [filters, pageSize]);

  const fetcher = useCallback(
    (page: number) => auctionsApi.getAuctions({ ...query, page }),
    [query],
  );

  const list = useFetchPaginatedList<AuctionVM>(fetcher, JSON.stringify(query), {
    errorMessage: 'Couldn’t load auctions. Check your connection and try again.',
  });

  const { setData } = list;

  /** Applies a local change to one loaded auction (after a successful action). */
  const updateAuction = useCallback(
    (id: string, patch: Partial<AuctionVM>) =>
      setData((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))),
    [setData],
  );

  return { ...list, updateAuction, pageSize, setPageSize };
}
