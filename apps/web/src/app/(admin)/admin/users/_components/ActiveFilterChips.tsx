'use client';

import { RemovableChip } from '@/components/common/admin/RemovableChip';
import type { CheckListOption } from '@/components/common/admin/SearchableCheckList';
import { moreFiltersSet, statusFilterLabel, type UsersFilters } from '../_lib/users-filters';

interface ActiveFilterChipsProps {
  filters: UsersFilters;
  onChange: (patch: Partial<UsersFilters>) => void;
  onClearAll: () => void;
  roleOptions: CheckListOption[];
  permissionOptions: CheckListOption[];
}

interface Chip {
  key: string;
  label: string;
  remove: () => void;
}

const labelOf = (options: CheckListOption[], id: string) =>
  options.find((o) => o.value === id)?.label ?? id;

/** "Filtered by:" row for role, permission and status filters (search terms show in the input). */
export function ActiveFilterChips({
  filters,
  onChange,
  onClearAll,
  roleOptions,
  permissionOptions,
}: ActiveFilterChipsProps) {
  const chips: Chip[] = [
    ...filters.roles.map((id) => ({
      key: `role:${id}`,
      label: `Role: ${labelOf(roleOptions, id)}`,
      remove: () => onChange({ roles: filters.roles.filter((r) => r !== id) }),
    })),
    ...filters.permissions.map((id) => ({
      key: `perm:${id}`,
      label: `Permission: ${labelOf(permissionOptions, id)}`,
      remove: () => onChange({ permissions: filters.permissions.filter((p) => p !== id) }),
    })),
    ...moreFiltersSet(filters).map((k) => ({
      key: k,
      label: statusFilterLabel(k, filters[k]),
      remove: () => onChange({ [k]: 'any' }),
    })),
  ];

  if (chips.length === 0 && filters.phrases.length === 0) return null;

  return (
    <div className="-mt-1.5 flex flex-wrap items-center gap-1.5">
      {chips.length > 0 && (
        <span className="mr-0.5 text-xs text-muted-foreground">Filtered by:</span>
      )}
      {chips.map((c) => (
        <RemovableChip
          key={c.key}
          label={c.label}
          onRemove={c.remove}
          removeLabel={`Remove filter ${c.label}`}
          variant="primary"
        />
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-[13px] font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
