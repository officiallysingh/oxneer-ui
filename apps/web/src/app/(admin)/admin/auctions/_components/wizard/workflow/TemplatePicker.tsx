'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@repo/ui';
import { metadataApi, type ManagedTypeListItemFull, type ManagedTypeVM } from '@repo/api';
import { PropertyFormPreview } from '../../../../metadata/_components/PropertyFormPreview';

/** Search the organisation's form templates, pick one and preview it. */
export function TemplatePicker({
  typeId,
  onPick,
  previewLabel,
}: {
  typeId: string;
  onPick: (template: { id: string; name: string; description?: string }) => void;
  previewLabel: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ManagedTypeListItemFull[]>([]);
  const [searching, setSearching] = useState(true);
  const [detail, setDetail] = useState<ManagedTypeVM | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(
      async () => {
        setSearching(true);
        try {
          const found = await metadataApi.searchManagedTypeListItems({
            phrases: query.trim() ? [query.trim()] : [],
            type: 'CUSTOM_FORM',
          });
          setResults(found);
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      },
      query ? 300 : 0,
    );
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  useEffect(() => {
    if (!typeId) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoadingDetail(true);
    metadataApi
      .getManagedTypeById(typeId)
      .then((found) => {
        if (active) setDetail(found);
      })
      .catch(() => {
        if (active) setDetail(null);
      })
      .finally(() => {
        if (active) setLoadingDetail(false);
      });
    return () => {
      active = false;
    };
  }, [typeId]);

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          aria-label="Search form templates"
          placeholder="Search form templates by name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        {searching && (
          <Loader2
            className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Form templates"
        className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border"
      >
        {results.map((template) => {
          const selected = template.id === typeId;
          return (
            <button
              key={template.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() =>
                onPick({
                  id: template.id,
                  name: template.name,
                  description: template.description,
                })
              }
              className={cn(
                'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                selected
                  ? 'bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]'
                  : 'hover:bg-muted/40',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
                  selected ? 'border-primary' : 'border-muted-foreground/50',
                )}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-foreground">{template.name}</span>
                {template.description && (
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {template.description}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {!searching && results.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            {query ? `No form matches “${query}”.` : 'No form templates yet.'}
          </p>
        )}
      </div>

      {typeId && (
        <div
          aria-label="Preview of the form"
          className="rounded-md border border-dashed border-input bg-muted/20 p-3"
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {previewLabel}
          </p>
          {loadingDetail ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading the form…
            </div>
          ) : (
            <PropertyFormPreview properties={detail?.properties ?? []} />
          )}
        </div>
      )}
    </div>
  );
}
