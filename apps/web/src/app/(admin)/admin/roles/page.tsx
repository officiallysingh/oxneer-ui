'use client';

import { useMemo, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { adminApi, type RoleVM } from '@repo/api';
import { Button, Input, toast } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import PageHeader from '@/components/common/admin/PageHeader';
import Tip from '@/components/common/admin/Tip';
import { parseApiError } from '@/lib/api-errors';
import { CanManage, buildRoleColumns } from './_components/roleColumns';
import { DeleteRoleDialog } from './_components/DeleteRoleDialog';
import { RoleActionsMenu, type RoleRowHandlers } from './_components/RoleActionsMenu';
import { RoleEditorSheet } from './_components/RoleEditorSheet';
import { RolesEmptyState, RolesListSkeleton } from './_components/RolesListStates';
import { useRolesData } from './_hooks/useRolesData';
import { plural, roleToForm, type RoleEditorTarget } from './_lib/role-form';

type SortKey = 'label' | 'permissions' | 'name';

const SORTS: Record<SortKey, { label: string; compare: (a: RoleVM, b: RoleVM) => number }> = {
  label: { label: 'Label A–Z', compare: (a, b) => a.label.localeCompare(b.label) },
  permissions: {
    label: 'Most permissions',
    compare: (a, b) =>
      (b.permissions?.length ?? 0) - (a.permissions?.length ?? 0) || a.label.localeCompare(b.label),
  },
  name: { label: 'Name', compare: (a, b) => a.name.localeCompare(b.name) },
};

export default function RolesPage() {
  const data = useRolesData();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('label');
  const [editor, setEditor] = useState<RoleEditorTarget | null>(null);
  const [deleting, setDeleting] = useState<RoleVM | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? data.roles.filter((r) =>
          [r.label, r.name, r.description ?? ''].some((s) => s.toLowerCase().includes(q)),
        )
      : data.roles;
    return [...filtered].sort(SORTS[sort].compare);
  }, [data.roles, query, sort]);

  const handlers: RoleRowHandlers = {
    onEdit: (role) => setEditor({ mode: 'edit', role }),
    onDuplicate: (role) =>
      setEditor({
        mode: 'create',
        initial: {
          ...roleToForm(role),
          label: `${role.label} copy`,
          name: '',
        },
      }),
    onCopyName: async (role) => {
      try {
        await navigator.clipboard.writeText(role.name);
        toast.success(`Copied ${role.name}`);
      } catch {
        toast.error('Couldn’t copy. Select the name and copy it manually.');
      }
    },
    onDelete: setDeleting,
  };

  const deleteRole = async (role: RoleVM) => {
    try {
      await adminApi.deleteRole(role.id);
      data.removeRole(role.id);
      toast.success(`${role.label} deleted`);
      return true;
    } catch (err) {
      toast.error(parseApiError(err).general ?? 'Couldn’t delete the role. Please try again.');
      return false;
    }
  };

  const count = data.roles.length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles"
        description={`Bundles of permissions you assign to users${
          data.isLoading ? '' : ` · ${plural(count, 'role')}`
        }`}
        actions={
          <>
            <Tip label="Refresh">
              <Button
                variant="outline"
                size="icon"
                onClick={data.refresh}
                disabled={data.isLoading}
                aria-label="Refresh"
              >
                <RefreshCw className={data.isLoading ? 'animate-spin' : ''} />
              </Button>
            </Tip>
            <Button onClick={() => setEditor({ mode: 'create' })}>
              <Plus />
              New role
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 max-w-[520px] flex-[1_1_360px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by label, name or description"
            aria-label="Search roles"
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {(Object.keys(SORTS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORTS[k].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {data.error && <ErrorAlert message={data.error} />}

      <DataTable
        data={rows}
        columns={buildRoleColumns(handlers, data.groups)}
        isLoading={data.isLoading}
        hideSearch
        getRowId={(r) => r.id}
        onRowClick={handlers.onEdit}
        itemLabel="roles"
        loadingState={<RolesListSkeleton />}
        emptyState={
          <RolesEmptyState
            query={query}
            onClearSearch={() => setQuery('')}
            onCreate={(label) =>
              setEditor({ mode: 'create', initial: label ? { label } : undefined })
            }
          />
        }
        renderMobileCard={(role) => (
          <div className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div>
                <div className="font-semibold text-foreground">{role.label}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">{role.name}</div>
              </div>
              {role.description && (
                <p className="text-[13px] text-muted-foreground">{role.description}</p>
              )}
              <CanManage role={role} groups={data.groups} />
            </div>
            <RoleActionsMenu role={role} handlers={handlers} />
          </div>
        )}
      />

      <RoleEditorSheet
        target={editor}
        roles={data.roles}
        groups={data.groups}
        totalPermissions={data.permissions.length}
        onClose={() => setEditor(null)}
        onSaved={data.refresh}
        onOpenRole={(role) => setEditor({ mode: 'edit', role })}
      />

      <DeleteRoleDialog role={deleting} onCancel={() => setDeleting(null)} onConfirm={deleteRole} />
    </div>
  );
}
