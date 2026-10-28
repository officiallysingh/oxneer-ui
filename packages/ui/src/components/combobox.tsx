'use client';

import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

import { cn } from '../lib/utils';
import { Popover, PopoverAnchor, PopoverContent } from './popover';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Second line under the label. */
  description?: string;
  disabled?: boolean;
}

const controlClass =
  'flex min-h-9 w-full items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60';

function OptionList({
  id,
  label,
  options,
  activeIndex,
  selected,
  onPick,
  onHover,
  empty,
}: {
  id: string;
  label?: string;
  options: ComboboxOption[];
  activeIndex: number;
  selected?: (option: ComboboxOption) => boolean;
  onPick: (option: ComboboxOption) => void;
  onHover: (index: number) => void;
  empty?: React.ReactNode;
}) {
  return (
    <div id={id} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto py-1">
      {options.map((option, index) => {
        const isSelected = selected?.(option) ?? false;
        return (
          <div
            key={option.value}
            id={`${id}-${index}`}
            role="option"
            aria-selected={isSelected}
            aria-disabled={option.disabled || undefined}
            // Keep focus in the control while picking.
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHover(index)}
            onClick={() => !option.disabled && onPick(option)}
            className={cn(
              'flex cursor-pointer items-start gap-2 px-3 py-2 text-left',
              index === activeIndex && 'bg-muted',
              isSelected && 'bg-primary/10',
              option.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{option.label}</span>
              {option.description && (
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                  {option.description}
                </span>
              )}
            </span>
            {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />}
          </div>
        );
      })}
      {options.length === 0 && empty && (
        <p className="px-3 py-2.5 text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function nextEnabled(options: ComboboxOption[], from: number, step: 1 | -1): number {
  if (!options.length) return -1;
  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (from + step * offset + options.length * 2) % options.length;
    if (!options[index]!.disabled) return index;
  }
  return -1;
}

export interface ComboboxProps {
  id?: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** A single-choice select whose options can carry a description line. */
export function Combobox({
  id,
  value,
  options,
  onChange,
  placeholder = 'Choose…',
  disabled,
  className,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const autoId = React.useId();
  const listId = `${id ?? autoId}-list`;
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const current = options.find((option) => option.value === value);

  const openMenu = () => {
    setOpen(true);
    setActive(Math.max(0, options.indexOf(current as ComboboxOption)));
  };
  const pick = (option: ComboboxOption) => {
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openMenu();
      else setActive((index) => nextEnabled(options, index, event.key === 'ArrowDown' ? 1 : -1));
    } else if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      const option = options[active];
      if (option && !option.disabled) pick(option);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={ariaLabel}
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={onKeyDown}
          className={cn(controlClass, 'justify-between text-left outline-none', className)}
        >
          <span className={cn('truncate', !current && 'text-muted-foreground')}>
            {current?.label ?? placeholder}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 opacity-60 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <OptionList
          id={listId}
          label={ariaLabel}
          options={options}
          activeIndex={active}
          selected={(option) => option.value === value}
          onPick={pick}
          onHover={setActive}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface ChipComboboxProps {
  id?: string;
  values: string[];
  /** Suggestions shown in the menu; values already chosen are left out. */
  options: ComboboxOption[];
  onChange: (values: string[]) => void;
  /** Turns typed text into a new option, or null when it isn't valid. */
  create?: (query: string) => ComboboxOption | null;
  /** Chip text for a chosen value. */
  chipLabel?: (value: string) => string;
  placeholder?: string;
  /** Shown when nothing matches. */
  emptyText?: (query: string) => React.ReactNode;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** A multi-select that shows each choice as a removable chip. Type to filter or
 *  create, Enter picks the first suggestion, Backspace removes the last chip. */
export function ChipCombobox({
  id,
  values,
  options,
  onChange,
  create,
  chipLabel = (value) => value,
  placeholder = 'Pick or type',
  emptyText,
  disabled,
  className,
  'aria-label': ariaLabel,
}: ChipComboboxProps) {
  const autoId = React.useId();
  const listId = `${id ?? autoId}-list`;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);

  const trimmed = query.trim().toLowerCase();
  const listed = options.filter(
    (option) =>
      !values.includes(option.value) &&
      (!trimmed || option.label.toLowerCase().includes(trimmed) || option.value.includes(trimmed)),
  );
  const created = trimmed && create ? create(query.trim()) : null;
  const visible =
    created && !values.includes(created.value) && !options.some((o) => o.value === created.value)
      ? [created, ...listed]
      : listed;

  const add = (option: ComboboxOption) => {
    if (values.includes(option.value)) return;
    onChange([...values, option.value]);
    setQuery('');
    setActive(0);
  };
  const remove = (value: string) => onChange(values.filter((item) => item !== value));

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = visible[active] ?? visible[0];
      if (option && !option.disabled) add(option);
    } else if (event.key === 'Backspace' && !query && values.length) {
      remove(values[values.length - 1]!);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => nextEnabled(visible, index, event.key === 'ArrowDown' ? 1 : -1));
    }
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn(controlClass, 'flex-wrap', className)}>
          {values.map((value) => {
            const label = chipLabel(value);
            return (
              <span
                key={value}
                className="inline-flex h-6 items-center gap-1 rounded bg-primary/15 pl-2 pr-0.5 text-xs font-medium text-foreground"
              >
                {label}
                <button
                  type="button"
                  aria-label={`Remove ${label}`}
                  disabled={disabled}
                  onClick={() => remove(value)}
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            );
          })}
          <input
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-label={ariaLabel}
            aria-activedescendant={open && visible[active] ? `${listId}-${active}` : undefined}
            value={query}
            disabled={disabled}
            placeholder={values.length ? '' : placeholder}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            className="h-7 min-w-[64px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
          {values.length > 0 && (
            <button
              type="button"
              aria-label="Clear all"
              disabled={disabled}
              onClick={() => onChange([])}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          // Clicks inside the control (chips, input) shouldn't close the menu.
          const anchor = document.getElementById(id ?? '')?.parentElement;
          if (anchor && event.target instanceof Node && anchor.contains(event.target)) {
            event.preventDefault();
          }
        }}
      >
        <OptionList
          id={listId}
          label={ariaLabel}
          options={visible}
          activeIndex={active}
          onPick={add}
          onHover={setActive}
          empty={emptyText?.(query)}
        />
      </PopoverContent>
    </Popover>
  );
}
