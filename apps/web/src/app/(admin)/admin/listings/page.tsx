'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw } from 'lucide-react';
import { Button, cn } from '@oxneer/ui';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { PaginationBar } from '@/components/common/admin/PaginationBar';
import { ListingsStatsSummary } from './_components/ListingsStatsSummary';
import { ListingsFilterPanel } from './_components/ListingsFilterPanel';
import { ListingsViewToggle, type ListingsViewMode } from './_components/ListingsViewToggle';
import { buildListingColumns } from './_components/listingColumns';
import {
  ListingCardGrid,
  MediaModal,
  type MediaModalState,
} from './_components/ListingMediaComponents';
import { LISTINGS_PAGE_SIZE, useListingsList } from './_hooks/useListingsList';
import { useListingsFilters } from './_hooks/useListingsFilters';
import { useListingCategories } from './_hooks/useListingCategories';
import { availableFromStatsKey, statsKeyFromAvailable } from './_lib/listings-filters';

export default function ListingsPage() {
  const router = useRouter();
  const filters = useListingsFilters();
  const categories = useListingCategories();
  const list = useListingsList(filters.appliedFilters, filters.searchRun);
  const [viewMode, setViewMode] = useState<ListingsViewMode>('list');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [mediaModal, setMediaModal] = useState<MediaModalState | null>(null);

  const openListing = (id: string) => router.push(`/admin/listings/${id}/view`);
  const editListing = (id: string) => router.push(`/admin/listings/${id}/edit`);

  const columns = buildListingColumns({
    deletingId: list.deletingId,
    onEdit: editListing,
    onDelete: setConfirmId,
    onShowMedia: setMediaModal,
  });

  const listings = list.data;
  const stats = {
    all: list.totalRecords || listings.length,
    active: listings.filter((l) => l.available !== false).length,
    pending: listings.filter((l) => l.available === false).length,
    draft: listings.filter((l) => !l.category).length,
  };

  const confirmDelete = () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    void list.deleteListing(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listings"
        description="Manage auction listings"
        actions={
          <div className="flex gap-2">
            <ListingsViewToggle value={viewMode} onChange={setViewMode} />
            <Button size="sm" onClick={() => router.push('/admin/listings/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New listing
            </Button>
            <Button variant="outline" size="sm" onClick={list.refresh} disabled={list.isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-1', list.isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        }
      />

      {list.error && <ErrorAlert message={list.error} />}

      <ListingsStatsSummary
        counts={stats}
        activeFilter={statsKeyFromAvailable(filters.draft.available)}
        onSelectFilter={(key) => filters.updateDraft({ available: availableFromStatsKey(key) })}
      />

      <ListingsFilterPanel
        filters={filters.draft}
        categories={categories}
        onChange={filters.updateDraft}
        onSearch={filters.applyFilters}
        onReset={filters.resetFilters}
      />

      {viewMode === 'list' ? (
        <DataTable
          data={listings}
          columns={columns}
          isLoading={list.isLoading}
          emptyMessage="No listings found."
          hideSearch
          manualPagination
          pageIndex={list.pageIndex}
          pageCount={list.totalPages}
          rowCount={list.totalRecords}
          pageSize={LISTINGS_PAGE_SIZE}
          onPageChange={list.fetchPage}
        />
      ) : (
        <>
          <ListingCardGrid
            listings={listings}
            isLoading={list.isLoading}
            deletingId={list.deletingId}
            onView={openListing}
            onEdit={editListing}
            onDelete={setConfirmId}
          />
          <PaginationBar
            pageIndex={list.pageIndex}
            pageCount={list.totalPages}
            pageSize={LISTINGS_PAGE_SIZE}
            itemCount={listings.length}
            totalRecords={list.totalRecords}
            onPageChange={list.fetchPage}
            isLoading={list.isLoading}
            itemLabel="listings"
          />
        </>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete listing?"
        description="This will permanently remove the listing."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />

      {mediaModal && <MediaModal modal={mediaModal} onClose={() => setMediaModal(null)} />}
    </div>
  );
}
