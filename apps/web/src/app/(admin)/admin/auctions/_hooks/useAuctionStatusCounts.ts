'use client';

import { useCallback, useEffect, useState } from 'react';
import { auctionsApi } from '@oxneer/api';
import { STATUS_TABS, type StatusTabId } from '../_lib/auctions-filters';

export type StatusCounts = Partial<Record<StatusTabId, number>>;

/** One size-1 page request per tab (the API has no counts endpoint);
 *  a failed request leaves that tab without a count. */
async function fetchStatusCounts(): Promise<StatusCounts> {
  const entries = await Promise.all(
    STATUS_TABS.map(async (tab) => {
      try {
        const res = await auctionsApi.getAuctions({ statuses: tab.statuses, page: 0, size: 1 });
        return [tab.id, res.page?.totalRecords ?? 0] as const;
      } catch {
        return [tab.id, undefined] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

/** Total auctions per status tab, across all auctions (not the current filters). */
export function useAuctionStatusCounts() {
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
