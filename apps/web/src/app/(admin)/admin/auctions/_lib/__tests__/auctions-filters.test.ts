import type { CategoryVM } from '@oxneer/api';
import {
  EMPTY_FILTERS,
  filtersToSearchParams,
  hasAnyFilter,
  moreFiltersCount,
  parseFilters,
  pruneSubCategories,
  subCategoryOptions,
  toApiFilter,
  type AuctionsFilters,
} from '../auctions-filters';
import { permittedActions } from '../auction-display';

const CATEGORIES = [
  {
    id: 'vehicles',
    name: 'Vehicles',
    subCategories: [
      { id: 'cars', name: 'Cars' },
      { id: 'bikes', name: 'Bikes' },
    ],
  },
  { id: 'property', name: 'Property', subCategories: [{ id: 'land', name: 'Land' }] },
] as CategoryVM[];

describe('auctions filters', () => {
  it('round-trips every filter through the URL', () => {
    const filters: AuctionsFilters = {
      phrases: ['tractor', 'pune'],
      status: 'closed',
      categories: ['vehicles'],
      subCategories: ['cars'],
      accessibility: 'PRIVATE',
      direction: 'REVERSE',
      fromTime: '2026-11-01T10:00',
      tillTime: '2026-11-30T18:00',
    };
    expect(parseFilters(filtersToSearchParams(filters))).toEqual(filters);
  });

  it('leaves the URL empty for the default filters', () => {
    expect(filtersToSearchParams(EMPTY_FILTERS).toString()).toBe('');
  });

  it('ignores unknown values in the URL', () => {
    const parsed = parseFilters(
      new URLSearchParams('status=DRAFT&accessibility=open&direction=up'),
    );
    expect(parsed.status).toBe('all');
    expect(parsed.accessibility).toBe('any');
    expect(parsed.direction).toBe('any');
  });

  it('caps search phrases at the API limit', () => {
    const params = new URLSearchParams();
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach((p) => params.append('phrases', p));
    expect(parseFilters(params).phrases).toHaveLength(5);
  });

  it('sends a tab as its backend statuses and leaves "any" out', () => {
    const api = toApiFilter({ ...EMPTY_FILTERS, status: 'closed' });
    expect(api.statuses).toEqual(['COMPLETED', 'AWARDED']);
    expect(api.accessibility).toBeUndefined();
    expect(api.direction).toBeUndefined();
    expect(api.fromTime).toBeUndefined();
  });

  it('sends the start-time range as ISO instants', () => {
    const api = toApiFilter({ ...EMPTY_FILTERS, fromTime: '2026-11-01T10:00' });
    expect(api.fromTime).toBe(new Date('2026-11-01T10:00').toISOString());
  });

  it('counts the range as one "more" filter and the tab as a filter', () => {
    const ranged = { ...EMPTY_FILTERS, fromTime: '2026-11-01T10:00', tillTime: '2026-11-02T10:00' };
    expect(moreFiltersCount(ranged)).toBe(1);
    expect(hasAnyFilter(EMPTY_FILTERS)).toBe(false);
    expect(hasAnyFilter({ ...EMPTY_FILTERS, status: 'live' })).toBe(true);
  });

  it('offers sub-categories of the chosen categories, labelled with their category', () => {
    expect(subCategoryOptions(CATEGORIES, []).map((o) => o.value)).toEqual([
      'cars',
      'bikes',
      'land',
    ]);
    expect(subCategoryOptions(CATEGORIES, ['property'])).toEqual([
      { value: 'land', label: 'Land', sublabel: 'Property' },
    ]);
  });

  it('drops chosen sub-categories outside the chosen categories', () => {
    expect(pruneSubCategories(CATEGORIES, ['vehicles'], ['cars', 'land'])).toEqual(['cars']);
    expect(pruneSubCategories(CATEGORIES, [], ['cars', 'land'])).toEqual(['cars', 'land']);
  });
});

describe('permittedActions', () => {
  it('allows edit and delete only before publishing', () => {
    expect(permittedActions({ status: 'DRAFT' })).toMatchObject({
      edit: true,
      schedule: true,
      publish: false,
      cancel: false,
      delete: true,
    });
    expect(permittedActions({ status: 'SCHEDULED' })).toMatchObject({
      edit: true,
      schedule: false,
      publish: true,
      delete: true,
    });
  });

  it('allows only cancel once published, and nothing after that', () => {
    expect(permittedActions({ status: 'PUBLISHED' })).toEqual({
      edit: false,
      schedule: false,
      publish: false,
      cancel: true,
      delete: false,
    });
    expect(Object.values(permittedActions({ status: 'LIVE' }))).not.toContain(true);
    expect(Object.values(permittedActions({ status: { AWARDED: 'Awarded' } }))).not.toContain(true);
  });
});
