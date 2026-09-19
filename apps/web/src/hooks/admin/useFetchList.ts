'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseFetchListOptions {
  errorMessage?: string;
}

/**
 * Standard fetch state for list pages: manages `data`, `isLoading` and `error`
 * for a fetcher that returns an array. `refresh()` re-runs the fetcher.
 */
export function useFetchList<T>(fetcher: () => Promise<T[]>, options: UseFetchListOptions = {}) {
  const { errorMessage = 'Failed to load data.' } = options;
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await fetcherRef.current());
    } catch {
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [errorMessage]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, setData, isLoading, error, setError, refresh };
}
