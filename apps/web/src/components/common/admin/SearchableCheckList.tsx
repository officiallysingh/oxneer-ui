'use client';

import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';

export interface CheckListOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableCheckListProps {
  options: CheckListOption[];
  value: string[];
  onChange: (value: string[]) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  autoFocus?: boolean;
  /** Id of the option list, for a trigger's `aria-controls`. */
  listId?: string;
}

/**
 * Search box + checkbox option list + "N selected · Clear all" footer.
 * The body of `MultiSelect`'s dropdown and of `FacetFilter`'s popover.
 */
export function SearchableCheckList({
  options,
  value,
  onChange,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  autoFocus = true,
  listId,
}: SearchableCheckListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel ?? '').toLowerCase().includes(q),
    );
  }, [options, search]);

  const toggle = (val: string) =>
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);

  return (
    <>
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            autoFocus={autoFocus}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/30 rounded border border-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      <div
        id={listId}
        className="max-h-60 overflow-y-auto py-1"
        role="listbox"
        aria-multiselectable
      >
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{emptyMessage}</p>
        ) : (
          filtered.map((opt) => {
            const checked = value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(opt.value)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${checked ? 'bg-primary/5' : ''}`}
              >
                <span
                  className={`shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary' : 'border-border'}`}
                >
                  {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-foreground truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="block font-mono text-xs text-muted-foreground truncate">
                      {opt.sublabel}
                    </span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>

      {value.length > 0 && (
        <div className="px-3 py-2 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{value.length} selected</span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-destructive hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </>
  );
}
