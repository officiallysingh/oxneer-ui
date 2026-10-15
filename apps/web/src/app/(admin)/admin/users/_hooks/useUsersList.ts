'use client';

import { useCallback, useMemo, useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { usersApi, type UserDetailVM } from '@repo/api';
import { useFetchPaginatedList } from '@/hooks/admin';
import { toApiFilter, type UsersFilters } from '../_lib/users-filters';

export const PAGE_SIZE_OPTIONS = [16, 32, 64];

/** Table column id → server sort property. */
const SORT_FIELDS: Record<string, string> = {
  user: 'username',
  contact: 'emailId',
};

function toApiSort(sorting: SortingState): string[] | undefined {
  const s = sorting[0];
  const field = s && SORT_FIELDS[s.id];
  return field ? [`${field},${s.desc ? 'desc' : 'asc'}`] : undefined;
}

/** Server-paginated, server-sorted users for the current filters. */
export function useUsersList(filters: UsersFilters) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const query = useMemo(
    () => ({ ...toApiFilter(filters), sort: toApiSort(sorting), size: pageSize }),
    [filters, sorting, pageSize],
  );

  const fetcher = useCallback(
    (page: number) => usersApi.getUsers({ ...query, page, expand: ['roles', 'permissions'] }),
    [query],
  );

  const list = useFetchPaginatedList<UserDetailVM>(fetcher, JSON.stringify(query), {
    errorMessage: 'Failed to load users.',
  });

  const { setData } = list;

  /** Applies a local change to one loaded user (after a successful PATCH). */
  const updateUser = useCallback(
    (id: string, patch: Partial<UserDetailVM>) =>
      setData((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u))),
    [setData],
  );

  return { ...list, updateUser, sorting, setSorting, pageSize, setPageSize };
}
