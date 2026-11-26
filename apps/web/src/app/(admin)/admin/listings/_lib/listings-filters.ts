import type { CategoryVM, ListingsFilter } from '@oxneer/api';

export type AvailableFilter = 'all' | 'true' | 'false';

/** Listings list filters, held as ids so they survive a reload through the URL. */
export interface ListingsFilters {
  phrases: string[];
  available: AvailableFilter;
  categories: string[];
  subCategories: string[];
}

export const EMPTY_LISTINGS_FILTERS: ListingsFilters = {
  phrases: [],
  available: 'all',
  categories: [],
  subCategories: [],
};

type ReadableParams = Pick<URLSearchParams, 'get' | 'getAll'>;

function parseAvailable(value: string | null): AvailableFilter {
  return value === 'true' || value === 'false' ? value : 'all';
}

export function parseListingsFilters(params: ReadableParams): ListingsFilters {
  return {
    phrases: params.getAll('phrases'),
    available: parseAvailable(params.get('available')),
    categories: params.getAll('categories'),
    subCategories: params.getAll('subCategories'),
  };
}

export function listingsFiltersToSearchParams(filters: ListingsFilters): URLSearchParams {
  const params = new URLSearchParams();
  filters.phrases.forEach((p) => params.append('phrases', p));
  if (filters.available !== 'all') params.set('available', filters.available);
  filters.categories.forEach((id) => params.append('categories', id));
  filters.subCategories.forEach((id) => params.append('subCategories', id));
  return params;
}

/** Filters → `listingsApi.getListings` arguments (empty lists are left out). */
export function toListingsQuery(filters: ListingsFilters): Omit<ListingsFilter, 'page' | 'size'> {
  return {
    phrases: filters.phrases.length ? filters.phrases : undefined,
    available: filters.available === 'all' ? undefined : filters.available === 'true',
    categories: filters.categories.length ? filters.categories : undefined,
    subCategories: filters.subCategories.length ? filters.subCategories : undefined,
  };
}

/** Keeps only the sub-categories that belong to one of `categoryIds`. */
export function pruneSubCategories(
  subCategoryIds: string[],
  categoryIds: string[],
  categories: CategoryVM[],
): string[] {
  const selected = new Set(categoryIds);
  return subCategoryIds.filter((subId) => {
    const owner = categories.find((c) => c.subCategories?.some((s) => s.id === subId));
    return owner !== undefined && selected.has(owner.id);
  });
}

/** Stats card key ↔ the `available` filter it stands for. */
const STATS_TO_AVAILABLE: Record<string, AvailableFilter> = {
  ACTIVE: 'true',
  PENDING: 'false',
};

export function availableFromStatsKey(key: string): AvailableFilter {
  return STATS_TO_AVAILABLE[key] ?? 'all';
}

export function statsKeyFromAvailable(available: AvailableFilter): string {
  if (available === 'true') return 'ACTIVE';
  if (available === 'false') return 'PENDING';
  return 'ALL';
}
