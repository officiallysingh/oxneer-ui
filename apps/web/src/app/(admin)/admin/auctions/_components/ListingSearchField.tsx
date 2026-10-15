'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  listingsApi,
  masterApi,
  blobsApi,
  ListingSummaryVM,
  ListingVM,
  ListingBlobRef,
  CategoryVM,
} from '@repo/api';
import { Search, X, Loader2, Eye, Package, Tag } from 'lucide-react';
import { Input, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Label } from '@repo/ui';
import Select from 'react-select';
import type { MultiValue } from 'react-select';
import {
  GroupedSubcategorySelect,
  makeReactSelectStyles,
} from '@/components/common/admin/GroupedSubcategorySelect';
import { SelectOption } from './AuctionShared';

interface Props {
  /** Currently selected listing ID (ignored in addMode) */
  value?: string;
  /** Display name for the selected listing (ignored in addMode) */
  displayName?: string;
  onSelect: (id: string, name: string, summary: ListingSummaryVM, quantity: string) => void;
  onClear?: () => void;
  /**
   * addMode=true: always shows the search UI (used for multi-select).
   * addMode=false (default): shows a chip when a value is selected.
   */
  addMode?: boolean;
}

// ── Add-listing modal ─────────────────────────────────────────────────────────

function getImageBlobs(blobs: ListingBlobRef[]) {
  return blobs.filter((b) => (b.mediaType ?? '').startsWith('image/'));
}

function AddListingModal({
  item,
  onConfirm,
  onClose,
}: {
  item: ListingSummaryVM;
  onConfirm: (quantity: string) => void;
  onClose: () => void;
}) {
  const max = item.availableQuantity ?? undefined;
  const [qty, setQty] = useState('1');
  const [detail, setDetail] = useState<ListingVM | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [activeImg, setActiveImg] = useState<string>('');

  useEffect(() => {
    listingsApi
      .getListingById(item.id)
      .then((d) => {
        setDetail(d);
        const images = getImageBlobs(d.blobs ?? []);
        const thumb = images.find((b) => b.metadata?.['thumbnail'] === 'true') ?? images[0];
        setActiveImg(thumb?.id ?? '');
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [item.id]);

  const handleQtyChange = (v: string) => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 1) {
      setQty('1');
    } else if (max !== undefined && n > max) {
      setQty(String(max));
    } else {
      setQty(String(n));
    }
  };

  const images = getImageBlobs(detail?.blobs ?? []);
  const category = typeof detail?.category === 'object' ? detail.category?.name : '';
  const subCategory =
    typeof detail?.subCategory === 'object' ? (detail.subCategory as { name?: string })?.name : '';
  const qty_ = detail?.quantity;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add Listing
            <a
              href={`/admin/listings/${item.id}/view`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-normal text-primary hover:underline ml-1"
            >
              <Eye className="h-3.5 w-3.5" />
              Full view
            </a>
          </DialogTitle>
        </DialogHeader>

        {loadingDetail ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading details...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Media + info side-by-side on md+ */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Image gallery */}
              <div className="sm:w-56 shrink-0 space-y-2">
                {/* Main image */}
                <div className="w-full aspect-square rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center">
                  {activeImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={blobsApi.getDownloadUrl(activeImg)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                {/* Thumbnails strip */}
                {images.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {images.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setActiveImg(b.id)}
                        className={`w-12 h-12 rounded-lg border-2 overflow-hidden shrink-0 transition-colors ${
                          activeImg === b.id
                            ? 'border-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={blobsApi.getDownloadUrl(b.id)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground text-base leading-snug">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Category / subcategory */}
                {(category || subCategory) && (
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    {category && (
                      <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                        {category}
                      </span>
                    )}
                    {subCategory && (
                      <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                        {subCategory}
                      </span>
                    )}
                  </div>
                )}

                {/* Status */}
                {detail?.status && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        detail.available
                          ? 'bg-success/15 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {detail.status}
                    </span>
                  </div>
                )}

                {/* Quantity breakdown */}
                {qty_ && (
                  <div className="rounded-lg border border-border divide-y divide-border/60 text-sm">
                    {[
                      { label: 'Available', value: qty_.available },
                      { label: 'Allocated', value: qty_.allocated },
                      { label: 'In Auction', value: qty_.inAuction },
                      { label: 'Sold', value: qty_.sold },
                    ]
                      .filter((r) => typeof r.value === 'number')
                      .map((r) => (
                        <div key={r.label} className="flex justify-between px-3 py-1.5">
                          <span className="text-muted-foreground">{r.label}</span>
                          <span className="font-medium text-foreground">{r.value}</span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Tags */}
                {detail?.tags && detail.tags.length > 0 && (
                  <div className="flex items-start gap-1.5 flex-wrap">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    {detail.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full bg-muted text-xs text-foreground border border-border"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quantity input */}
            <div className="border-t border-border pt-4 space-y-1.5">
              <label className="text-sm font-medium">
                Quantity
                {max !== undefined && (
                  <span className="text-muted-foreground font-normal"> (max {max})</span>
                )}
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <Input
                type="number"
                min={1}
                max={max}
                value={qty}
                onChange={(e) => handleQtyChange(e.target.value)}
                className="text-sm max-w-xs"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(qty)}
            disabled={
              loadingDetail ||
              parseInt(qty, 10) < 1 ||
              (max !== undefined && parseInt(qty, 10) > max)
            }
          >
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── ListingSearchField ────────────────────────────────────────────────────────

export function ListingSearchField({
  value,
  displayName,
  onSelect,
  onClear,
  addMode = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ListingSummaryVM[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<ListingSummaryVM | null>(null);

  // Filters
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<SelectOption[]>([]);
  const [selectedSubCats, setSelectedSubCats] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load categories (with subcategories) once
  useEffect(() => {
    masterApi
      .getCategories(true)
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = useCallback((q: string, cats: string[], subCats: string[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await listingsApi.getListingsSummary({
          phrases: q.trim() ? [q.trim()] : [],
          categories: cats,
          subCategories: subCats,
        });
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setOpen(true);
    runSearch(
      q,
      selectedCategories.map((c) => c.value),
      selectedSubCats,
    );
  };

  const handleCategoriesChange = (vals: SelectOption[]) => {
    setSelectedCategories(vals);
    const catIds = new Set(vals.map((v) => v.value));
    const newSubCats = selectedSubCats.filter((id) => {
      const ownerCat = categories.find((c) => c.subCategories?.some((sc) => sc.id === id));
      return ownerCat && catIds.has(ownerCat.id);
    });
    setSelectedSubCats(newSubCats);
    runSearch(
      query,
      vals.map((v) => v.value),
      newSubCats,
    );
  };

  const handleSubCatsChange = (ids: string[]) => {
    setSelectedSubCats(ids);
    runSearch(
      query,
      selectedCategories.map((c) => c.value),
      ids,
    );
  };

  const handleFocus = () => {
    setOpen(true);
    if (!results.length) {
      runSearch(
        query,
        selectedCategories.map((c) => c.value),
        selectedSubCats,
      );
    }
  };

  const handleRowClick = (item: ListingSummaryVM) => {
    setOpen(false);
    setPending(item);
  };

  const handleConfirm = (quantity: string) => {
    if (!pending) return;
    onSelect(pending.id, pending.name, pending, quantity);
    setPending(null);
    setQuery('');
    if (!addMode) setOpen(false);
  };

  // ── Selected chip (single-select mode only) ───────────────────────────────────
  if (!addMode && value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary/40 bg-primary/5">
        <Package className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{displayName || value}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{value}</p>
        </div>
        <a
          href={`/admin/listings/${value}/view`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
          title="View listing"
        >
          <Eye className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // ── Search UI ─────────────────────────────────────────────────────────────────
  return (
    <>
      {pending && (
        <AddListingModal
          item={pending}
          onConfirm={handleConfirm}
          onClose={() => setPending(null)}
        />
      )}

      <div ref={containerRef} className="space-y-2">
        {/* Filters */}
        <div className="flex gap-2 flex-col sm:flex-row">
          {/* Categories */}
          <div className="flex-1 space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Categories</Label>
            <Select<SelectOption, true>
              isMulti
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={selectedCategories}
              onChange={(vals: MultiValue<SelectOption>) => handleCategoriesChange([...vals])}
              placeholder="All categories"
              styles={makeReactSelectStyles<true>() as never}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
            />
          </div>
          {/* Sub-categories */}
          <div className="flex-1 space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Sub-categories</Label>
            <GroupedSubcategorySelect
              isMulti
              categories={
                selectedCategories.length > 0
                  ? categories.filter((c) => selectedCategories.some((s) => s.value === c.id))
                  : categories
              }
              value={selectedSubCats}
              onChange={handleSubCatsChange}
              placeholder="All sub-categories"
            />
          </div>
        </div>

        {/* Search input */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Listing to be added</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={handleFocus}
              placeholder="Search listing by name..."
              className="pl-8 text-sm"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
            )}
          </div>
        </div>

        {/* Results table */}
        {open && (
          <div className="rounded-lg border border-border bg-card shadow-lg overflow-hidden">
            {searching && !results.length ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            ) : results.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground">No listings found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-10" />
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                        Description
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">
                        Avail.
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {results.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => handleRowClick(item)}
                      >
                        {/* Thumbnail */}
                        <td className="px-3 py-2">
                          {item.thumbnailId ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={blobsApi.getDownloadUrl(item.thumbnailId)}
                              alt=""
                              className="w-8 h-8 rounded object-cover border border-border"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </td>

                        {/* Name */}
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground truncate max-w-[180px]">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {item.id.slice(-8)}
                          </p>
                        </td>

                        {/* Description */}
                        <td className="px-3 py-2 hidden sm:table-cell">
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {item.description ?? '—'}
                          </p>
                        </td>

                        {/* Available qty */}
                        <td className="px-3 py-2 text-right">
                          <span className="text-xs font-medium text-foreground">
                            {item.availableQuantity ?? '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
