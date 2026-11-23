'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw } from 'lucide-react';
import type { AuctionVM } from '@oxneer/api';
import { Button } from '@oxneer/ui';
import { DataTable } from '@/components/common/data-table';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { ListMobileFooter } from '@/components/common/admin/ListMobileFooter';
import PageHeader from '@/components/common/admin/PageHeader';
import Tip from '@/components/common/admin/Tip';
import { CancelAuctionDialog } from './_components/CancelAuctionDialog';
import { DeleteAuctionDialog } from './_components/DeleteAuctionDialog';
import type { AuctionRowHandlers } from './_components/list/AuctionActionsMenu';
import { AuctionCard } from './_components/list/AuctionCard';
import { AuctionsActiveFilterChips } from './_components/list/AuctionsActiveFilterChips';
import { AuctionsFilterBar } from './_components/list/AuctionsFilterBar';
import { AuctionsEmptyState, AuctionsListSkeleton } from './_components/list/AuctionsListStates';
import { AuctionsStatusTabs } from './_components/list/AuctionsStatusTabs';
import { buildAuctionListColumns } from './_components/list/auctionListColumns';
import { useAuctionActions } from './_hooks/useAuctionActions';
import { useAuctionCategories } from './_hooks/useAuctionCategories';
import { useAuctionsFilters } from './_hooks/useAuctionsFilters';
import { PAGE_SIZE_OPTIONS, useAuctionsList } from './_hooks/useAuctionsList';
import { useAuctionStatusCounts } from './_hooks/useAuctionStatusCounts';
import { auctionTitle } from './_lib/auction-display';
import {
  categoryOptions as toCategoryOptions,
  hasAnyFilter,
  pruneSubCategories,
  subCategoryOptions as toSubCategoryOptions,
} from './_lib/auctions-filters';

type PendingAction = { kind: 'publish' | 'cancel' | 'delete'; auction: AuctionVM } | null;

export default function AuctionsPage() {
  const router = useRouter();
  const { filters, updateFilters, resetFilters } = useAuctionsFilters();
  const list = useAuctionsList(filters);
  const { counts, reload: reloadCounts } = useAuctionStatusCounts();
  const categories = useAuctionCategories();
  const [pending, setPending] = useState<PendingAction>(null);

  const actions = useAuctionActions({
    onUpdated: list.updateAuction,
    onDeleted: () => list.refresh(),
    onStatusChanged: reloadCounts,
  });

  const categoryOptions = toCategoryOptions(categories);
  const subCategoryOptions = toSubCategoryOptions(categories, filters.categories);
  const setCategories = (ids: string[]) =>
    updateFilters({
      categories: ids,
      subCategories: pruneSubCategories(categories, ids, filters.subCategories),
    });

  const createAuction = () => router.push('/admin/auctions/new');

  const handlers: AuctionRowHandlers = {
    onView: (a) => router.push(`/admin/auctions/${a.id}/view`),
    onEdit: (a) => router.push(`/admin/auctions/${a.id}/edit`),
    onSchedule: (a) => router.push(`/admin/auctions/${a.id}/edit?step=3`),
    onPublish: (a) => setPending({ kind: 'publish', auction: a }),
    onCancel: (a) => setPending({ kind: 'cancel', auction: a }),
    onDelete: (a) => setPending({ kind: 'delete', auction: a }),
    busyIds: actions.busyIds,
  };

  const refresh = () => {
    list.refresh();
    reloadCounts();
  };

  const closeDialog = () => setPending(null);
  const pendingName = pending ? auctionTitle(pending.auction) : '';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Auctions"
        description="Set up, schedule and publish auctions"
        actions={
          <>
            <Tip label="Refresh">
              <Button
                variant="outline"
                size="icon"
                onClick={refresh}
                disabled={list.isLoading}
                aria-label="Refresh"
              >
                <RefreshCw className={list.isLoading ? 'animate-spin' : ''} />
              </Button>
            </Tip>
            <Button className="hidden md:inline-flex" onClick={createAuction}>
              <Plus />
              New auction
            </Button>
          </>
        }
      />

      <AuctionsStatusTabs
        value={filters.status}
        counts={counts}
        onChange={(status) => updateFilters({ status })}
      />

      <AuctionsFilterBar
        filters={filters}
        onChange={updateFilters}
        onCategoriesChange={setCategories}
        categoryOptions={categoryOptions}
        subCategoryOptions={subCategoryOptions}
      />

      <AuctionsActiveFilterChips
        filters={filters}
        onChange={updateFilters}
        onCategoriesChange={setCategories}
        onClearAll={resetFilters}
        categoryOptions={categoryOptions}
        subCategoryOptions={subCategoryOptions}
      />

      {list.error && <ErrorAlert message={list.error} />}

      <DataTable
        data={list.data}
        columns={buildAuctionListColumns(handlers)}
        isLoading={list.isLoading}
        hideSearch
        getRowId={(a) => a.id}
        onRowClick={handlers.onView}
        manualPagination
        pageIndex={list.pageIndex}
        pageCount={list.totalPages}
        rowCount={list.totalRecords}
        pageSize={list.pageSize}
        onPageChange={list.fetchPage}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={list.setPageSize}
        itemLabel="auctions"
        loadingState={<AuctionsListSkeleton />}
        emptyState={
          <AuctionsEmptyState
            filtered={hasAnyFilter(filters)}
            onClearFilters={resetFilters}
            onCreate={createAuction}
          />
        }
        mobileFooter={
          <ListMobileFooter
            action={
              <Button className="h-11" onClick={createAuction}>
                <Plus />
                New auction
              </Button>
            }
            pageIndex={list.pageIndex}
            pageCount={list.totalPages}
            pageSize={list.pageSize}
            itemCount={list.data.length}
            totalRecords={list.totalRecords}
            onPageChange={list.fetchPage}
            isLoading={list.isLoading}
          />
        }
        renderMobileCard={(a) => <AuctionCard auction={a} handlers={handlers} />}
      />

      <ConfirmDialog
        open={pending?.kind === 'publish'}
        tone="default"
        title={`Publish “${pendingName}”?`}
        description="It becomes visible to participants ahead of its scheduled start, and its setup can no longer be edited."
        confirmLabel="Publish auction"
        onCancel={closeDialog}
        onConfirm={() => {
          if (pending) void actions.publish(pending.auction);
          closeDialog();
        }}
      />

      <CancelAuctionDialog
        open={pending?.kind === 'cancel'}
        name={pendingName}
        onCancel={closeDialog}
        onConfirm={(reason) =>
          pending ? actions.cancel(pending.auction, reason) : Promise.resolve(false)
        }
      />

      <DeleteAuctionDialog
        open={pending?.kind === 'delete'}
        name={pendingName}
        onCancel={closeDialog}
        onConfirm={() => (pending ? actions.remove(pending.auction) : Promise.resolve(false))}
      />
    </div>
  );
}
