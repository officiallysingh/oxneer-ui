'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  EMPTY_FILTERS,
  filtersToSearchParams,
  parseFilters,
  type UsersFilters,
} from '../_lib/users-filters';

/** Users list filters, initialised from and mirrored to the URL query. */
export function useUsersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<UsersFilters>(() => parseFilters(searchParams));

  useEffect(() => {
    const qs = filtersToSearchParams(filters).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  const updateFilters = useCallback(
    (patch: Partial<UsersFilters>) => setFilters((prev) => ({ ...prev, ...patch })),
    [],
  );
  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  return { filters, setFilters, updateFilters, resetFilters };
}
