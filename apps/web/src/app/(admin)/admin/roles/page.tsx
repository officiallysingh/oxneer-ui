'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus, RefreshCw } from 'lucide-react';
import { adminApi, type RoleVM } from '@repo/api';
import { Button, toast } from '@repo/ui';
import { DataTable } from '@/components/common/data-table';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import PageHeader from '@/components/common/admin/PageHeader';
import { QuickSearchInput } from '@/components/common/admin/QuickSearchInput';
import Tip from '@/components/common/admin/Tip';
import { copyText } from '@/lib/clipboard';
import { parseApiError } from '@/lib/api-errors';
import { CanManage, buildRoleColumns } from './_components/roleColumns';
import { DeleteRoleDialog } from './_components/DeleteRoleDialog';
import { RoleActionsMenu, type RoleRowHandlers } from './_components/RoleActionsMenu';
import { RoleEditorSheet } from './_components/RoleEditorSheet';
import { RolesEmptyState, RolesListSkeleton } from './_components/RolesListStates';
import { useAccessCatalog } from '@/hooks/admin';
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
  const data = useAccessCatalog();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('label');
  const [editor, setEditor] = useState<RoleEditorTarget | null>(null);
  const [deleting, setDeleting] = useState<RoleVM | null>(null);

  // `?edit=<id>` (e.g. from the Permissions screen) opens that role once roles load.
  const router = useRouter();
  const pathname = usePathname();
  const deepLinkId = useSearchParams().get('edit');
  // Remembers a closed deep link so it doesn't reopen before the URL update lands.
  const [dismissedLink, setDismissedLink] = useState<string | null>(null);
  const deepLinkRole =
    deepLinkId && deepLinkId !== dismissedLink
      ? data.roles.find((r) => r.id === deepLinkId)
      : undefined;
  const editorTarget: RoleEditorTarget | null =
    editor ?? (deepLinkRole ? { mode: 'edit', role: deepLinkRole } : null);
  const closeEditor = () => {
    setEditor(null);
    if (deepLinkId) {
      setDismissedLink(deepLinkId);
      router.replace(pathname, { scroll: false });
    }
  };

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
    onCopyName: (role) => copyText(role.name),
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
        <QuickSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by label, name or description"
          ariaLabel="Search roles"
          shortcutKey="/"
          className="max-w-[520px] flex-[1_1_360px]"
        />
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
        target={editorTarget}
        roles={data.roles}
        groups={data.groups}
        totalPermissions={data.permissions.length}
        onClose={closeEditor}
        onSaved={data.refresh}
        onOpenRole={(role) => setEditor({ mode: 'edit', role })}
      />

      <DeleteRoleDialog role={deleting} onCancel={() => setDeleting(null)} onConfirm={deleteRole} />
    </div>
  );
}
