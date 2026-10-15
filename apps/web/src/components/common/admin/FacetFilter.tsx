'use client';

import { ChevronDown } from 'lucide-react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@repo/ui';
import { SearchableCheckList, type CheckListOption } from './SearchableCheckList';

interface FacetFilterProps {
  label: string;
  options: CheckListOption[];
  value: string[];
  onChange: (value: string[]) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

/** Dashed "facet" button for list toolbars; opens a searchable multi-select popover. */
export function FacetFilter({
  label,
  options,
  value,
  onChange,
  searchPlaceholder,
  emptyMessage,
}: FacetFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="border-dashed">
          {label}
          {value.length > 0 && <CountBadge count={value.length} />}
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <SearchableCheckList
          options={options}
          value={value}
          onChange={onChange}
          searchPlaceholder={searchPlaceholder ?? `Search ${label.toLowerCase()}...`}
          emptyMessage={emptyMessage}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Small filled pill showing how many values a filter has. */
export function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-grid min-w-5 h-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
      {count}
    </span>
  );
}
