'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { SearchableCheckList, type CheckListOption } from './SearchableCheckList';

export type MultiSelectOption = CheckListOption;

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  error?: boolean;
  /** Highlights the trigger, e.g. to mark an unsaved change. */
  changed?: boolean;
  id?: string;
  /** Id of the visible label element. */
  ariaLabelledBy?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  error,
  changed,
  id,
  ariaLabelledBy,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.filter((o) => value.includes(o.value));

  const remove = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== val));
  };

  const borderClass = open
    ? 'border-primary ring-2 ring-primary/20'
    : error
      ? 'border-destructive'
      : changed
        ? 'border-primary'
        : 'border-input hover:border-primary/50';

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        id={id}
        aria-labelledby={ariaLabelledBy}
        role="combobox"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={`min-h-10 w-full rounded-md border px-3 py-1.5 flex items-center gap-1.5 flex-wrap cursor-pointer transition-colors bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${borderClass}`}
      >
        {selected.length === 0 ? (
          <span className="text-sm text-muted-foreground flex-1">{placeholder}</span>
        ) : (
          selected.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-xs font-medium rounded-full px-2 py-0.5"
            >
              {opt.label}
              <button
                type="button"
                onClick={(e) => remove(opt.value, e)}
                aria-label={`Remove ${opt.label}`}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
          <SearchableCheckList
            listId={listId}
            options={options}
            value={value}
            onChange={onChange}
            searchPlaceholder={searchPlaceholder}
            emptyMessage={emptyMessage}
          />
        </div>
      )}
    </div>
  );
}
