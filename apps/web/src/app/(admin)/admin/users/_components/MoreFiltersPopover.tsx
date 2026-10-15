'use client';

import { ChevronDown, Filter } from 'lucide-react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@repo/ui';
import { CountBadge } from '@/components/common/admin/FacetFilter';
import { SegmentedControl } from '@/components/common/admin/SegmentedControl';
import {
  countStatusFilters,
  STATUS_FILTER_KEYS,
  STATUS_FILTERS,
  type StatusFilterKey,
  type TriState,
  type UsersFilters,
} from '../_lib/users-filters';

interface MoreFiltersPopoverProps {
  filters: UsersFilters;
  onChange: (patch: Partial<Record<StatusFilterKey, TriState>>) => void;
}

/** Account / credentials / verification filters behind one toolbar button. */
export function MoreFiltersPopover({ filters, onChange }: MoreFiltersPopoverProps) {
  const active = countStatusFilters(filters);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" className="group">
          <Filter />
          More filters
          {active > 0 && <CountBadge count={active} />}
          <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-[340px] flex-col gap-3.5 p-4">
        {STATUS_FILTERS.map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">{f.label}</span>
            <SegmentedControl
              label={f.label}
              options={f.options}
              value={filters[f.key]}
              onChange={(v) => onChange({ [f.key]: v })}
              className="w-full"
            />
          </div>
        ))}
        <div className="-mx-4 h-px bg-border" />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              onChange(Object.fromEntries(STATUS_FILTER_KEYS.map((k) => [k, 'any' as const])))
            }
            disabled={active === 0}
            className="text-[13px] font-medium text-primary underline underline-offset-4 disabled:text-muted-foreground disabled:no-underline"
          >
            Reset these
          </button>
          <span className="text-xs text-muted-foreground">Applies instantly</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
