'use client';

import type { ReactNode } from 'react';
import { Filter } from 'lucide-react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@oxneer/ui';
import { CountBadge } from '@/components/common/admin/FacetFilter';
import {
  SearchableCheckList,
  type CheckListOption,
} from '@/components/common/admin/SearchableCheckList';
import { moreFiltersCount, type AuctionsFilters } from '../../_lib/auctions-filters';
import { AuctionsMoreFiltersFields } from './AuctionsMoreFilters';

interface AuctionsMobileFiltersSheetProps {
  filters: AuctionsFilters;
  onChange: (patch: Partial<AuctionsFilters>) => void;
  onCategoriesChange: (ids: string[]) => void;
  categoryOptions: CheckListOption[];
  subCategoryOptions: CheckListOption[];
}

/** Phone layout: one Filters button (with a count) opening every filter in a bottom sheet. */
export function AuctionsMobileFiltersSheet({
  filters,
  onChange,
  onCategoriesChange,
  categoryOptions,
  subCategoryOptions,
}: AuctionsMobileFiltersSheetProps) {
  const active =
    filters.categories.length + filters.subCategories.length + moreFiltersCount(filters);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-11 w-11"
          aria-label={active ? `Filters, ${active} active` : 'Filters'}
        >
          <Filter />
          {active > 0 && (
            <span className="absolute -right-2 -top-2">
              <CountBadge count={active} />
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl p-0">
        <SheetHeader className="px-4 pb-2 pt-4 text-left">
          <SheetTitle className="font-display">Filters</SheetTitle>
          <SheetDescription>Changes apply instantly.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 pb-6">
          <FilterGroup title="Categories">
            <SearchableCheckList
              options={categoryOptions}
              value={filters.categories}
              onChange={onCategoriesChange}
              searchPlaceholder="Search categories..."
              emptyMessage="No categories found"
              autoFocus={false}
            />
          </FilterGroup>
          <FilterGroup title="Sub-categories">
            <SearchableCheckList
              options={subCategoryOptions}
              value={filters.subCategories}
              onChange={(subCategories) => onChange({ subCategories })}
              searchPlaceholder="Search sub-categories..."
              emptyMessage="No sub-categories found"
              autoFocus={false}
            />
          </FilterGroup>
          <AuctionsMoreFiltersFields filters={filters} onChange={onChange} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-[13px] font-medium">{title}</h3>
      <div className="overflow-hidden rounded-md border border-border">{children}</div>
    </section>
  );
}
