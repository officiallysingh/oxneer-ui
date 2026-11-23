'use client';

import { Tabs, TabsList, TabsTrigger } from '@oxneer/ui';
import { TabCount } from '@/components/common/admin/TabCount';
import { STATUS_TABS, type StatusTabId } from '../../_lib/auctions-filters';
import type { StatusCounts } from '../../_hooks/useAuctionStatusCounts';

interface AuctionsStatusTabsProps {
  value: StatusTabId;
  counts: StatusCounts;
  onChange: (tab: StatusTabId) => void;
}

/** Status tabs with totals; scrolls horizontally on narrow screens. */
export function AuctionsStatusTabs({ value, counts, onChange }: AuctionsStatusTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as StatusTabId)}>
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
