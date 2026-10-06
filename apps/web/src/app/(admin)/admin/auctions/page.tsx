'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auctionsApi, masterApi, AuctionVM, CategoryVM } from '@repo/api';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { resolveStr } from '@/components/common/admin/format';
import { AuctionsStatsSummary } from './_components/AuctionsStatsSummary';
import { AuctionFiltersPanel, type SelectOption } from './_components/AuctionFiltersPanel';
import { buildAuctionColumns } from './_components/auctionColumns';

const PAGE_SIZE = 20;

function toIsoOrUndefined(localValue: string): string | undefined {
  if (!localValue) return undefined;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default function AuctionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [auctions, setAuctions] = useState<AuctionVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [confirmPublishId, setConfirmPublishId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));
  const [selectedCategories, setSelectedCategories] = useState<SelectOption[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  const [fromTime, setFromTime] = useState(() => searchParams.get('fromTime') ?? '');
  const [tillTime, setTillTime] = useState(() => searchParams.get('tillTime') ?? '');
  const [accessibility, setAccessibility] = useState<string>(
    () => searchParams.get('accessibility') ?? '',
  );
  const [direction, setDirection] = useState<string>(() => searchParams.get('direction') ?? '');
  const [status, setStatus] = useState<string>(() => searchParams.get('status') ?? '');

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

  const fetchAuctions = async (opts?: {
    phrases?: string[];
    categories?: string[];
    subCategories?: string[];
    statuses?: string[];
    accessibility?: string;
    direction?: string;
    fromTime?: string;
    tillTime?: string;
    page?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const page = opts?.page ?? 0;
      const result = await auctionsApi.getAuctions({
        phrases: opts?.phrases?.length ? opts.phrases : undefined,
        categories: opts?.categories?.length ? opts.categories : undefined,
        subCategories: opts?.subCategories?.length ? opts.subCategories : undefined,
        statuses: opts?.statuses?.length ? opts.statuses : undefined,
        accessibility: opts?.accessibility || undefined,
        direction: opts?.direction || undefined,
        fromTime: opts?.fromTime,
        tillTime: opts?.tillTime,
        page,
        size: PAGE_SIZE,
      });
      setAuctions(result.content ?? []);
      setPageIndex(page);
      setTotalPages(result.page?.totalPages ?? 0);
      setTotalRecords(result.page?.totalRecords ?? 0);
    } catch {
      setError('Failed to load auctions.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentFilters = () => ({
    phrases,
    categories: selectedCategories.map((o) => o.value),
    subCategories: selectedSubCategories.map((o) => o.value),
    statuses: status ? [status] : undefined,
    accessibility,
    direction,
    fromTime: toIsoOrUndefined(fromTime),
    tillTime: toIsoOrUndefined(tillTime),
  });

  useEffect(() => {
    fetchAuctions({
      phrases: searchParams.getAll('phrases'),
      categories: searchParams.getAll('categories'),
      subCategories: searchParams.getAll('subCategories'),
      statuses: searchParams.get('status') ? [searchParams.get('status')!] : undefined,
      accessibility: searchParams.get('accessibility') ?? '',
      direction: searchParams.get('direction') ?? '',
      fromTime: toIsoOrUndefined(searchParams.get('fromTime') ?? ''),
      tillTime: toIsoOrUndefined(searchParams.get('tillTime') ?? ''),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildFilterUrl = (
    ph: string[],
    cats: SelectOption[],
    subs: SelectOption[],
    from: string,
    till: string,
    acc: string,
    dir: string,
    st: string,
  ) => {
    const params = new URLSearchParams();
    ph.forEach((p) => params.append('phrases', p));
    cats.forEach((c) => params.append('categories', c.value));
    subs.forEach((s) => params.append('subCategories', s.value));
    if (from) params.set('fromTime', from);
    if (till) params.set('tillTime', till);
    if (acc) params.set('accessibility', acc);
    if (dir) params.set('direction', dir);
    if (st) params.set('status', st);
    return params.toString() ? `?${params.toString()}` : '';
  };

  const handleSearch = () => {
    router.replace(
      buildFilterUrl(
        phrases,
        selectedCategories,
        selectedSubCategories,
        fromTime,
        tillTime,
        accessibility,
        direction,
        status,
      ),
      { scroll: false },
    );
    fetchAuctions({ ...currentFilters(), page: 0 });
  };

  const handleReset = () => {
    setPhrases([]);
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    setFromTime('');
    setTillTime('');
    setAccessibility('');
    setDirection('');
    setStatus('');
    router.replace('', { scroll: false });
    fetchAuctions({ page: 0 });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await auctionsApi.deleteAuction(id);
      setAuctions((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('Failed to delete auction.');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublish = async (auction: AuctionVM) => {
    setPublishingId(auction.id);
    setConfirmPublishId(null);
    try {
      await auctionsApi.publishAuction(auction.id);
      setAuctions((prev) =>
        prev.map((a) => (a.id === auction.id ? { ...a, status: 'PUBLISHED' } : a)),
      );
    } catch {
      setError('Failed to publish auction.');
    } finally {
      setPublishingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    setConfirmCancelId(null);
    try {
      await auctionsApi.cancelAuction(id);
      setAuctions((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'CANCELLED' } : a)));
    } catch {
      setError('Failed to cancel auction.');
    } finally {
      setCancellingId(null);
    }
  };

  const columns = useMemo(
    () =>
      buildAuctionColumns({
        router,
        deletingId,
        publishingId,
        cancellingId,
        onDelete: setConfirmId,
        onPublish: setConfirmPublishId,
        onCancel: setConfirmCancelId,
      }),
    [router, deletingId, publishingId, cancellingId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auctions"
        description="Manage auctions"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/admin/auctions/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New auction
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAuctions({ ...currentFilters(), page: pageIndex })}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      <AuctionsStatsSummary
        counts={{
          all: totalRecords || auctions.length,
          draft: auctions.filter((a) => resolveStr(a.status).toUpperCase() === 'DRAFT').length,
          published: auctions.filter((a) => resolveStr(a.status).toUpperCase() === 'PUBLISHED')
            .length,
          live: auctions.filter((a) => {
            const st = resolveStr(a.status).toUpperCase();
            return st === 'LIVE' || st === 'RUNNING';
          }).length,
          completed: auctions.filter((a) => resolveStr(a.status).toUpperCase() === 'COMPLETED')
            .length,
          cancelled: auctions.filter((a) => resolveStr(a.status).toUpperCase() === 'CANCELLED')
            .length,
        }}
        activeFilter={status || 'ALL'}
        onSelectFilter={(s) => setStatus(s === 'ALL' ? '' : s)}
      />

      <AuctionFiltersPanel
        phrases={phrases}
        onPhrasesChange={setPhrases}
        categories={categories}
        categoryOptions={categoryOptions}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        selectedSubCategories={selectedSubCategories}
        onSubCategoriesChange={setSelectedSubCategories}
        fromTime={fromTime}
        onFromTimeChange={setFromTime}
        tillTime={tillTime}
        onTillTimeChange={setTillTime}
        accessibility={accessibility}
        onAccessibilityChange={setAccessibility}
        direction={direction}
        onDirectionChange={setDirection}
        status={status}
        onStatusChange={setStatus}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <DataTable
        data={auctions}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No auctions found."
        hideSearch
        manualPagination
        pageIndex={pageIndex}
        pageCount={totalPages}
        rowCount={totalRecords}
        pageSize={PAGE_SIZE}
        onPageChange={(page) => fetchAuctions({ ...currentFilters(), page })}
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete auction?"
        description="This will permanently remove the auction."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />

      <ConfirmDialog
        open={confirmPublishId !== null}
        title="Publish auction?"
        description="This makes the auction publicly visible ahead of its scheduled start time."
        confirmLabel="Publish"
        onConfirm={() => {
          const auction = auctions.find((a) => a.id === confirmPublishId);
          if (auction) handlePublish(auction);
        }}
        onCancel={() => setConfirmPublishId(null)}
      />

      <ConfirmDialog
        open={confirmCancelId !== null}
        title="Cancel auction?"
        description="This will cancel the auction. Participants will no longer be able to place offers."
        confirmLabel="Cancel auction"
        onConfirm={() => {
          if (confirmCancelId) handleCancel(confirmCancelId);
        }}
        onCancel={() => setConfirmCancelId(null)}
      />
    </div>
  );
}
