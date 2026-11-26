'use client';

import Select, { type MultiValue } from 'react-select';
import { Search, X } from 'lucide-react';
import type { CategoryVM } from '@oxneer/api';
import {
  Button,
  Label,
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@oxneer/ui';
import {
  GroupedSubcategorySelect,
  makeReactSelectStyles,
} from '@/components/common/admin/GroupedSubcategorySelect';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import {
  pruneSubCategories,
  type AvailableFilter,
  type ListingsFilters,
} from '../_lib/listings-filters';

interface SelectOption {
  label: string;
  value: string;
}

interface ListingsFilterPanelProps {
  filters: ListingsFilters;
  categories: CategoryVM[];
  onChange: (patch: Partial<ListingsFilters>) => void;
  onSearch: () => void;
  onReset: () => void;
}

const categorySelectStyles = makeReactSelectStyles<true>();

const fieldLabel = 'text-xs font-medium text-muted-foreground';

export function ListingsFilterPanel({
  filters,
  categories,
  onChange,
  onSearch,
  onReset,
}: ListingsFilterPanelProps) {
  const categoryOptions: SelectOption[] = categories.map((c) => ({ label: c.name, value: c.id }));
  const selectedCategories = categoryOptions.filter((o) => filters.categories.includes(o.value));
  const subCategorySource = filters.categories.length
    ? categories.filter((c) => filters.categories.includes(c.id))
    : categories;

  const handleCategoriesChange = (values: MultiValue<SelectOption>) => {
    const categoryIds = values.map((v) => v.value);
    onChange({
      categories: categoryIds,
      subCategories: pruneSubCategories(filters.subCategories, categoryIds, categories),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px] space-y-1.5">
          <Label className={fieldLabel}>Search phrases</Label>
          <PhrasesInput
            value={filters.phrases}
            onChange={(phrases) => onChange({ phrases })}
            placeholder="Type phrase and press Enter..."
          />
        </div>

        <div className="min-w-[130px] space-y-1.5">
          <Label htmlFor="listings-available" className={fieldLabel}>
            Available
          </Label>
          <UiSelect
            value={filters.available}
            onValueChange={(value) => onChange({ available: value as AvailableFilter })}
          >
            <SelectTrigger id="listings-available" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </UiSelect>
        </div>

        <div className="min-w-[240px] space-y-1.5">
          <Label className={fieldLabel}>Categories</Label>
          <Select<SelectOption, true>
            isMulti
            options={categoryOptions}
            value={selectedCategories}
            onChange={handleCategoriesChange}
            placeholder="All categories"
            aria-label="Categories"
            styles={categorySelectStyles}
          />
        </div>

        <div className="min-w-[240px] space-y-1.5">
          <Label className={fieldLabel}>Sub-categories</Label>
          <GroupedSubcategorySelect
            isMulti
            categories={subCategorySource}
            value={filters.subCategories}
            onChange={(subCategories) => onChange({ subCategories })}
            placeholder="All sub-categories"
          />
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
