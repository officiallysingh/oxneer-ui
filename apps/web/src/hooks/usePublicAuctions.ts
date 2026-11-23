'use client';

import { useCallback, useEffect, useState } from 'react';
import { auctionsApi, type AuctionVM, type PublicAuctionsFilter } from '@oxneer/api';

export type PublicAuctionsQuery = Omit<PublicAuctionsFilter, 'page'>;

/** Published and live public auctions (plus private ones the user is invited to),
 *  newest start first, one page at a time. Refetches when `query` changes. */
export function usePublicAuctions(query: PublicAuctionsQuery) {
  const [auctions, setAuctions] = useState<AuctionVM[]>([]);
  const [page, setPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A stable key, so a new object with the same filters doesn't refetch.
  const queryKey = JSON.stringify(query);

  const load = useCallback(
    async (nextPage: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await auctionsApi.getPublicAuctions({
          ...(JSON.parse(queryKey) as PublicAuctionsQuery),
          page: nextPage,
        });
        setAuctions(result.content ?? []);
        setPage(nextPage);
        setTotalRecords(result.page?.totalRecords ?? 0);
        setTotalPages(result.page?.totalPages ?? 0);
      } catch {
        setError('We couldn’t load auctions. Check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [queryKey],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  return {
    auctions,
    page,
    totalRecords,
    totalPages,
    isLoading,
    error,
    goToPage: load,
    retry: () => load(page),
  };
}
