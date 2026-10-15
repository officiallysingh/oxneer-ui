'use client';

import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '@repo/api';
import {
  applyStatusTab,
  EMPTY_FILTERS,
  STATUS_TABS,
  toApiFilter,
  type StatusTabId,
} from '../_lib/users-filters';

export type StatusCounts = Partial<Record<StatusTabId, number>>;

/** One size-1 page request per tab; a failed request leaves that tab without a count. */
async function fetchStatusCounts(): Promise<StatusCounts> {
  const entries = await Promise.all(
    STATUS_TABS.map(async (tab) => {
      try {
        const res = await usersApi.getUsers({
          ...toApiFilter(applyStatusTab(EMPTY_FILTERS, tab.id)),
          page: 0,
          size: 1,
        });
        return [tab.id, res.page?.totalRecords] as const;
      } catch {
        return [tab.id, undefined] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

/** Total users per status tab (unfiltered). */
export function useUserStatusCounts() {
  const [counts, setCounts] = useState<StatusCounts>({});
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchStatusCounts().then((c) => {
      if (!cancelled) setCounts(c);
    });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { counts, reload };
}
