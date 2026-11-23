import type { AuctionsFilter, CategoryVM } from '@oxneer/api';
import type { SegmentOption } from '@/components/common/admin/SegmentedControl';
import type { CheckListOption } from '@/components/common/admin/SearchableCheckList';
import { formatDateTime } from '@/components/common/admin/format';

/** Search limits enforced by GET /api/v1/auctions. */
export const MAX_PHRASES = 5;
export const MAX_PHRASE_LENGTH = 100;

export type AccessFilter = 'any' | 'PUBLIC' | 'PRIVATE';
export type DirectionFilter = 'any' | 'FORWARD' | 'REVERSE';

export type StatusTabId =
  'all' | 'draft' | 'scheduled' | 'published' | 'live' | 'closed' | 'cancelled';

/** Status tabs above the list; each maps to the backend statuses it shows. */
export const STATUS_TABS: readonly { id: StatusTabId; label: string; statuses: string[] }[] = [
  { id: 'all', label: 'All', statuses: [] },
  { id: 'draft', label: 'Draft', statuses: ['DRAFT'] },
  { id: 'scheduled', label: 'Scheduled', statuses: ['SCHEDULED'] },
  { id: 'published', label: 'Published', statuses: ['PUBLISHED'] },
  { id: 'live', label: 'Live', statuses: ['LIVE'] },
  // Completed and awarded are both finished auctions; one tab keeps the bar short.
  { id: 'closed', label: 'Closed', statuses: ['COMPLETED', 'AWARDED'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED'] },
];

export interface AuctionsFilters {
  phrases: string[];
  status: StatusTabId;
  categories: string[];
  subCategories: string[];
  accessibility: AccessFilter;
  direction: DirectionFilter;
  /** Start-time range as picker values ("yyyy-MM-ddTHH:mm", local time); '' when unset. */
  fromTime: string;
  tillTime: string;
}

export const EMPTY_FILTERS: AuctionsFilters = {
  phrases: [],
  status: 'all',
  categories: [],
  subCategories: [],
  accessibility: 'any',
  direction: 'any',
  fromTime: '',
  tillTime: '',
};

export const ACCESS_OPTIONS: readonly SegmentOption<AccessFilter>[] = [
  { value: 'any', label: 'Any' },
  { value: 'PUBLIC', label: 'Public' },
  { value: 'PRIVATE', label: 'Private' },
];

export const DIRECTION_OPTIONS: readonly SegmentOption<DirectionFilter>[] = [
  { value: 'any', label: 'Any' },
  { value: 'FORWARD', label: 'Forward' },
  { value: 'REVERSE', label: 'Reverse' },
];

/** How many of the "More filters" are set: access, direction and the start-time range. */
export function moreFiltersCount(filters: AuctionsFilters): number {
  return [
    filters.accessibility !== 'any',
    filters.direction !== 'any',
    !!(filters.fromTime || filters.tillTime),
  ].filter(Boolean).length;
}

export function hasAnyFilter(filters: AuctionsFilters): boolean {
  return (
    filters.phrases.length > 0 ||
    filters.status !== 'all' ||
    filters.categories.length > 0 ||
    filters.subCategories.length > 0 ||
    moreFiltersCount(filters) > 0
  );
}

function optionLabel<T extends string>(options: readonly SegmentOption<T>[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function accessLabel(value: AccessFilter): string {
  return optionLabel(ACCESS_OPTIONS, value);
}

export function directionLabel(value: DirectionFilter): string {
  return optionLabel(DIRECTION_OPTIONS, value);
}

const RANGE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

/** "Starts: 12 Nov, 10:00 am – 20 Nov, 06:00 pm", or one-sided ("Starts after …"). */
export function scheduleRangeLabel(fromTime: string, tillTime: string): string {
  const from = fromTime && formatDateTime(fromTime, RANGE_DATE_FORMAT);
  const till = tillTime && formatDateTime(tillTime, RANGE_DATE_FORMAT);
  if (from && till) return `Starts: ${from} – ${till}`;
  if (from) return `Starts after ${from}`;
  if (till) return `Starts before ${till}`;
  return '';
}

/** Category facet options. */
export function categoryOptions(categories: CategoryVM[]): CheckListOption[] {
  return categories.map((c) => ({ value: c.id, label: c.name }));
}

/** Sub-category facet options, limited to the chosen categories (all when none chosen),
 *  each labelled with its category so same-named sub-categories stay distinguishable. */
export function subCategoryOptions(
  categories: CategoryVM[],
  selectedCategoryIds: string[],
): CheckListOption[] {
  const inScope = selectedCategoryIds.length
    ? categories.filter((c) => selectedCategoryIds.includes(c.id))
    : categories;
  return inScope.flatMap((c) =>
    (c.subCategories ?? []).map((s) => ({ value: s.id, label: s.name, sublabel: c.name })),
  );
}

/** Drops chosen sub-categories that no longer belong to the chosen categories. */
export function pruneSubCategories(
  categories: CategoryVM[],
  selectedCategoryIds: string[],
  subCategoryIds: string[],
): string[] {
  const allowed = new Set(subCategoryOptions(categories, selectedCategoryIds).map((o) => o.value));
  return subCategoryIds.filter((id) => allowed.has(id));
}

function statusTabOf(value: string | null): StatusTabId {
  return STATUS_TABS.find((t) => t.id === value)?.id ?? 'all';
}

function accessOf(value: string | null): AccessFilter {
  return value === 'PUBLIC' || value === 'PRIVATE' ? value : 'any';
}

function directionOf(value: string | null): DirectionFilter {
  return value === 'FORWARD' || value === 'REVERSE' ? value : 'any';
}

/** URL query → filters. Keys match the API's so links stay readable and stable. */
export function parseFilters(params: URLSearchParams): AuctionsFilters {
  return {
    phrases: params.getAll('phrases').slice(0, MAX_PHRASES),
    status: statusTabOf(params.get('status')),
    categories: params.getAll('categories'),
    subCategories: params.getAll('subCategories'),
    accessibility: accessOf(params.get('accessibility')),
    direction: directionOf(params.get('direction')),
    fromTime: params.get('fromTime') ?? '',
    tillTime: params.get('tillTime') ?? '',
  };
}

export function filtersToSearchParams(filters: AuctionsFilters): URLSearchParams {
  const params = new URLSearchParams();
  filters.phrases.forEach((p) => params.append('phrases', p));
  if (filters.status !== 'all') params.set('status', filters.status);
  filters.categories.forEach((c) => params.append('categories', c));
  filters.subCategories.forEach((s) => params.append('subCategories', s));
  if (filters.accessibility !== 'any') params.set('accessibility', filters.accessibility);
  if (filters.direction !== 'any') params.set('direction', filters.direction);
  if (filters.fromTime) params.set('fromTime', filters.fromTime);
  if (filters.tillTime) params.set('tillTime', filters.tillTime);
  return params;
}

/** A picker value ("yyyy-MM-ddTHH:mm", local) as an ISO instant; undefined when unset or invalid. */
export function localToIso(localValue: string): string | undefined {
  if (!localValue) return undefined;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function statusesOf(tab: StatusTabId): string[] {
  return STATUS_TABS.find((t) => t.id === tab)?.statuses ?? [];
}

export function toApiFilter(
  filters: AuctionsFilters,
): Omit<AuctionsFilter, 'page' | 'size' | 'sort' | 'expand'> {
  return {
    phrases: filters.phrases,
    statuses: statusesOf(filters.status),
    categories: filters.categories,
    subCategories: filters.subCategories,
    accessibility: filters.accessibility === 'any' ? undefined : filters.accessibility,
    direction: filters.direction === 'any' ? undefined : filters.direction,
    fromTime: localToIso(filters.fromTime),
    tillTime: localToIso(filters.tillTime),
  };
}
