'use client';

import { Tabs, TabsList, TabsTrigger } from '@repo/ui';
import { STATUS_TABS, type StatusTabId } from '../_lib/users-filters';
import { TabCount } from './TabCount';
import type { StatusCounts } from '../_hooks/useUserStatusCounts';

interface UsersStatusTabsProps {
  /** null when the status filters don't match any tab. */
  value: StatusTabId | null;
  counts: StatusCounts;
  onChange: (tab: StatusTabId) => void;
}

/** Quick status presets with totals; scrolls horizontally on narrow screens. */
export function UsersStatusTabs({ value, counts, onChange }: UsersStatusTabsProps) {
  return (
    <Tabs value={value ?? ''} onValueChange={(v) => onChange(v as StatusTabId)}>
      <div className="-mx-1 overflow-x-auto px-1">
        <TabsList className="h-10">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="group gap-2">
              {tab.label}
              <TabCount n={counts[tab.id]} />
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
