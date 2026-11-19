'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const VIEW_TABS = ['overview', 'item', 'rules', 'steps', 'people'] as const;
export type ViewTab = (typeof VIEW_TABS)[number];

function isViewTab(value: string | null): value is ViewTab {
  return VIEW_TABS.includes(value as ViewTab);
}

/** The open tab lives in `?tab=` so a section can be linked and survives reload. */
export function useViewTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const tab: ViewTab = isViewTab(raw) ? raw : 'overview';

  const setTab = useCallback(
    (next: string) => {
      if (!isViewTab(next)) return;
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'overview') params.delete('tab');
      else params.set('tab', next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { tab, setTab };
}
