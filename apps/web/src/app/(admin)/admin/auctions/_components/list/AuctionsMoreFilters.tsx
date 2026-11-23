'use client';

import type { ReactNode } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { Button, DateTimePicker, Popover, PopoverContent, PopoverTrigger } from '@oxneer/ui';
import { CountBadge } from '@/components/common/admin/FacetFilter';
import { SegmentedControl } from '@/components/common/admin/SegmentedControl';
import {
  ACCESS_OPTIONS,
  DIRECTION_OPTIONS,
  moreFiltersCount,
  type AuctionsFilters,
} from '../../_lib/auctions-filters';

interface MoreFiltersProps {
  filters: AuctionsFilters;
  onChange: (patch: Partial<AuctionsFilters>) => void;
}

/** Access, direction and start-time range behind one toolbar button. */
export function AuctionsMoreFiltersPopover({ filters, onChange }: MoreFiltersProps) {
  const active = moreFiltersCount(filters);
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
        <AuctionsMoreFiltersFields filters={filters} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

/** The More-filters controls; also used in the mobile filters sheet. */
export function AuctionsMoreFiltersFields({ filters, onChange }: MoreFiltersProps) {
  const active = moreFiltersCount(filters);

  const setFromTime = (fromTime: string) => {
    // A start after the end makes an empty range, so the end is cleared instead.
    const tillTime = fromTime && filters.tillTime && fromTime > filters.tillTime ? '' : undefined;
    onChange(tillTime === undefined ? { fromTime } : { fromTime, tillTime });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <FieldGroup label="Access">
        <SegmentedControl
          label="Access"
          options={ACCESS_OPTIONS}
          value={filters.accessibility}
          onChange={(accessibility) => onChange({ accessibility })}
          className="w-full"
        />
      </FieldGroup>
      <FieldGroup label="Direction">
        <SegmentedControl
          label="Direction"
          options={DIRECTION_OPTIONS}
          value={filters.direction}
          onChange={(direction) => onChange({ direction })}
          className="w-full"
        />
      </FieldGroup>
      <FieldGroup label="Starts between">
        <div className="grid grid-cols-2 gap-2">
          <DateTimePicker
            value={filters.fromTime}
            onChange={setFromTime}
            max={filters.tillTime || undefined}
            placeholder="Any time"
          />
          <DateTimePicker
            value={filters.tillTime}
            onChange={(tillTime) => onChange({ tillTime })}
            min={filters.fromTime || undefined}
            placeholder="Any time"
          />
        </div>
      </FieldGroup>
      <div className="-mx-4 h-px bg-border" />
      <button
        type="button"
        onClick={() =>
          onChange({ accessibility: 'any', direction: 'any', fromTime: '', tillTime: '' })
        }
        disabled={active === 0}
        className="self-start text-[13px] font-medium text-primary underline underline-offset-4 disabled:text-muted-foreground disabled:no-underline"
      >
        Reset these
      </button>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      {children}
    </div>
  );
}
