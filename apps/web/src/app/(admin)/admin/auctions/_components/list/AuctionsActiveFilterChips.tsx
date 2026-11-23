'use client';

import { RemovableChip } from '@/components/common/admin/RemovableChip';
import type { CheckListOption } from '@/components/common/admin/SearchableCheckList';
import {
  accessLabel,
  directionLabel,
  scheduleRangeLabel,
  type AuctionsFilters,
} from '../../_lib/auctions-filters';

interface AuctionsActiveFilterChipsProps {
  filters: AuctionsFilters;
  onChange: (patch: Partial<AuctionsFilters>) => void;
  onCategoriesChange: (ids: string[]) => void;
  onClearAll: () => void;
  categoryOptions: CheckListOption[];
  subCategoryOptions: CheckListOption[];
}

interface Chip {
  key: string;
  label: string;
  remove: () => void;
}

const labelOf = (options: CheckListOption[], id: string) =>
  options.find((o) => o.value === id)?.label ?? id;

/** "Filtered by:" row for every filter except search terms (shown in the input)
 *  and the status tab (shown as the selected tab). */
export function AuctionsActiveFilterChips({
  filters,
  onChange,
  onCategoriesChange,
  onClearAll,
  categoryOptions,
  subCategoryOptions,
}: AuctionsActiveFilterChipsProps) {
  const chips: Chip[] = [
    ...filters.categories.map((id) => ({
      key: `cat:${id}`,
      label: `Category: ${labelOf(categoryOptions, id)}`,
      remove: () => onCategoriesChange(filters.categories.filter((c) => c !== id)),
    })),
    ...filters.subCategories.map((id) => ({
      key: `sub:${id}`,
      label: `Sub-category: ${labelOf(subCategoryOptions, id)}`,
      remove: () => onChange({ subCategories: filters.subCategories.filter((s) => s !== id) }),
    })),
  ];
  if (filters.accessibility !== 'any') {
    chips.push({
      key: 'access',
      label: `Access: ${accessLabel(filters.accessibility)}`,
      remove: () => onChange({ accessibility: 'any' }),
    });
  }
  if (filters.direction !== 'any') {
    chips.push({
      key: 'direction',
      label: `Direction: ${directionLabel(filters.direction)}`,
      remove: () => onChange({ direction: 'any' }),
    });
  }
  const range = scheduleRangeLabel(filters.fromTime, filters.tillTime);
  if (range) {
    chips.push({
      key: 'schedule',
      label: range,
      remove: () => onChange({ fromTime: '', tillTime: '' }),
    });
  }

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
