'use client';

import { useEffect, useRef } from 'react';
import { CalendarDays, Eye, Package, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { TabsList, TabsTrigger } from '@oxneer/ui';
import { TabCount } from '@/components/common/admin/TabCount';
import type { ViewTab } from '../_hooks/useViewTab';

interface TabDef {
  value: ViewTab;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  count?: number;
}

interface AuctionViewTabsProps {
  active: ViewTab;
  ruleCount: number;
  stepCount: number;
  peopleCount: number;
}

/** Underlined section tabs along the bottom of the header card. They scroll
 *  sideways on a phone instead of wrapping. */
export function AuctionViewTabs({
  active,
  ruleCount,
  stepCount,
  peopleCount,
}: AuctionViewTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // On a phone the strip scrolls sideways; keep the open tab in view.
  useEffect(() => {
    const trigger = listRef.current?.querySelector<HTMLElement>('[data-state="active"]');
    trigger?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  const tabs: TabDef[] = [
    { value: 'overview', label: 'Overview', shortLabel: 'Overview', icon: Eye },
    { value: 'item', label: 'Item & price', shortLabel: 'Item', icon: Package },
    { value: 'rules', label: 'Rules', shortLabel: 'Rules', icon: ShieldCheck, count: ruleCount },
    {
      value: 'steps',
      label: 'Dates & steps',
      shortLabel: 'Dates',
      icon: CalendarDays,
      count: stepCount,
    },
    {
      value: 'people',
      label: 'Participants',
      shortLabel: 'People',
      icon: Users,
      count: peopleCount,
    },
  ];

  return (
    <TabsList
      ref={listRef}
      aria-label="Auction sections"
      className="-mx-4 flex h-auto justify-start gap-1 overflow-x-auto rounded-none border-t border-border bg-transparent p-0 px-2 sm:-mx-6 sm:px-4"
    >
      {tabs.map(({ value, label, shortLabel, icon: Icon, count }) => (
        <TabsTrigger
          key={value}
          value={value}
          className="group -mb-px min-h-11 shrink-0 gap-2 rounded-none border-b-2 border-transparent px-3 text-sm font-semibold text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          <Icon className="h-4 w-4" aria-hidden />
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{label}</span>
          <TabCount n={count} />
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
