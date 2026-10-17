'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RowSelectionState } from '@tanstack/react-table';
import { Download, Loader2, RefreshCw, UserPlus } from 'lucide-react';
import type { UserDetailVM } from '@repo/api';
import { Button, toast } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import PageHeader from '@/components/common/admin/PageHeader';
import Tip from '@/components/common/admin/Tip';
import { ActiveFilterChips } from './_components/ActiveFilterChips';
import { DeleteUserDialog } from './_components/DeleteUserDialog';
import type { UserRowHandlers } from './_components/UserActionsMenu';
import { UserCard } from './_components/UserCard';
import { buildUserColumns } from './_components/userColumns';
import { UserDetailsSheet } from './_components/UserDetailsSheet';
import { UsersBulkBar } from './_components/UsersBulkBar';
import { UsersFilterBar } from './_components/UsersFilterBar';
import { UsersMobileFooter } from './_components/UsersMobileFooter';
import { UsersEmptyState, UsersListSkeleton } from './_components/UsersListStates';
import { UsersStatusTabs } from './_components/UsersStatusTabs';
import { useAccessCatalog } from '@/hooks/admin';
import { useUserActions } from './_hooks/useUserActions';
import { useUsersFilters } from './_hooks/useUsersFilters';
import { PAGE_SIZE_OPTIONS, useUsersList } from './_hooks/useUsersList';
import { useUserById } from './_hooks/useUserById';
import { useUserStatusCounts } from './_hooks/useUserStatusCounts';
import { exportUsersCsv } from './_lib/export-users';
import { plural } from './_lib/user-display';
import { activeStatusTab, applyStatusTab, hasAnyFilter } from './_lib/users-filters';

export default function UsersPage() {
  const router = useRouter();
  const { filters, setFilters, updateFilters, resetFilters, viewId, setViewId } = useUsersFilters();
  const list = useUsersList(filters);
  const { counts, reload: reloadCounts } = useUserStatusCounts();
  const { roles, roleOptions, permissionOptions } = useAccessCatalog();

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleting, setDeleting] = useState<UserDetailVM | null>(null);
  const [exporting, setExporting] = useState(false);

  const actions = useUserActions({
    onUpdated: list.updateUser,
    onDeleted: () => list.refresh(),
    onStatusChanged: reloadCounts,
  });

  // A selection only makes sense for the rows it was made on.
  useEffect(() => {
    setRowSelection({});
  }, [filters, list.pageIndex, list.pageSize, list.sorting]);

  const handlers: UserRowHandlers = {
    onView: (u) => setViewId(u.id),
    onEdit: (u) => router.push(`/admin/users/${u.id}/edit`),
    onManageAccess: (u) => router.push(`/admin/users/${u.id}/edit#access`),
    onResetPassword: actions.resetPassword,
    onToggleEnabled: (u) => actions.setEnabled([u], !u.enabled),
    onUnlock: actions.unlock,
    onDelete: setDeleting,
    busyIds: actions.busyIds,
  };

  const selectedUsers = list.data.filter((u) => rowSelection[u.id]);
  const viewingUser = useUserById(
    viewId,
    list.data.find((u) => u.id === viewId),
  );
  const filtered = hasAnyFilter(filters);

  const addUser = () => router.push('/admin/users/new');

  const refresh = () => {
    list.refresh();
    reloadCounts();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const n = await exportUsersCsv(filters);
      toast.success(`Exported ${plural(n, 'user')}`);
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="Manage registered users and their access"
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
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting || list.totalRecords === 0}
            >
              {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              Export
            </Button>
            <Button className="hidden md:inline-flex" onClick={addUser}>
              <UserPlus />
              Add user
            </Button>
          </>
        }
      />

      <UsersStatusTabs
        value={activeStatusTab(filters)}
        counts={counts}
        onChange={(tab) => setFilters((prev) => applyStatusTab(prev, tab))}
      />

      <UsersFilterBar
        filters={filters}
        onChange={updateFilters}
        roleOptions={roleOptions}
        permissionOptions={permissionOptions}
      />

      <ActiveFilterChips
        filters={filters}
        onChange={updateFilters}
        onClearAll={resetFilters}
        roleOptions={roleOptions}
        permissionOptions={permissionOptions}
      />

      {list.error && <ErrorAlert message={list.error} />}

      {selectedUsers.length > 0 && (
        <UsersBulkBar
          count={selectedUsers.length}
          roles={roles}
          busy={selectedUsers.some((u) => actions.busyIds.has(u.id))}
          onEnable={() => actions.setEnabled(selectedUsers, true)}
          onDisable={() => actions.setEnabled(selectedUsers, false)}
          onAssignRole={(role) => actions.assignRole(selectedUsers, role)}
          onClear={() => setRowSelection({})}
        />
      )}

      <DataTable
        data={list.data}
        columns={buildUserColumns(handlers)}
        isLoading={list.isLoading}
        hideSearch
        getRowId={(u) => u.id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        onRowClick={handlers.onView}
        manualSorting
        sorting={list.sorting}
        onSortingChange={list.setSorting}
        manualPagination
        pageIndex={list.pageIndex}
        pageCount={list.totalPages}
        rowCount={list.totalRecords}
        pageSize={list.pageSize}
        onPageChange={list.fetchPage}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={list.setPageSize}
        itemLabel="users"
        loadingState={<UsersListSkeleton />}
        emptyState={<UsersEmptyState filtered={filtered} onClearFilters={resetFilters} />}
        mobileFooter={
          <UsersMobileFooter
            onAddUser={addUser}
            pageIndex={list.pageIndex}
            pageCount={list.totalPages}
            pageSize={list.pageSize}
            itemCount={list.data.length}
            totalRecords={list.totalRecords}
            onPageChange={list.fetchPage}
            isLoading={list.isLoading}
          />
        }
        renderMobileCard={(u) => (
          <UserCard
            user={u}
            handlers={handlers}
            selected={!!rowSelection[u.id]}
            onSelectedChange={(selected) =>
              setRowSelection((prev) => ({ ...prev, [u.id]: selected }))
            }
          />
        )}
      />

      <UserDetailsSheet user={viewingUser} handlers={handlers} onClose={() => setViewId(null)} />

      <DeleteUserDialog
        user={deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={async (u) => {
          const deleted = await actions.deleteUser(u);
          if (deleted && viewId === u.id) setViewId(null);
          return deleted;
        }}
      />
    </div>
  );
}
