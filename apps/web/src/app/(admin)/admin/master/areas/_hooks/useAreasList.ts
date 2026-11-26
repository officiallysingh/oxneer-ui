'use client';

import { useCallback, useState } from 'react';
import { getApiErrorMessage, masterApi, type AreaVM } from '@oxneer/api';
import { useAllStates, useFetchPaginatedList } from '@/hooks/admin';

export const AREAS_PAGE_SIZE = 16;

/** Server-searched, paginated areas across every city. */
export function useAreasList() {
  const [search, setSearch] = useState('');
  const states = useAllStates();

  const fetcher = useCallback(
    (page: number) =>
      masterApi.searchAreas({
        searchText: search.trim() || undefined,
        page,
        size: AREAS_PAGE_SIZE,
      }),
    [search],
  );
  const list = useFetchPaginatedList<AreaVM>(fetcher, search, {
    errorMessage: 'Failed to load areas.',
  });
  const { setData, setError } = list;

  const deleteArea = useCallback(
    async (area: AreaVM) => {
      try {
        await masterApi.deleteArea(area.id);
        setData((prev) => prev.filter((a) => a.id !== area.id));
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to delete area.'));
      }
    },
    [setData, setError],
  );

  return { ...list, search, setSearch, states, deleteArea };
}
