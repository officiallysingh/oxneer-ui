'use client';

import { useState } from 'react';
import type { AreaVM } from '@oxneer/api';
import { MapPinned } from 'lucide-react';
import { Button } from '@oxneer/ui';
import { SearchInput } from '@/components/common/admin/SearchInput';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { PaginationBar } from '@/components/common/admin/PaginationBar';
import { ListToolbarActions } from '@/components/common/admin/ListToolbarActions';
import { LoadingBlock, EmptyState } from '@/components/common/admin/ListState';
import { useConfirmDialog } from '@/hooks/admin';
import { AddAreaPickerDialog, EditAreaDialog } from '@/components/common/master';
import { AreasList } from './_components/AreasList';
import { AREAS_PAGE_SIZE, useAreasList } from './_hooks/useAreasList';

export default function AreasPage() {
  const list = useAreasList();
  const { confirm, openConfirm, closeConfirm } = useConfirmDialog();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AreaVM | null>(null);

  const reloadPage = () => void list.fetchPage(list.pageIndex);

  const confirmDelete = (area: AreaVM) =>
    openConfirm({
      title: 'Delete area?',
      description: `"${area.name}" will be permanently removed.`,
      onConfirm: () => void list.deleteArea(area),
    });

  const renderContent = () => {
    if (list.isLoading) return <LoadingBlock message="Loading areas..." />;
    if (list.data.length === 0) {
      return list.search.trim() ? (
        <EmptyState icon={MapPinned} message="No areas match your search." />
      ) : (
        <EmptyState
          icon={MapPinned}
          message="No areas found."
          hint="Add an area to get started."
          action={
            <Button variant="gold" size="sm" onClick={() => setAddOpen(true)}>
              Add area
            </Button>
          }
        />
      );
    }
    return <AreasList areas={list.data} onEdit={setEditTarget} onDelete={confirmDelete} />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Areas"
        description="All areas across every city"
        actions={
          <ListToolbarActions
            onAdd={() => setAddOpen(true)}
            addLabel="Add area"
            addDisabled={!list.states.length}
            onRefresh={list.refresh}
            refreshing={list.isLoading}
          />
        }
      />

      {list.error && <ErrorAlert message={list.error} />}

      <SearchInput
        value={list.search}
        onChange={list.setSearch}
        placeholder="Search areas, cities, pin codes..."
        className="max-w-sm"
      />

      {renderContent()}

      <PaginationBar
        pageIndex={list.pageIndex}
        pageCount={list.totalPages}
        pageSize={AREAS_PAGE_SIZE}
        itemCount={list.data.length}
        totalRecords={list.totalRecords}
        onPageChange={list.fetchPage}
        isLoading={list.isLoading}
      />

      <AddAreaPickerDialog
        open={addOpen}
        states={list.states}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          reloadPage();
        }}
      />

      <EditAreaDialog
        area={editTarget}
        states={list.states}
        onClose={() => setEditTarget(null)}
        onUpdated={reloadPage}
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
