'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PaginatedPageMeta {
  totalPages?: number;
  totalRecords?: number;
}

export interface PaginatedResult<T> {
  content?: T[];
  page?: PaginatedPageMeta;
}

interface UseFetchPaginatedListOptions {
  errorMessage?: string;
  /** When true, changing `searchKey` resets to page 0. */
  resetPageOnSearch?: boolean;
}

/**
 * Fetch state for server-paginated list pages.
 * Pass a stable `searchKey` (e.g. debounced search string) to re-fetch page 0 when filters change.
 */
export function useFetchPaginatedList<T>(
  fetcher: (page: number) => Promise<PaginatedResult<T>>,
  searchKey: string = '',
  options: UseFetchPaginatedListOptions = {},
) {
  const { errorMessage = 'Failed to load data.', resetPageOnSearch = true } = options;
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchPage = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetcherRef.current(page);
        setData(result.content ?? []);
        setPageIndex(page);
        setTotalPages(result.page?.totalPages ?? 0);
        setTotalRecords(result.page?.totalRecords ?? 0);
      } catch {
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [errorMessage],
  );

  useEffect(() => {
    fetchPage(resetPageOnSearch ? 0 : pageIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, fetchPage]);

  const refresh = useCallback(() => fetchPage(pageIndex), [fetchPage, pageIndex]);

  return {
    data,
    setData,
    isLoading,
    error,
    setError,
    pageIndex,
    totalPages,
    totalRecords,
    fetchPage,
    refresh,
  };
}
