'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Gavel, Search, SearchX, X } from 'lucide-react';
import { Button, DatePicker, Input } from '@oxneer/ui';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { FacetFilter } from '@/components/common/admin/FacetFilter';
import { ListEmptyState } from '@/components/common/admin/ListEmptyState';
import {
  categoryOptions as toCategoryOptions,
  pruneSubCategories,
  subCategoryOptions as toSubCategoryOptions,
} from '@/components/common/category-options';
import { useCategories } from '@/hooks/useCategories';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePublicAuctions } from '@/hooks/usePublicAuctions';
import { PublicAuctionCard, PublicAuctionCardSkeleton } from './PublicAuctionCard';

const PAGE_SIZE = 12;
/** The API accepts search phrases of up to 100 characters. */
const MAX_SEARCH_LENGTH = 100;

interface GridFilters {
  search: string;
  categories: string[];
  subCategories: string[];
  /** "yyyy-MM-dd"; '' when unset. */
  fromDate: string;
  tillDate: string;
}

const NO_FILTERS: GridFilters = {
  search: '',
  categories: [],
  subCategories: [],
  fromDate: '',
  tillDate: '',
};

function hasFilters(filters: GridFilters): boolean {
  return (
    !!filters.search.trim() ||
    filters.categories.length > 0 ||
    filters.subCategories.length > 0 ||
    !!filters.fromDate ||
    !!filters.tillDate
  );
}

/** Start and end of the chosen days, as instants. */
function dayStartIso(date: string) {
  return date ? new Date(`${date}T00:00:00`).toISOString() : undefined;
}
function dayEndIso(date: string) {
  return date ? new Date(`${date}T23:59:59`).toISOString() : undefined;
}

/** The browse section of the home page: filters that apply as you type, then the grid. */
export default function AuctionGrid() {
  const categories = useCategories();
  const [filters, setFilters] = useState<GridFilters>(NO_FILTERS);
  const search = useDebouncedValue(filters.search.trim());

  const query = useMemo(
    () => ({
      phrases: search ? [search] : undefined,
      categories: filters.categories,
      subCategories: filters.subCategories,
      fromTime: dayStartIso(filters.fromDate),
      tillTime: dayEndIso(filters.tillDate),
      size: PAGE_SIZE,
    }),
    [search, filters.categories, filters.subCategories, filters.fromDate, filters.tillDate],
  );
  const list = usePublicAuctions(query);

  const update = (patch: Partial<GridFilters>) => setFilters((prev) => ({ ...prev, ...patch }));
  const setCategories = (ids: string[]) =>
    update({
      categories: ids,
      subCategories: pruneSubCategories(categories, ids, filters.subCategories),
    });
  const clearFilters = () => setFilters(NO_FILTERS);
  const filtered = hasFilters(filters);

  return (
    <section id="auctions" className="scroll-mt-20 py-20">
      <div className="container mx-auto px-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground text-balance md:text-4xl">
              Browse auctions
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Live and upcoming auctions you can take part in.
            </p>
          </div>
          {!list.isLoading && !list.error && (
            <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
              {list.totalRecords === 1 ? '1 auction' : `${list.totalRecords} auctions`}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-[1_1_260px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
              maxLength={MAX_SEARCH_LENGTH}
              placeholder="Search by title, reference or item"
              aria-label="Search auctions"
              className="h-10 pl-9"
            />
          </div>
          <FacetFilter
            label="Categories"
            options={toCategoryOptions(categories)}
            value={filters.categories}
            onChange={setCategories}
            emptyMessage="No categories found"
          />
          <FacetFilter
            label="Sub-categories"
            options={toSubCategoryOptions(categories, filters.categories)}
            value={filters.subCategories}
            onChange={(subCategories) => update({ subCategories })}
            emptyMessage="No sub-categories found"
          />
          <div className="flex items-center gap-2">
            <DatePicker
              value={filters.fromDate}
              onChange={(fromDate) => update({ fromDate })}
              placeholder="Starts from"
              className="w-[150px]"
            />
            <DatePicker
              value={filters.tillDate}
              onChange={(tillDate) => update({ tillDate })}
              placeholder="Starts by"
              className="w-[150px]"
            />
          </div>
          {filtered && (
            <Button variant="ghost" onClick={clearFilters}>
              <X />
              Clear
            </Button>
          )}
        </div>

        <div className="mt-8">
          <GridBody list={list} filtered={filtered} onClearFilters={clearFilters} />
        </div>

        {list.totalPages > 1 && (
          <nav aria-label="Auction pages" className="mt-10 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => list.goToPage(list.page - 1)}
              disabled={list.page === 0 || list.isLoading}
            >
              <ChevronLeft />
              Previous
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">
              Page {list.page + 1} of {list.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => list.goToPage(list.page + 1)}
              disabled={list.page + 1 >= list.totalPages || list.isLoading}
            >
              Next
              <ChevronRight />
            </Button>
          </nav>
        )}
      </div>
    </section>
  );
}

function GridBody({
  list,
  filtered,
  onClearFilters,
}: {
  list: ReturnType<typeof usePublicAuctions>;
  filtered: boolean;
  onClearFilters: () => void;
}) {
  if (list.isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading auctions"
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <PublicAuctionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (list.error) {
    return (
      <div className="space-y-3">
        <ErrorAlert message={list.error} />
        <Button variant="outline" onClick={list.retry}>
          Try again
        </Button>
      </div>
    );
  }

  if (list.auctions.length === 0) {
    return filtered ? (
      <ListEmptyState
        icon={SearchX}
        title="No auctions match your search"
        hint="Try fewer words, another category or a wider date range."
        action={
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <ListEmptyState
        icon={Gavel}
        title="No auctions are open right now"
        hint="New auctions appear here as soon as they’re published."
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {list.auctions.map((auction) => (
        <PublicAuctionCard key={auction.id} auction={auction} />
      ))}
    </div>
  );
}
