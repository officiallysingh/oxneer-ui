'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  listingsApi,
  masterApi,
  blobsApi,
  ListingVM,
  ListingBlobRef,
  ListingCategoryRef,
  CategoryVM,
} from '@repo/api';
import {
  Loader2,
  Trash2,
  RefreshCw,
  Plus,
  Pencil,
  Search,
  X,
  Eye,
  LayoutGrid,
  List,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Label } from '@repo/ui';
import Select from 'react-select';
import type { MultiValue } from 'react-select';
import { GroupedSubcategorySelect } from '@/components/common/admin/GroupedSubcategorySelect';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import { ListingThumbnail } from '@/components/common/admin/ListingThumbnail';
import { ICON_REGISTRY } from '@/components/common/iconRegistry';
import { ListingsStatsSummary } from './_components/ListingsStatsSummary';
import {
  MediaCountBadge,
  MediaModal,
  ListingCardGrid,
  type MediaModalState,
  classifyBlob,
} from './_components/ListingMediaComponents';

interface SelectOption {
  label: string;
  value: string;
}

function CategoryCell({ icon, name }: { icon?: string; name: string }) {
  const IconComp = icon ? ICON_REGISTRY[icon] : null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-foreground">
      {IconComp && <IconComp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      {name}
    </div>
  );
}

const reactSelectStyles = {
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    backgroundColor: 'hsl(var(--background))',
    borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.2)' : 'none',
    borderRadius: '0.375rem',
    minHeight: '2.25rem',
    fontSize: '0.875rem',
    '&:hover': { borderColor: 'hsl(var(--primary) / 0.5)' },
  }),
  option: (base: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'hsl(var(--primary))'
      : state.isFocused
        ? 'hsl(var(--muted))'
        : 'hsl(var(--background))',
    color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
    fontSize: '0.875rem',
  }),
  multiValue: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'hsl(var(--secondary))',
    borderRadius: '0.25rem',
  }),
  multiValueLabel: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--secondary-foreground))',
    fontSize: '0.75rem',
  }),
  multiValueRemove: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    '&:hover': { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 4px 16px hsl(var(--foreground)/0.08)',
    zIndex: 50,
  }),
  input: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--foreground))',
    fontSize: '0.875rem',
  }),
  placeholder: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    fontSize: '0.875rem',
  }),
  singleValue: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--foreground))',
  }),
};

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<ListingVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [mediaModal, setMediaModal] = useState<MediaModalState | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const PAGE_SIZE = 16;
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filter state — initialised from URL params
  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));
  const [availableFilter, setAvailableFilter] = useState<'all' | 'true' | 'false'>(
    () => (searchParams.get('available') as 'all' | 'true' | 'false') ?? 'all',
  );
  const [selectedCategories, setSelectedCategories] = useState<SelectOption[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<CategoryVM[]>([]);

  useEffect(() => {
    const catIds = searchParams.getAll('categories');
    const subCatIds = searchParams.getAll('subCategories');
    masterApi
      .getCategories(true)
      .then((cats) => {
        setCategories(cats);
        if (catIds.length) {
          setSelectedCategories(
            cats.filter((c) => catIds.includes(c.id)).map((c) => ({ label: c.name, value: c.id })),
          );
        }
        if (subCatIds.length) {
          const allSubs = cats.flatMap((c) => c.subCategories ?? []);
          setSelectedSubCategories(
            allSubs
              .filter((s) => subCatIds.includes(s.id))
              .map((s) => ({ label: s.name, value: s.id })),
          );
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const categoryOptions: SelectOption[] = categories.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  const fetchListings = async (opts?: {
    phrases?: string[];
    available?: boolean;
    categories?: string[];
    subCategories?: string[];
    page?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const page = opts?.page ?? 0;
      const result = await listingsApi.getListings({
        phrases: opts?.phrases?.length ? opts.phrases : undefined,
        available: opts?.available,
        categories: opts?.categories?.length ? opts.categories : undefined,
        subCategories: opts?.subCategories?.length ? opts.subCategories : undefined,
        page,
        size: PAGE_SIZE,
      });
      setListings(result.content ?? []);
      setPageIndex(page);
      setTotalPages(result.page?.totalPages ?? 0);
      setTotalRecords(result.page?.totalRecords ?? 0);
    } catch {
      setError('Failed to load listings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch on mount using any pre-existing URL params
    fetchListings({
      phrases: searchParams.getAll('phrases'),
      available: (() => {
        const av = searchParams.get('available');
        return av === 'true' ? true : av === 'false' ? false : undefined;
      })(),
      categories: searchParams.getAll('categories'),
      subCategories: searchParams.getAll('subCategories'),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildFilterUrl = (
    ph: string[],
    avail: 'all' | 'true' | 'false',
    cats: SelectOption[],
    subs: SelectOption[],
  ) => {
    const params = new URLSearchParams();
    ph.forEach((p) => params.append('phrases', p));
    if (avail !== 'all') params.set('available', avail);
    cats.forEach((c) => params.append('categories', c.value));
    subs.forEach((s) => params.append('subCategories', s.value));
    return params.toString() ? `?${params.toString()}` : '';
  };

  const handleSearch = () => {
    router.replace(
      buildFilterUrl(phrases, availableFilter, selectedCategories, selectedSubCategories),
      { scroll: false },
    );
    fetchListings({
      phrases,
      available: availableFilter === 'all' ? undefined : availableFilter === 'true',
      categories: selectedCategories.map((o) => o.value),
      subCategories: selectedSubCategories.map((o) => o.value),
      page: 0,
    });
  };

  const handleReset = () => {
    setPhrases([]);
    setAvailableFilter('all');
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    router.replace('', { scroll: false });
    fetchListings({ page: 0 });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await listingsApi.deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setError('Failed to delete listing.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<ListingVM>[] = [
    {
      id: 'thumbnail',
      header: '',
      cell: ({ row }) => <ListingThumbnail listingId={row.original.id} />,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => router.push(`/admin/listings/${row.original.id}/view`)}
          className="font-medium text-primary hover:underline text-sm text-left"
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm line-clamp-1">
          {row.original.description ?? '—'}
        </span>
      ),
    },
    {
      id: 'available',
      header: 'Available',
      cell: ({ row }) => {
        const { available, quantity } = row.original;
        if (available === undefined || available === null)
          return <span className="text-xs text-muted-foreground">—</span>;
        if (!available) return <span className="text-sm font-medium text-red-500">No</span>;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-emerald-500">Yes</span>
            {quantity?.available != null && (
              <span className="text-xs text-muted-foreground">({quantity.available})</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const cat = row.original.category;
        if (!cat) return <span className="text-xs text-muted-foreground">—</span>;
        return <CategoryCell icon={cat.icon} name={cat.name} />;
      },
    },
    {
      id: 'subCategory',
      header: 'Sub-category',
      cell: ({ row }) => {
        const sub = row.original.subCategory;
        if (!sub) return <span className="text-xs text-muted-foreground">—</span>;
        if (typeof sub === 'object') {
          const s = sub as ListingCategoryRef;
          return <CategoryCell icon={s.icon} name={s.name} />;
        }
        return <span className="text-sm text-foreground">{sub}</span>;
      },
    },
    {
      id: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = row.original.tags ?? [];
        if (!tags.length) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs"
              >
                {t}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: 'media',
      header: 'Media',
      cell: ({ row }) => {
        const blobs = row.original.blobs ?? [];
        if (!blobs.length) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-col gap-1">
            <MediaCountBadge
              blobs={blobs}
              type="image"
              onClick={() => setMediaModal({ blobs, mediaType: 'image' })}
            />
            <MediaCountBadge
              blobs={blobs}
              type="video"
              onClick={() => setMediaModal({ blobs, mediaType: 'video' })}
            />
            <MediaCountBadge
              blobs={blobs}
              type="doc"
              onClick={() => setMediaModal({ blobs, mediaType: 'doc' })}
            />
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Tip label="View listing">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/listings/${row.original.id}/view`)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Edit listing">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/listings/${row.original.id}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Delete listing">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmId(row.original.id)}
              disabled={deletingId === row.original.id}
            >
              {deletingId === row.original.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </Tip>
        </div>
      ),
    },
  ];

  const goToPage = (page: number) =>
    fetchListings({
      phrases,
      available: availableFilter === 'all' ? undefined : availableFilter === 'true',
      categories: selectedCategories.map((o) => o.value),
      subCategories: selectedSubCategories.map((o) => o.value),
      page,
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listings"
        description="Manage auction listings"
        actions={
          <div className="flex gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`px-2.5 py-1.5 border-l border-border transition-colors ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <Button size="sm" onClick={() => router.push('/admin/listings/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New listing
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                fetchListings({
                  phrases,
                  available: availableFilter === 'all' ? undefined : availableFilter === 'true',
                  categories: selectedCategories.map((o) => o.value),
                  subCategories: selectedSubCategories.map((o) => o.value),
                  page: pageIndex,
                })
              }
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      <ListingsStatsSummary
        counts={{
          all: totalRecords || listings.length,
          active: listings.filter((l) => l.available !== false).length,
          pending: listings.filter((l) => l.available === false).length,
          draft: listings.filter((l) => !l.category).length,
        }}
        activeFilter={
          availableFilter === 'true' ? 'ACTIVE' : availableFilter === 'false' ? 'PENDING' : 'ALL'
        }
        onSelectFilter={(filter) => {
          if (filter === 'ACTIVE') setAvailableFilter('true');
          else if (filter === 'PENDING') setAvailableFilter('false');
          else setAvailableFilter('all');
        }}
      />

      {/* Filter panel */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Phrases search */}
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Search phrases</Label>
            <PhrasesInput
              value={phrases}
              onChange={setPhrases}
              placeholder="Type phrase and press Enter..."
            />
          </div>

          {/* Available */}
          <div className="min-w-[130px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Available</Label>
            <select
              value={availableFilter}
              onChange={(e) => setAvailableFilter(e.target.value as 'all' | 'true' | 'false')}
              className="w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Categories */}
          <div className="min-w-[240px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Categories</Label>
            <Select<SelectOption, true>
              isMulti
              options={categoryOptions}
              value={selectedCategories}
              onChange={(vals: MultiValue<SelectOption>) => {
                setSelectedCategories([...vals]);
                // Clear subcategories that no longer belong to selected cats
                const catIds = new Set(vals.map((v) => v.value));
                setSelectedSubCategories((prev) =>
                  prev.filter((s) => {
                    const ownerCat = categories.find((c) =>
                      c.subCategories?.some((sc) => sc.id === s.value),
                    );
                    return ownerCat && catIds.has(ownerCat.id);
                  }),
                );
              }}
              placeholder="All categories"
              styles={reactSelectStyles as never}
            />
          </div>

          {/* Subcategories */}
          <div className="min-w-[240px] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Sub-categories</Label>
            <GroupedSubcategorySelect
              isMulti
              categories={
                selectedCategories.length > 0
                  ? categories.filter((c) => selectedCategories.some((s) => s.value === c.id))
                  : categories
              }
              value={selectedSubCategories.map((o) => o.value)}
              onChange={(ids) => {
                const allSubs = categories.flatMap((c) => c.subCategories ?? []);
                setSelectedSubCategories(
                  ids
                    .map((id) => allSubs.find((s) => s.id === id))
                    .filter(Boolean)
                    .map((s) => ({ label: s!.name, value: s!.id })),
                );
              }}
              placeholder="All sub-categories"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pb-0.5">
            <Button size="sm" onClick={handleSearch} className="gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Search
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <DataTable
          data={listings}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No listings found."
          hideSearch
          manualPagination
          pageIndex={pageIndex}
          pageCount={totalPages}
          rowCount={totalRecords}
          pageSize={PAGE_SIZE}
          onPageChange={goToPage}
        />
      ) : (
        <>
          <ListingCardGrid
            listings={listings}
            isLoading={isLoading}
            deletingId={deletingId}
            onView={(id) => router.push(`/admin/listings/${id}/view`)}
            onEdit={(id) => router.push(`/admin/listings/${id}/edit`)}
            onDelete={(id) => setConfirmId(id)}
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {pageIndex * PAGE_SIZE + 1} to {pageIndex * PAGE_SIZE + listings.length} of{' '}
                {totalRecords} results
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pageIndex - 1)}
                  disabled={pageIndex <= 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pageIndex + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pageIndex + 1)}
                  disabled={pageIndex >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete listing?"
        description="This will permanently remove the listing."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />

      {mediaModal && <MediaModal modal={mediaModal} onClose={() => setMediaModal(null)} />}
    </div>
  );
}
