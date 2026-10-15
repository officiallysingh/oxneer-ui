'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  EMPTY_FILTERS,
  filtersToSearchParams,
  parseFilters,
  type UsersFilters,
} from '../_lib/users-filters';

const VIEW_PARAM = 'view';

/**
 * Users list URL state: the filters plus `?view=<id>` for the open details drawer.
 * Initialised from the URL and mirrored back to it, so links can be shared and reloaded.
 */
export function useUsersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<UsersFilters>(() => parseFilters(searchParams));
  const [viewId, setViewId] = useState<string | null>(() => searchParams.get(VIEW_PARAM));

  useEffect(() => {
    const params = filtersToSearchParams(filters);
    if (viewId) params.set(VIEW_PARAM, viewId);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, viewId, pathname, router]);

  const updateFilters = useCallback(
    (patch: Partial<UsersFilters>) => setFilters((prev) => ({ ...prev, ...patch })),
    [],
  );
  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  return { filters, setFilters, updateFilters, resetFilters, viewId, setViewId };
}
