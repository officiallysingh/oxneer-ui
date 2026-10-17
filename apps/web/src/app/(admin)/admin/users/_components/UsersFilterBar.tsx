'use client';

import { FacetFilter } from '@/components/common/admin/FacetFilter';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import type { CheckListOption } from '@/components/common/admin/SearchableCheckList';
import { MAX_PHRASE_LENGTH, MAX_PHRASES, type UsersFilters } from '../_lib/users-filters';
import { MobileFiltersSheet } from './MobileFiltersSheet';
import { MoreFiltersPopover } from './MoreFiltersPopover';

interface UsersFilterBarProps {
  filters: UsersFilters;
  onChange: (patch: Partial<UsersFilters>) => void;
  roleOptions: CheckListOption[];
  permissionOptions: CheckListOption[];
}

/**
 * Search terms + Roles / Permissions facets + "More filters"; on phones the facets
 * collapse into one Filters sheet. All apply instantly; "/" focuses the search.
 */
export function UsersFilterBar({
  filters,
  onChange,
  roleOptions,
  permissionOptions,
}: UsersFilterBarProps) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <div className="min-w-0 flex-[1_1_200px] md:flex-[1_1_360px]">
        <PhrasesInput
          value={filters.phrases}
          onChange={(phrases) => onChange({ phrases })}
          placeholder="Search username, name, email or phone — Enter to add"
          ariaLabel="Search username, name, email or phone"
          maxPhrases={MAX_PHRASES}
          maxLength={MAX_PHRASE_LENGTH}
          shortcutKey="/"
          showSearchIcon
        />
      </div>
      <div className="md:hidden">
        <MobileFiltersSheet
          filters={filters}
          onChange={onChange}
          roleOptions={roleOptions}
          permissionOptions={permissionOptions}
        />
      </div>
      <div className="hidden flex-wrap gap-2 md:flex">
        <FacetFilter
          label="Roles"
          options={roleOptions}
          value={filters.roles}
          onChange={(roles) => onChange({ roles })}
          emptyMessage="No roles found"
        />
        <FacetFilter
          label="Permissions"
          options={permissionOptions}
          value={filters.permissions}
          onChange={(permissions) => onChange({ permissions })}
          emptyMessage="No permissions found"
        />
        <MoreFiltersPopover filters={filters} onChange={onChange} />
      </div>
    </div>
  );
}
