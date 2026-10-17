import type { UsersFilter } from '@repo/api';
import type { SegmentOption } from '@/components/common/admin/SegmentedControl';

/** Search limits enforced by GET /api/v1/users. */
export const MAX_PHRASES = 5;
export const MAX_PHRASE_LENGTH = 15;

export type TriState = 'any' | 'true' | 'false';

export const STATUS_FILTER_KEYS = [
  'enabled',
  'credentialsExpired',
  'emailIdVerified',
  'mobileNoVerified',
] as const;
export type StatusFilterKey = (typeof STATUS_FILTER_KEYS)[number];

export interface UsersFilters extends Record<StatusFilterKey, TriState> {
  phrases: string[];
  roles: string[];
  permissions: string[];
}

export const EMPTY_FILTERS: UsersFilters = {
  phrases: [],
  roles: [],
  permissions: [],
  enabled: 'any',
  credentialsExpired: 'any',
  emailIdVerified: 'any',
  mobileNoVerified: 'any',
};

interface StatusFilterDef {
  key: StatusFilterKey;
  label: string;
  options: readonly SegmentOption<TriState>[];
}

/**
 * The "More filters" boolean filters, in display order. `enabled` isn't here: the
 * Enabled / Disabled status tabs set it.
 */
export const STATUS_FILTERS: readonly StatusFilterDef[] = [
  {
    key: 'credentialsExpired',
    label: 'Credentials',
    options: [
      { value: 'any', label: 'Any' },
      { value: 'false', label: 'Valid' },
      { value: 'true', label: 'Expired' },
    ],
  },
  {
    key: 'emailIdVerified',
    label: 'Email verification',
    options: [
      { value: 'any', label: 'Any' },
      { value: 'true', label: 'Verified' },
      { value: 'false', label: 'Unverified' },
    ],
  },
  {
    key: 'mobileNoVerified',
    label: 'Mobile verification',
    options: [
      { value: 'any', label: 'Any' },
      { value: 'true', label: 'Verified' },
      { value: 'false', label: 'Unverified' },
    ],
  },
];

/** Human label of a set status filter, e.g. "Email verification: Unverified". */
export function statusFilterLabel(key: StatusFilterKey, value: TriState) {
  const def = STATUS_FILTERS.find((f) => f.key === key)!;
  return `${def.label}: ${def.options.find((o) => o.value === value)?.label ?? value}`;
}

export type StatusTabId = 'all' | 'enabled' | 'disabled' | 'password-expired' | 'email-unverified';

/** Status tabs above the list; each maps 1:1 to an API param preset. */
export const STATUS_TABS: readonly {
  id: StatusTabId;
  label: string;
  preset: Partial<Record<StatusFilterKey, TriState>>;
}[] = [
  { id: 'all', label: 'All', preset: {} },
  { id: 'enabled', label: 'Enabled', preset: { enabled: 'true' } },
  { id: 'disabled', label: 'Disabled', preset: { enabled: 'false' } },
  { id: 'password-expired', label: 'Password expired', preset: { credentialsExpired: 'true' } },
  { id: 'email-unverified', label: 'Email unverified', preset: { emailIdVerified: 'false' } },
];

function statusFiltersOf(preset: Partial<Record<StatusFilterKey, TriState>>) {
  return Object.fromEntries(STATUS_FILTER_KEYS.map((k) => [k, preset[k] ?? 'any'])) as Record<
    StatusFilterKey,
    TriState
  >;
}

/** The tab whose preset matches the current status filters exactly, if any. */
export function activeStatusTab(filters: UsersFilters): StatusTabId | null {
  const tab = STATUS_TABS.find((t) => {
    const expected = statusFiltersOf(t.preset);
    return STATUS_FILTER_KEYS.every((k) => filters[k] === expected[k]);
  });
  return tab?.id ?? null;
}

export function applyStatusTab(filters: UsersFilters, tabId: StatusTabId): UsersFilters {
  const tab = STATUS_TABS.find((t) => t.id === tabId)!;
  return { ...filters, ...statusFiltersOf(tab.preset) };
}

/** Set filters among those shown in "More filters" (excludes the tab-driven `enabled`). */
export function moreFiltersSet(filters: UsersFilters): StatusFilterKey[] {
  return STATUS_FILTERS.map((f) => f.key).filter((k) => filters[k] !== 'any');
}

export function hasAnyFilter(filters: UsersFilters) {
  return (
    filters.phrases.length > 0 ||
    filters.roles.length > 0 ||
    filters.permissions.length > 0 ||
    STATUS_FILTER_KEYS.some((k) => filters[k] !== 'any')
  );
}

function toTriState(v: string | null): TriState {
  return v === 'true' || v === 'false' ? v : 'any';
}

function triStateToBool(v: TriState): boolean | undefined {
  return v === 'any' ? undefined : v === 'true';
}

/** URL query → filters (same keys as the API, so links stay readable and stable). */
export function parseFilters(params: URLSearchParams): UsersFilters {
  return {
    phrases: params.getAll('phrases').slice(0, MAX_PHRASES),
    roles: params.getAll('roles'),
    permissions: params.getAll('permissions'),
    ...(Object.fromEntries(STATUS_FILTER_KEYS.map((k) => [k, toTriState(params.get(k))])) as Record<
      StatusFilterKey,
      TriState
    >),
  };
}

export function filtersToSearchParams(filters: UsersFilters): URLSearchParams {
  const params = new URLSearchParams();
  filters.phrases.forEach((p) => params.append('phrases', p));
  filters.roles.forEach((r) => params.append('roles', r));
  filters.permissions.forEach((p) => params.append('permissions', p));
  STATUS_FILTER_KEYS.forEach((k) => {
    if (filters[k] !== 'any') params.set(k, filters[k]);
  });
  return params;
}

export function toApiFilter(
  filters: UsersFilters,
): Omit<UsersFilter, 'page' | 'size' | 'sort' | 'expand'> {
  return {
    phrases: filters.phrases,
    roles: filters.roles,
    permissions: filters.permissions,
    enabled: triStateToBool(filters.enabled),
    credentialsExpired: triStateToBool(filters.credentialsExpired),
    emailIdVerified: triStateToBool(filters.emailIdVerified),
    mobileNoVerified: triStateToBool(filters.mobileNoVerified),
  };
}
