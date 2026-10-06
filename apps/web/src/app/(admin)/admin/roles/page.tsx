'use client';

import { useEffect, useState } from 'react';
import { adminApi, RoleVM, PermissionVM } from '@repo/api';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import { PhraseSearchBar } from '@/components/common/admin/PhraseSearchBar';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { TagList } from '@/components/common/admin/TagList';
import { ListToolbarActions } from '@/components/common/admin/ListToolbarActions';
import { RowActions } from '@/components/common/admin/RowActions';
import { RoleFormDialog, EditRoleDialog } from './_components/RoleFormDialog';

// Extend RoleVM locally to cache fetched permissions
type RoleRow = RoleVM & { _perms?: PermissionVM[] };

export default function RolesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<RoleRow[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleVM | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));

  const fetchGroups = async (ph?: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, perms] = await Promise.all([
        adminApi.getRoles(true, ph?.length ? ph : undefined),
        adminApi.getPermissions(),
      ]);
      setGroups(data.map((g) => ({ ...g, _perms: g.permissions ?? [] })));
      setAllPermissions(perms);
    } catch {
      setError('Failed to load roles.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups(searchParams.getAll('phrases'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    const params = new URLSearchParams();
    phrases.forEach((p) => params.append('phrases', p));
    router.replace(params.toString() ? `?${params.toString()}` : '', { scroll: false });
    fetchGroups(phrases.length ? phrases : undefined);
  };

  const handleReset = () => {
    setPhrases([]);
    router.replace('', { scroll: false });
    fetchGroups([]);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await adminApi.deleteRole(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch {
      setError('Failed to delete role.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<RoleRow>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium text-foreground font-mono text-xs">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'label',
      header: 'Label',
      cell: ({ row }) => <span className="text-foreground">{row.original.label}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.description ?? '—'}</span>
      ),
    },
    {
      id: 'permissions',
      header: 'Permissions',
      cell: ({ row }) => (
        <TagList
          tags={(row.original._perms ?? []).map((p) => ({
            id: p.id,
            label: p.label || p.name,
            mono: true,
          }))}
          variant="muted"
          max={2}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <RowActions
          editLabel="Edit role"
          deleteLabel="Delete role"
          deleting={deletingId === row.original.id}
          onEdit={() => setEditRole(row.original)}
          onDelete={() => setConfirmId(row.original.id)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Manage roles and their assigned permissions"
        actions={
          <ListToolbarActions
            onAdd={() => setIsCreateOpen(true)}
            addLabel="Add role"
            onRefresh={() => fetchGroups(phrases.length ? phrases : undefined)}
            refreshing={isLoading}
          />
        }
      />

      {error && <ErrorAlert message={error} />}

      <PhraseSearchBar
        phrases={phrases}
        onPhrasesChange={setPhrases}
        onSearch={handleSearch}
        onReset={handleReset}
        placeholder="Search roles..."
      />

      <DataTable
        data={groups}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No roles found."
        hideSearch
      />

      <RoleFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        allPermissions={allPermissions}
        onCreated={() => fetchGroups(phrases.length ? phrases : undefined)}
      />

      <EditRoleDialog
        role={editRole}
        allPermissions={allPermissions}
        onClose={() => setEditRole(null)}
        onUpdated={() => fetchGroups(phrases.length ? phrases : undefined)}
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete role?"
        description="This will permanently remove the role and unassign it from all users."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
