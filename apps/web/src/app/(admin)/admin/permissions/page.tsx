'use client';

import { useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { adminApi, getApiErrorMessage, type PermissionVM, type RoleVM } from '@repo/api';
import { Button, Tabs, TabsList, TabsTrigger, toast } from '@repo/ui';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import PageHeader from '@/components/common/admin/PageHeader';
import { QuickSearchInput } from '@/components/common/admin/QuickSearchInput';
import { TabCount } from '@/components/common/admin/TabCount';
import Tip from '@/components/common/admin/Tip';
import { useAccessCatalog } from '@/hooks/admin';
import { groupByResource } from '@/lib/access/permission-matrix';
import { copyText } from '@/lib/clipboard';
import type { PermissionRowHandlers } from './_components/PermissionActionsMenu';
import { DeletePermissionDialog } from './_components/DeletePermissionDialog';
import { PermissionEditorSheet } from './_components/PermissionEditorSheet';
import {
  PermissionsEmptyState,
  PermissionsListSkeleton,
} from './_components/PermissionsListStates';
import { PermissionsTable } from './_components/PermissionsTable';
import { UnusedPermissionsView } from './_components/UnusedPermissionsView';
import type { PermissionEditorTarget } from './_lib/permission-form';
import { matchesQuery, rolesByPermission } from './_lib/permission-usage';

type View = 'all' | 'unused';

export default function PermissionsPage() {
  const catalog = useAccessCatalog();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('all');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [editor, setEditor] = useState<PermissionEditorTarget | null>(null);
  const [deleting, setDeleting] = useState<PermissionVM | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const usedBy = useMemo(() => rolesByPermission(catalog.roles), [catalog.roles]);
  const groups = useMemo(() => groupByResource(catalog.permissions), [catalog.permissions]);
  const unused = useMemo(
    () => catalog.permissions.filter((p) => !usedBy.has(p.id)),
    [catalog.permissions, usedBy],
  );

  const searching = query.trim().length > 0;
  const visibleGroups = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, permissions: g.permissions.filter((p) => matchesQuery(p, query)) }))
        .filter((g) => g.permissions.length > 0),
    [groups, query],
  );
  const visibleUnused = useMemo(
    () => unused.filter((p) => matchesQuery(p, query)),
    [unused, query],
  );

  const allExpanded = collapsed.size === 0;
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const addToRole = async (permission: PermissionVM, role: RoleVM) => {
    setBusyId(permission.id);
    try {
      const ids = (role.permissions ?? []).map((p) => p.id);
      await adminApi.updateRole(role.id, { permissions: [...ids, permission.id] });
      toast.success(`${permission.label} added to ${role.label}`);
      catalog.refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Couldn’t update the role. Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const deletePermission = async (permission: PermissionVM) => {
    try {
      await adminApi.deletePermission(permission.id);
      catalog.removePermission(permission.id);
      toast.success(`${permission.label} deleted`);
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Couldn’t delete the permission. Please try again.'));
      return false;
    }
  };

  const handlers: PermissionRowHandlers = {
    onEdit: (permission) => setEditor({ mode: 'edit', permission }),
    onCopyName: (permission) => copyText(permission.name),
    onDelete: setDeleting,
    onAddToRole: addToRole,
    busyId,
  };

  const openCreate = () => setEditor({ mode: 'create' });
  const firstLoad = catalog.isLoading && catalog.permissions.length === 0;
  const resourceCount = groups.filter((g) => g.key).length;

  const renderBody = () => {
    if (firstLoad) return <PermissionsListSkeleton />;
    const emptyProps = { query, onClearSearch: () => setQuery(''), onAdd: openCreate };
    if (view === 'unused') {
      if (visibleUnused.length > 0)
        return (
          <UnusedPermissionsView
            permissions={visibleUnused}
            roles={catalog.roles}
            handlers={handlers}
          />
        );
      return <PermissionsEmptyState kind={searching ? 'no-results' : 'all-used'} {...emptyProps} />;
    }
    if (visibleGroups.length > 0)
      return (
        <PermissionsTable
          groups={visibleGroups}
          usedBy={usedBy}
          // While searching, show every matching group open.
          collapsed={searching ? new Set() : collapsed}
          onToggleGroup={toggleGroup}
          handlers={handlers}
        />
      );
    return <PermissionsEmptyState kind={searching ? 'no-results' : 'none'} {...emptyProps} />;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Permissions"
        description={
          firstLoad
            ? 'The individual actions roles are built from'
            : `The individual actions roles are built from · ${catalog.permissions.length} permissions in ${resourceCount} ${resourceCount === 1 ? 'resource' : 'resources'}`
        }
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Add permission
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <QuickSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by label, name or description"
          ariaLabel="Search permissions"
          shortcutKey="/"
          className="max-w-[520px] flex-[1_1_360px]"
        />
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList className="h-10" aria-label="Show">
            <TabsTrigger value="all" className="group gap-2">
              All
              <TabCount n={firstLoad ? undefined : catalog.permissions.length} />
            </TabsTrigger>
            <TabsTrigger value="unused" className="group gap-2">
              Not in any role
              <TabCount n={firstLoad ? undefined : unused.length} />
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex-1" />
        {view === 'all' && !searching && groups.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCollapsed(allExpanded ? new Set(groups.map((g) => g.key)) : new Set())
            }
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </Button>
        )}
        <Tip label="Refresh">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={catalog.refresh}
            disabled={catalog.isLoading}
            aria-label="Refresh"
          >
            <RefreshCw className={catalog.isLoading ? 'animate-spin' : ''} />
          </Button>
        </Tip>
      </div>

      {catalog.error && <ErrorAlert message={catalog.error} />}

      {renderBody()}

      <PermissionEditorSheet
        target={editor}
        groups={groups}
        permissions={catalog.permissions}
        usedBy={usedBy}
        onClose={() => setEditor(null)}
        onSaved={catalog.refresh}
      />

      <DeletePermissionDialog
        permission={deleting}
        usedBy={deleting ? (usedBy.get(deleting.id) ?? []) : []}
        onCancel={() => setDeleting(null)}
        onConfirm={deletePermission}
      />
    </div>
  );
}
