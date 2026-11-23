'use client';

import { FacetFilter } from '@/components/common/admin/FacetFilter';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import type { CheckListOption } from '@/components/common/admin/SearchableCheckList';
import { MAX_PHRASE_LENGTH, MAX_PHRASES, type AuctionsFilters } from '../../_lib/auctions-filters';
import { AuctionsMobileFiltersSheet } from './AuctionsMobileFiltersSheet';
import { AuctionsMoreFiltersPopover } from './AuctionsMoreFilters';

interface AuctionsFilterBarProps {
  filters: AuctionsFilters;
  onChange: (patch: Partial<AuctionsFilters>) => void;
  /** Sets categories and drops sub-categories outside them. */
  onCategoriesChange: (ids: string[]) => void;
  categoryOptions: CheckListOption[];
  subCategoryOptions: CheckListOption[];
}

/**
 * Search terms + Category / Sub-category facets + "More filters"; on phones the
 * facets collapse into one Filters sheet. All apply instantly; "/" focuses the search.
 */
export function AuctionsFilterBar({
  filters,
  onChange,
  onCategoriesChange,
  categoryOptions,
  subCategoryOptions,
}: AuctionsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <div className="min-w-0 flex-[1_1_200px] md:flex-[1_1_360px]">
        <PhrasesInput
          value={filters.phrases}
          onChange={(phrases) => onChange({ phrases })}
          placeholder="Search title, reference, tag or item — Enter to add"
          ariaLabel="Search title, reference, tag or item"
          maxPhrases={MAX_PHRASES}
          maxLength={MAX_PHRASE_LENGTH}
          shortcutKey="/"
          showSearchIcon
        />
      </div>
      <div className="md:hidden">
        <AuctionsMobileFiltersSheet
          filters={filters}
          onChange={onChange}
          onCategoriesChange={onCategoriesChange}
          categoryOptions={categoryOptions}
          subCategoryOptions={subCategoryOptions}
        />
      </div>
      <div className="hidden flex-wrap gap-2 md:flex">
        <FacetFilter
          label="Categories"
          options={categoryOptions}
          value={filters.categories}
          onChange={onCategoriesChange}
          emptyMessage="No categories found"
        />
        <FacetFilter
          label="Sub-categories"
          options={subCategoryOptions}
          value={filters.subCategories}
          onChange={(subCategories) => onChange({ subCategories })}
          emptyMessage="No sub-categories found"
        />
        <AuctionsMoreFiltersPopover filters={filters} onChange={onChange} />
      </div>
    </div>
  );
}
