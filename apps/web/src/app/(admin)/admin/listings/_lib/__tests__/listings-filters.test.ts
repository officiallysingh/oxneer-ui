import type { CategoryVM } from '@oxneer/api';
import {
  EMPTY_LISTINGS_FILTERS,
  availableFromStatsKey,
  listingsFiltersToSearchParams,
  parseListingsFilters,
  pruneSubCategories,
  statsKeyFromAvailable,
  toListingsQuery,
} from '../listings-filters';

describe('listings filters', () => {
  it('round-trips through URL search params', () => {
    const filters = {
      phrases: ['red car', 'vintage'],
      available: 'false' as const,
      categories: ['c1'],
      subCategories: ['s1', 's2'],
    };
    const params = listingsFiltersToSearchParams(filters);
    expect(parseListingsFilters(params)).toEqual(filters);
  });

  it('treats an unknown available value as all', () => {
    expect(parseListingsFilters(new URLSearchParams('available=maybe')).available).toBe('all');
  });

  it('writes nothing to the URL for empty filters', () => {
    expect(listingsFiltersToSearchParams(EMPTY_LISTINGS_FILTERS).toString()).toBe('');
  });

  it('leaves empty lists and "all" out of the API query', () => {
    expect(toListingsQuery(EMPTY_LISTINGS_FILTERS)).toEqual({
      phrases: undefined,
      available: undefined,
      categories: undefined,
      subCategories: undefined,
    });
    expect(toListingsQuery({ ...EMPTY_LISTINGS_FILTERS, available: 'true' }).available).toBe(true);
  });

  it('drops sub-categories whose category is no longer selected', () => {
    const categories = [
      { id: 'c1', name: 'Cars', subCategories: [{ id: 's1', name: 'Sedan' }] },
      { id: 'c2', name: 'Bikes', subCategories: [{ id: 's2', name: 'Road' }] },
    ] as CategoryVM[];
    expect(pruneSubCategories(['s1', 's2', 'unknown'], ['c2'], categories)).toEqual(['s2']);
  });

  it('maps stats cards to the available filter and back', () => {
    expect(availableFromStatsKey('ACTIVE')).toBe('true');
    expect(availableFromStatsKey('PENDING')).toBe('false');
    expect(availableFromStatsKey('ALL')).toBe('all');
    expect(statsKeyFromAvailable('false')).toBe('PENDING');
  });
});
