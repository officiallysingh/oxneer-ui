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
} from '@repo/ui';
import { CountBadge } from '@/components/common/admin/FacetFilter';
import {
  SearchableCheckList,
  type CheckListOption,
} from '@/components/common/admin/SearchableCheckList';
import { moreFiltersSet, type UsersFilters } from '../_lib/users-filters';
import { MoreFiltersFields } from './MoreFiltersPopover';

interface MobileFiltersSheetProps {
  filters: UsersFilters;
  onChange: (patch: Partial<UsersFilters>) => void;
  roleOptions: CheckListOption[];
  permissionOptions: CheckListOption[];
}

/** Phone layout: one Filters button (with a count) opening every filter in a bottom sheet. */
export function MobileFiltersSheet({
  filters,
  onChange,
  roleOptions,
  permissionOptions,
}: MobileFiltersSheetProps) {
  const active = filters.roles.length + filters.permissions.length + moreFiltersSet(filters).length;

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
          <FilterGroup title="Roles">
            <SearchableCheckList
              options={roleOptions}
              value={filters.roles}
              onChange={(roles) => onChange({ roles })}
              searchPlaceholder="Search roles..."
              emptyMessage="No roles found"
              autoFocus={false}
            />
          </FilterGroup>
          <FilterGroup title="Permissions">
            <SearchableCheckList
              options={permissionOptions}
              value={filters.permissions}
              onChange={(permissions) => onChange({ permissions })}
              searchPlaceholder="Search permissions..."
              emptyMessage="No permissions found"
              autoFocus={false}
            />
          </FilterGroup>
          <MoreFiltersFields filters={filters} onChange={onChange} />
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
