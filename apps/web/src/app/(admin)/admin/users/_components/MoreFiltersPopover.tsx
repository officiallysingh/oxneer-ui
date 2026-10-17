'use client';

import { ChevronDown, Filter } from 'lucide-react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@repo/ui';
import { CountBadge } from '@/components/common/admin/FacetFilter';
import { SegmentedControl } from '@/components/common/admin/SegmentedControl';
import {
  moreFiltersSet,
  STATUS_FILTERS,
  type StatusFilterKey,
  type TriState,
  type UsersFilters,
} from '../_lib/users-filters';

interface MoreFiltersProps {
  filters: UsersFilters;
  onChange: (patch: Partial<Record<StatusFilterKey, TriState>>) => void;
}

/** Credentials / verification filters behind one toolbar button. */
export function MoreFiltersPopover({ filters, onChange }: MoreFiltersProps) {
  const active = moreFiltersSet(filters).length;
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
      <PopoverContent align="end" className="w-[340px] p-4">
        <MoreFiltersFields filters={filters} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

/** The More-filters controls; also used in the mobile filters sheet. */
export function MoreFiltersFields({ filters, onChange }: MoreFiltersProps) {
  const set = moreFiltersSet(filters);
  return (
    <div className="flex flex-col gap-3.5">
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
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onChange(Object.fromEntries(set.map((k) => [k, 'any' as const])))}
          disabled={set.length === 0}
          className="text-[13px] font-medium text-primary underline underline-offset-4 disabled:text-muted-foreground disabled:no-underline"
        >
          Reset these
        </button>
        <span className="text-right text-xs text-muted-foreground">
          Enabled / Disabled is in the tabs above
        </span>
      </div>
    </div>
  );
}
