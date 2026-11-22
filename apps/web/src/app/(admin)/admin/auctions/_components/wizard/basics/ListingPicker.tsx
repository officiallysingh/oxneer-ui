'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, Loader2, Plus, Search } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent, cn } from '@repo/ui';
import { listingsApi, type ListingSummaryVM, type ListingVM } from '@repo/api';
import { parseApiError } from '@/lib/api-errors';
import { inputClass } from '../ui/wizard-ui';

/** One page of listings; matches the backend's default page size. */
const PAGE_SIZE = 16;

/** A listing summary plus the subcategory the auction is filed under. */
export type PickedListing = ListingSummaryVM & { subCategoryId?: string };

function toSummary(listing: ListingVM): PickedListing {
  return {
    id: listing.id,
    name: listing.name,
    description: listing.description,
    availableQuantity: listing.quantity?.available ?? undefined,
    categoryIcon: listing.category?.icon,
    subCategoryId:
      typeof listing.subCategory === 'string' ? listing.subCategory : listing.subCategory?.id,
  };
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase() || '?';
}

/** Search the catalogue and add listings to the unit. Clicking the field opens
 *  an autocomplete with the first page of listings; typing filters it on the
 *  server. */
export function ListingPicker({
  selectedIds,
  single,
  forward,
  onAdd,
}: {
  selectedIds: string[];
  /** A Single Unit holds one listing, so picking another replaces it. */
  single: boolean;
  forward: boolean;
  onAdd: (listing: PickedListing) => void;
}) {
  const listId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const request = useRef(0);

  // Fetch only while the menu is open: the first page on open, then on each search.
  useEffect(() => {
    if (!open) return;
    const id = ++request.current;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError(null);
        try {
          const page = await listingsApi.getListings({
            phrases: query.trim() ? [query.trim()] : [],
            // Forward auctions sell from stock, so only listings with stock left.
            ...(forward ? { available: true } : {}),
            page: 0,
            size: PAGE_SIZE,
          });
          if (id !== request.current) return;
          const content = page.content ?? [];
          setResults(content.map(toSummary));
          setTotal(page.page?.totalRecords ?? content.length);
          setActive(0);
        } catch (err) {
          if (id !== request.current) return;
          setResults([]);
          setTotal(0);
          setError(parseApiError(err).summary);
        } finally {
          if (id === request.current) setLoading(false);
        }
      },
      query ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [open, query, forward]);

  const noun = forward ? 'listing' : 'requirement';
  const optionId = (index: number) => `${listId}-option-${index}`;

  const pick = (listing: PickedListing) => {
    if (selectedIds.includes(listing.id)) return;
    onAdd(listing);
    // A Single Unit is done after one pick; a Bundle keeps the menu open to add more.
    if (single) setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (!results.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (index + step + results.length) % results.length);
    } else if (event.key === 'Enter') {
      if (!open) return;
      event.preventDefault();
      const listing = results[active];
      if (listing) pick(listing);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  // Keep the highlighted option in view while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && results[active] ? optionId(active) : undefined}
            aria-label={`Search ${noun}s`}
            value={query}
            placeholder={`Search ${noun}s by name`}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            className={cn(inputClass, 'h-10 bg-muted/30 pl-9 pr-9')}
          />
          {loading && (
            <Loader2
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden
            />
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] overflow-hidden p-0"
        // Keep focus in the search field so typing keeps filtering.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (event.target instanceof Node && anchorRef.current?.contains(event.target)) {
            event.preventDefault();
          }
        }}
      >
        <div
          id={listId}
          role="listbox"
          aria-label={`${noun}s in your catalogue`}
          aria-busy={loading}
          className="max-h-80 overflow-y-auto overscroll-contain py-1"
        >
          {loading && results.length === 0 ? (
            [0, 1, 2, 3].map((key) => (
              <div key={key} className="flex items-center gap-3 px-3 py-2">
                <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                <span className="flex-1 space-y-1.5">
                  <span className="block h-3 w-1/3 animate-pulse rounded bg-muted" />
                  <span className="block h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                </span>
              </div>
            ))
          ) : error ? (
            <p role="alert" className="px-3 py-4 text-xs text-destructive">
              {error}
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              {query.trim()
                ? `No ${noun} matches “${query.trim()}”.`
                : forward
                  ? 'No listings with stock available yet.'
                  : 'No listings in your catalogue yet.'}
            </p>
          ) : (
            results.map((listing, index) => {
              const added = selectedIds.includes(listing.id);
              const meta = [
                forward && listing.availableQuantity !== undefined
                  ? `${listing.availableQuantity} available`
                  : '',
                listing.description ?? '',
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <div
                  key={listing.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={added}
                  aria-disabled={added || undefined}
                  // Keep focus in the search field while picking.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(listing)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-3 py-2',
                    index === active && 'bg-muted',
                    added && 'cursor-default bg-primary/5',
                  )}
                >
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
                  >
                    {initials(listing.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {listing.name}
                    </span>
                    {meta && (
                      <span className="block truncate text-xs text-muted-foreground">{meta}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      added ? 'bg-success/10 text-success' : 'text-primary',
                    )}
                  >
                    {added ? (
                      <>
                        <Check className="h-3 w-3" aria-hidden />
                        {single ? 'Selected' : 'Added'}
                      </>
                    ) : single ? (
                      'Select'
                    ) : (
                      <>
                        <Plus className="h-3 w-3" aria-hidden />
                        Add
                      </>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {!error && results.length > 0 && (
          <p className="border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            Showing {results.length} of {total} {total === 1 ? noun : `${noun}s`}.
            {total > results.length ? ' Type a name to narrow the list.' : ''}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
