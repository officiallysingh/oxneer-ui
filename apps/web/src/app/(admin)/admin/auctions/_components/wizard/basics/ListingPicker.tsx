'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { Button, cn } from '@repo/ui';
import { listingsApi, type ListingSummaryVM, type ListingVM } from '@repo/api';
import { parseApiError } from '@/lib/api-errors';
import { inputClass } from '../ui/wizard-ui';

/** How many listings one search shows. */
const PAGE_SIZE = 10;

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

/** Search the catalogue and add listings to the unit. Shows the first ten
 *  matches in a short scrolling list, like the invite block. */
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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  useEffect(() => {
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
  }, [query, forward]);

  const noun = forward ? 'listing' : 'requirement';

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${noun}s by name`}
          aria-label={`Search ${noun}s`}
          className={cn(inputClass, 'h-10 bg-muted/30 pl-9')}
        />
      </div>

      <div
        role="list"
        aria-label={`${noun}s in your catalogue`}
        aria-busy={loading}
        className="max-h-[184px] overflow-y-auto rounded-md border border-border"
      >
        {loading && results.length === 0 ? (
          [0, 1, 2].map((key) => (
            <div
              key={key}
              className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0"
            >
              <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
              <span className="flex-1 space-y-1.5">
                <span className="block h-3 w-1/3 animate-pulse rounded bg-muted" />
                <span className="block h-2.5 w-1/2 animate-pulse rounded bg-muted" />
              </span>
              <span className="h-8 w-16 animate-pulse rounded-md bg-muted" />
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
          results.map((listing) => {
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
                role="listitem"
                className={cn(
                  'flex items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0',
                  added && 'bg-primary/5',
                )}
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={added}
                  onClick={() => onAdd(listing)}
                  aria-label={`${added ? 'Added' : single ? 'Select' : 'Add'} ${listing.name}`}
                  className="h-8 min-w-[72px] gap-1.5 px-3 text-xs"
                >
                  {added ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      {single ? 'Selected' : 'Added'}
                    </>
                  ) : single ? (
                    'Select'
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Add
                    </>
                  )}
                </Button>
              </div>
            );
          })
        )}
      </div>

      {!error && results.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Showing {results.length} of {total} {total === 1 ? noun : `${noun}s`}.{' '}
          {total > results.length
            ? 'Type a name to find another.'
            : query.trim()
              ? 'Clear the search to see the rest.'
              : ''}
        </p>
      )}
    </div>
  );
}
