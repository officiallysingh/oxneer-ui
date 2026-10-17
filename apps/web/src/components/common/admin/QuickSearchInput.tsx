'use client';

import { useRef } from 'react';
import { Search } from 'lucide-react';
import { cn, Input } from '@repo/ui';
import { useFocusShortcut } from '@/hooks/useFocusShortcut';
import { ShortcutHint } from './ShortcutHint';

interface QuickSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  /** A key (e.g. "/") that focuses the box from anywhere on the page; shown as a hint. */
  shortcutKey?: string;
  className?: string;
}

/** Instant (undebounced) search box for client-side filtering of loaded lists. */
export function QuickSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  shortcutKey,
  className,
}: QuickSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusShortcut(shortcutKey, () => inputRef.current?.focus());

  return (
    <div className={cn('relative min-w-0', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn('pl-9', shortcutKey && 'sm:pr-9')}
      />
      {shortcutKey && !value && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <ShortcutHint shortcutKey={shortcutKey} />
        </span>
      )}
    </div>
  );
}
