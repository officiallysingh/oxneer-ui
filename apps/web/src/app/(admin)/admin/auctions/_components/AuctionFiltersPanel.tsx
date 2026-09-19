'use client';

import { Search, X } from 'lucide-react';
import type { CategoryVM } from '@repo/api';
import { Button, DateTimePicker, Label } from '@repo/ui';
import Select from 'react-select';
import type { MultiValue } from 'react-select';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import {
  GroupedSubcategorySelect,
  makeReactSelectStyles,
} from '@/components/common/admin/GroupedSubcategorySelect';

export interface SelectOption {
  label: string;
  value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reactSelectStyles = makeReactSelectStyles<true>() as any;

export interface AuctionFiltersPanelProps {
  phrases: string[];
  onPhrasesChange: (phrases: string[]) => void;
  categories: CategoryVM[];
  categoryOptions: SelectOption[];
  selectedCategories: SelectOption[];
  onCategoriesChange: (categories: SelectOption[]) => void;
  selectedSubCategories: SelectOption[];
  onSubCategoriesChange: (subCategories: SelectOption[]) => void;
  fromTime: string;
  onFromTimeChange: (value: string) => void;
  tillTime: string;
  onTillTimeChange: (value: string) => void;
  accessibility: string;
  onAccessibilityChange: (value: string) => void;
  direction: string;
  onDirectionChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function AuctionFiltersPanel({
  phrases,
  onPhrasesChange,
  categories,
  categoryOptions,
  selectedCategories,
  onCategoriesChange,
  selectedSubCategories,
  onSubCategoriesChange,
  fromTime,
  onFromTimeChange,
  tillTime,
  onTillTimeChange,
  accessibility,
  onAccessibilityChange,
  direction,
  onDirectionChange,
  status,
  onStatusChange,
  onSearch,
  onReset,
}: AuctionFiltersPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px] space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Search phrases</Label>
          <PhrasesInput
            value={phrases}
            onChange={onPhrasesChange}
            placeholder="Type phrase and press Enter..."
          />
        </div>

        <div className="min-w-[220px] space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Categories</Label>
          <Select<SelectOption, true>
            isMulti
            options={categoryOptions}
            value={selectedCategories}
            onChange={(vals: MultiValue<SelectOption>) => {
              onCategoriesChange([...vals]);
              const catIds = new Set(vals.map((v) => v.value));
              onSubCategoriesChange(
                selectedSubCategories.filter((s) => {
                  const ownerCat = categories.find((c) =>
                    c.subCategories?.some((sc) => sc.id === s.value),
                  );
                  return ownerCat && catIds.has(ownerCat.id);
                }),
              );
            }}
            placeholder="All categories"
            styles={reactSelectStyles}
          />
        </div>

        <div className="min-w-[220px] space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Sub-categories</Label>
          <GroupedSubcategorySelect
            isMulti
            categories={
              selectedCategories.length > 0
                ? categories.filter((c) => selectedCategories.some((s) => s.value === c.id))
                : categories
            }
            value={selectedSubCategories.map((o) => o.value)}
            onChange={(ids) => {
              const allSubs = categories.flatMap((c) => c.subCategories ?? []);
              onSubCategoriesChange(
                ids
                  .map((id) => allSubs.find((s) => s.id === id))
                  .filter(Boolean)
                  .map((s) => ({ label: s!.name, value: s!.id })),
              );
            }}
            placeholder="All sub-categories"
          />
        </div>

        <div className="min-w-[200px] space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">From schedule time</Label>
          <DateTimePicker value={fromTime} onChange={onFromTimeChange} placeholder="Any" />
        </div>

        <div className="min-w-[200px] space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Till schedule time</Label>
          <DateTimePicker value={tillTime} onChange={onTillTimeChange} placeholder="Any" />
        </div>

        <div className="min-w-[160px] space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Accessibility</Label>
          <select
            value={accessibility}
            onChange={(e) => onAccessibilityChange(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All</option>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>

        <div className="min-w-[160px] space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Direction</Label>
          <select
            value={direction}
            onChange={(e) => onDirectionChange(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All</option>
            <option value="FORWARD">Forward</option>
            <option value="REVERSE">Reverse</option>
          </select>
        </div>

        <div className="min-w-[160px] space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Status</Label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PUBLISHED">Published</option>
            <option value="LIVE">Live</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
            <option value="AWARDED">Awarded</option>
          </select>
        </div>

        <div className="flex gap-2 pb-0.5">
          <Button size="sm" onClick={onSearch} className="gap-1.5">
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
          <Button size="sm" variant="outline" onClick={onReset} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
