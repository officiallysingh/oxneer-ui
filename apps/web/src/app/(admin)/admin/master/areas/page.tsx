'use client';

import { useCallback, useEffect, useState } from 'react';
import { masterApi, type StateVM, type AreaVM } from '@repo/api';
import { MapPinned } from 'lucide-react';
import { SearchInput } from '@/components/common/admin/SearchInput';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { PaginationBar } from '@/components/common/admin/PaginationBar';
import { ListToolbarActions } from '@/components/common/admin/ListToolbarActions';
import { LoadingBlock, EmptyState } from '@/components/common/admin/ListState';
import { RowActions } from '@/components/common/admin/RowActions';
import { useConfirmDialog } from '@/hooks/admin/useConfirmDialog';
import { useFetchPaginatedList } from '@/hooks/admin/useFetchPaginatedList';
import { AddAreaPickerDialog, EditAreaDialog } from '@/components/common/master';

const PAGE_SIZE = 16;

export default function AreasPage() {
  const [states, setStates] = useState<StateVM[]>([]);
  const [search, setSearch] = useState('');

  const {
    data: areas,
    setData: setAreas,
    isLoading,
    error,
    pageIndex,
    totalPages,
    totalRecords,
    fetchPage,
    refresh,
  } = useFetchPaginatedList<AreaVM>(
    useCallback(
      (page) =>
        masterApi.searchAreas({
          searchText: search.trim() || undefined,
          page,
          size: PAGE_SIZE,
        }),
      [search],
    ),
    search,
    { errorMessage: 'Failed to load areas.' },
  );

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AreaVM | null>(null);
  const { confirm, openConfirm, closeConfirm } = useConfirmDialog();

  useEffect(() => {
    masterApi
      .getStates()
      .then(setStates)
      .catch(() => setStates([]));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Areas"
        description="All areas across every city"
        actions={
          <ListToolbarActions
            onAdd={() => setAddOpen(true)}
            addLabel="Add area"
            addDisabled={!states.length}
            onRefresh={refresh}
            refreshing={isLoading}
          />
        }
      />

      {error && <ErrorAlert message={error} />}

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search areas, cities, pin codes..."
        className="max-w-sm"
      />

      {isLoading ? (
        <LoadingBlock message="Loading areas..." />
      ) : areas.length === 0 ? (
        <EmptyState icon={MapPinned} message="No areas found." />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
          {areas.map((area) => (
            <div
              key={area.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <MapPinned className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground text-sm">{area.name}</span>
                {area.pinCode && (
                  <span className="text-xs text-muted-foreground ml-2">{area.pinCode}</span>
                )}
                {(area.city?.name ?? area.city?.state?.name) && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {[area.city?.name, area.city?.state?.name].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
              <RowActions
                size="sm"
                editLabel="Edit area"
                deleteLabel="Delete area"
                onEdit={() => setEditTarget(area)}
                onDelete={() =>
                  openConfirm({
                    title: 'Delete area?',
                    description: `"${area.name}" will be permanently removed.`,
                    onConfirm: () => setAreas((prev) => prev.filter((a) => a.id !== area.id)),
                  })
                }
              />
            </div>
          ))}
        </div>
      )}

      <PaginationBar
        pageIndex={pageIndex}
        pageCount={totalPages}
        pageSize={PAGE_SIZE}
        itemCount={areas.length}
        totalRecords={totalRecords}
        onPageChange={fetchPage}
        isLoading={isLoading}
      />

      <AddAreaPickerDialog
        open={addOpen}
        states={states}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          fetchPage(pageIndex);
        }}
      />

      <EditAreaDialog
        area={editTarget}
        states={states}
        onClose={() => setEditTarget(null)}
        onUpdated={() => fetchPage(pageIndex)}
      />

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmLabel="Delete"
        onConfirm={() => {
          confirm.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
}
