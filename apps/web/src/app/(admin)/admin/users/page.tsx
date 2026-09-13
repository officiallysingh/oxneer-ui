'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usersApi, adminApi, UserDetailVM, RoleVM, PermissionVM } from '@repo/api';
import {
  Loader2,
  Trash2,
  RefreshCw,
  UserPlus,
  Pencil,
  PowerOff,
  Power,
  LockOpen,
  CheckCircle2,
  Circle,
  Search,
  X,
  KeyRound,
  SlidersHorizontal,
  Eye,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge, Button, Label } from '@repo/ui';
import Select from 'react-select';
import type { MultiValue } from 'react-select';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable } from '@/components/common/data-table';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import Tip from '@/components/common/admin/Tip';
import { TagList } from '@/components/common/admin/TagList';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import { UserAvatar } from '@/components/common/admin/UserAvatar';

interface SelectOption {
  label: string;
  value: string;
}

const reactSelectStyles = {
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    backgroundColor: 'hsl(var(--background))',
    borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.2)' : 'none',
    borderRadius: '0.375rem',
    minHeight: '2.25rem',
    fontSize: '0.875rem',
    '&:hover': { borderColor: 'hsl(var(--primary) / 0.5)' },
  }),
  option: (base: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'hsl(var(--primary))'
      : state.isFocused
        ? 'hsl(var(--muted))'
        : 'hsl(var(--background))',
    color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
    fontSize: '0.875rem',
  }),
  multiValue: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'hsl(var(--secondary))',
    borderRadius: '0.25rem',
  }),
  multiValueLabel: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--secondary-foreground))',
    fontSize: '0.75rem',
  }),
  multiValueRemove: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    '&:hover': { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' },
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 4px 16px hsl(var(--foreground)/0.08)',
    zIndex: 50,
  }),
  input: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--foreground))',
    fontSize: '0.875rem',
  }),
  placeholder: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    fontSize: '0.875rem',
  }),
  singleValue: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--foreground))',
  }),
};

function isSuperAdmin(user: UserDetailVM): boolean {
  return (user.roles ?? []).some((r) => {
    const key = `${r.name ?? ''} ${r.label ?? ''}`.toLowerCase().replace(/[^a-z]/g, '');
    return key.includes('superadmin');
  });
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
  ) : (
    <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
  );
}

/** Tri-state (All / option / option) filter for an optional boolean query param. */
function TriStateFilter({
  label,
  value,
  onChange,
  trueLabel = 'Yes',
  falseLabel = 'No',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return (
    <div className="w-full max-w-[18rem] space-y-1 sm:grid sm:grid-cols-[auto_minmax(12rem,1fr)] sm:items-center sm:gap-2 sm:space-y-0">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All</option>
        <option value="true">{trueLabel}</option>
        <option value="false">{falseLabel}</option>
      </select>
    </div>
  );
}

/** '' -&gt; unset, 'true'/'false' -&gt; boolean, for the tri-state filters above. */
function triStateToBool(v: string): boolean | undefined {
  return v ? v === 'true' : undefined;
}

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserDetailVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [resetPwdId, setResetPwdId] = useState<string | null>(null);
  const PAGE_SIZE = 20;
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filter state
  const [phrases, setPhrases] = useState<string[]>(() => searchParams.getAll('phrases'));
  const [selectedRoles, setSelectedRoles] = useState<SelectOption[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<SelectOption[]>([]);
  const [allRoles, setAllRoles] = useState<RoleVM[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionVM[]>([]);
  const [enabledFilter, setEnabledFilter] = useState(() => searchParams.get('enabled') ?? '');
  const [credentialsExpiredFilter, setCredentialsExpiredFilter] = useState(
    () => searchParams.get('credentialsExpired') ?? '',
  );
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState(
    () => searchParams.get('emailIdVerified') ?? '',
  );
  const [mobileVerifiedFilter, setMobileVerifiedFilter] = useState(
    () => searchParams.get('mobileNoVerified') ?? '',
  );

  const phrasesRef = useRef<string[]>(searchParams.getAll('phrases'));

  // Load roles (with permissions) and permissions on mount
  useEffect(() => {
    const roleIds = searchParams.getAll('roles');
    const permIds = searchParams.getAll('permissions');
    Promise.all([adminApi.getRoles(true), adminApi.getPermissions()])
      .then(([groups, perms]) => {
        setAllRoles(groups);
        setAllPermissions(perms);
        if (roleIds.length) {
          setSelectedRoles(
            groups
              .filter((g) => roleIds.includes(g.id))
              .map((g) => ({ label: g.label, value: g.id })),
          );
        }
        if (permIds.length) {
          setSelectedPermissions(
            perms
              .filter((a) => permIds.includes(a.id))
              .map((a) => ({ label: a.label, value: a.id })),
          );
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const roleOptions: SelectOption[] = allRoles.map((g) => ({ label: g.label, value: g.id }));

  const permissionOptions: SelectOption[] = allPermissions.map((a) => ({
    label: a.label,
    value: a.id,
  }));

  // Group permissions by role for the dropdown
  const groupedPermissionOptions = allRoles
    .filter((r) => (r.permissions?.length ?? 0) > 0)
    .map((r) => ({
      label: r.label,
      options: (r.permissions ?? []).map((p) => ({ label: p.label, value: p.id })),
    }));

  const fetchUsers = async (opts?: {
    phrases?: string[];
    roles?: string[];
    permissions?: string[];
    enabled?: string;
    credentialsExpired?: string;
    emailIdVerified?: string;
    mobileNoVerified?: string;
    page?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      // Roles and permissions are always shown as columns, so both are always expanded.
      const expand: ('permissions' | 'roles')[] = ['roles', 'permissions'];
      const page = opts?.page ?? 0;
      const result = await usersApi.getUsers({
        page,
        size: PAGE_SIZE,
        phrases: opts?.phrases?.length ? opts.phrases : undefined,
        expand,
        roles: opts?.roles?.length ? opts.roles : undefined,
        permissions: opts?.permissions?.length ? opts.permissions : undefined,
        enabled: triStateToBool(opts?.enabled ?? ''),
        credentialsExpired: triStateToBool(opts?.credentialsExpired ?? ''),
        emailIdVerified: triStateToBool(opts?.emailIdVerified ?? ''),
        mobileNoVerified: triStateToBool(opts?.mobileNoVerified ?? ''),
      });
      setUsers(result.content ?? []);
      setPageIndex(page);
      setTotalPages(result.page?.totalPages ?? 0);
      setTotalRecords(result.page?.totalRecords ?? 0);
    } catch {
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    const initPhrases = phrasesRef.current.length ? phrasesRef.current : undefined;
    const initRoles = searchParams.getAll('roles');
    const initPerms = searchParams.getAll('permissions');
    fetchUsers({
      phrases: initPhrases,
      roles: initRoles,
      permissions: initPerms,
      enabled: enabledFilter,
      credentialsExpired: credentialsExpiredFilter,
      emailIdVerified: emailVerifiedFilter,
      mobileNoVerified: mobileVerifiedFilter,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildFilterUrl = (
    ph: string[],
    roles: SelectOption[],
    perms: SelectOption[],
    boolFilters: Record<string, string>,
  ) => {
    const params = new URLSearchParams();
    ph.forEach((p) => params.append('phrases', p));
    roles.forEach((r) => params.append('roles', r.value));
    perms.forEach((p) => params.append('permissions', p.value));
    for (const [key, value] of Object.entries(boolFilters)) {
      if (value) params.set(key, value);
    }
    return params.toString() ? `?${params.toString()}` : '';
  };

  const handleSearch = () => {
    phrasesRef.current = phrases;
    router.replace(
      buildFilterUrl(phrases, selectedRoles, selectedPermissions, {
        enabled: enabledFilter,
        credentialsExpired: credentialsExpiredFilter,
        emailIdVerified: emailVerifiedFilter,
        mobileNoVerified: mobileVerifiedFilter,
      }),
      { scroll: false },
    );
    fetchUsers({
      phrases,
      roles: selectedRoles.map((o) => o.value),
      permissions: selectedPermissions.map((o) => o.value),
      enabled: enabledFilter,
      credentialsExpired: credentialsExpiredFilter,
      emailIdVerified: emailVerifiedFilter,
      mobileNoVerified: mobileVerifiedFilter,
      page: 0,
    });
  };

  const handleReset = () => {
    setPhrases([]);
    setSelectedRoles([]);
    setSelectedPermissions([]);
    setEnabledFilter('');
    setCredentialsExpiredFilter('');
    setEmailVerifiedFilter('');
    setMobileVerifiedFilter('');
    phrasesRef.current = [];
    router.replace('', { scroll: false });
    fetchUsers({});
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await usersApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      setError('Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  };

  const patchUser = async (
    user: UserDetailVM,
    patch: Partial<{ enabled: boolean; accountNonLocked: boolean }>,
    errorMsg: string,
  ) => {
    setActionId(user.id);
    try {
      await usersApi.updateUser(user.id, patch as Parameters<typeof usersApi.updateUser>[1]);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...patch } : u)));
    } catch {
      setError(errorMsg);
    } finally {
      setActionId(null);
    }
  };

  const handleResetPassword = async (user: UserDetailVM) => {
    setResetPwdId(user.id);
    try {
      await usersApi.resetPassword(user.id);
    } catch {
      setError('Failed to reset password.');
    } finally {
      setResetPwdId(null);
    }
  };

  const baseColumns: ColumnDef<UserDetailVM>[] = [
    {
      id: 'avatar',
      header: '',
      size: 44,
      cell: ({ row }) => {
        const { firstName, lastName, username, profilePicture } = row.original;
        return (
          <UserAvatar
            src={profilePicture}
            firstName={firstName}
            lastName={lastName}
            username={username}
            size={28}
          />
        );
      },
    },
    {
      accessorKey: 'username',
      header: 'Username',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-foreground">{row.original.username ?? '—'}</span>
      ),
    },
    {
      id: 'fullName',
      header: 'Full name',
      cell: ({ row }) => {
        const name = [row.original.firstName, row.original.lastName].filter(Boolean).join(' ');
        return <span className="text-sm text-foreground">{name || '—'}</span>;
      },
    },
    {
      id: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-foreground">{row.original.emailId}</span>
          <VerifiedBadge verified={row.original.emailIdVerified} />
        </div>
      ),
    },
    {
      id: 'mobile',
      header: 'Mobile',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">{row.original.mobileNo ?? '—'}</span>
          {row.original.mobileNo && <VerifiedBadge verified={row.original.mobileNoVerified} />}
        </div>
      ),
    },
    {
      id: 'enabled',
      header: 'Status',
      cell: ({ row }) => {
        const { enabled, accountNonLocked } = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                enabled
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {enabled ? 'Active' : 'Inactive'}
            </span>
            {!accountNonLocked && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                Locked
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const rolesColumn: ColumnDef<UserDetailVM> = {
    id: 'roles',
    header: 'Roles',
    cell: ({ row }) => (
      <TagList
        tags={(row.original.roles ?? []).map((g) => ({ id: g.id, label: g.label }))}
        variant="primary"
      />
    ),
  };

  const permissionsColumn: ColumnDef<UserDetailVM> = {
    id: 'permissions',
    header: 'Permissions',
    cell: ({ row }) => (
      <TagList
        tags={(row.original.permissions ?? []).map((a) => ({
          id: a.id,
          label: a.label,
        }))}
        variant="muted"
      />
    ),
  };

  const actionsColumn: ColumnDef<UserDetailVM> = {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const user = row.original;
      const busy = actionId === user.id;
      const superAdmin = isSuperAdmin(user);
      return (
        <div className="flex items-center gap-0.5">
          <Tip label="View user">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/users/${user.id}/view`)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Edit user">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push(`/admin/users/${user.id}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          <Tip label="Reset password">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => handleResetPassword(user)}
              disabled={resetPwdId === user.id}
            >
              {resetPwdId === user.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <KeyRound className="h-3.5 w-3.5" />
              )}
            </Button>
          </Tip>
          <Tip label={user.enabled ? 'Disable user' : 'Enable user'}>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${user.enabled ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10'}`}
              onClick={() =>
                patchUser(
                  user,
                  { enabled: !user.enabled },
                  `Failed to ${user.enabled ? 'disable' : 'enable'} user.`,
                )
              }
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : user.enabled ? (
                <PowerOff className="h-3.5 w-3.5" />
              ) : (
                <Power className="h-3.5 w-3.5" />
              )}
            </Button>
          </Tip>
          {!user.accountNonLocked && (
            <Tip label="Unlock account">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                onClick={() =>
                  patchUser(user, { accountNonLocked: true }, 'Failed to unlock user.')
                }
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LockOpen className="h-3.5 w-3.5" />
                )}
              </Button>
            </Tip>
          )}
          <Tip label={superAdmin ? 'Superadmin cannot be deleted' : 'Delete user'}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmId(user.id)}
              disabled={deletingId === user.id || superAdmin}
            >
              {deletingId === user.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </Tip>
        </div>
      );
    },
  };

  const columns: ColumnDef<UserDetailVM>[] = [
    ...baseColumns,
    rolesColumn,
    permissionsColumn,
    actionsColumn,
  ];

  const activeFilterCount =
    phrases.length +
    selectedRoles.length +
    selectedPermissions.length +
    (enabledFilter ? 1 : 0) +
    (credentialsExpiredFilter ? 1 : 0) +
    (emailVerifiedFilter ? 1 : 0) +
    (mobileVerifiedFilter ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage registered users and their accounts"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/admin/users/new')}>
              <UserPlus className="h-4 w-4 mr-1" />
              Add user
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                fetchUsers({
                  phrases: phrasesRef.current.length ? phrasesRef.current : undefined,
                  roles: selectedRoles.map((o) => o.value),
                  permissions: selectedPermissions.map((o) => o.value),
                  enabled: enabledFilter,
                  credentialsExpired: credentialsExpiredFilter,
                  emailIdVerified: emailVerifiedFilter,
                  mobileNoVerified: mobileVerifiedFilter,
                  page: pageIndex,
                })
              }
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      {/* Filter panel */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Filters</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-foreground"
            onClick={handleReset}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear all
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3 pt-4">
          <div className="min-w-[260px] flex-1 space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Search keywords</Label>
            <PhrasesInput
              value={phrases}
              onChange={(v) => {
                phrasesRef.current = v;
                setPhrases(v);
              }}
              placeholder="Username, name, email or phone… press Enter to add"
            />
          </div>

          <div className="min-w-[280px] max-w-[380px] space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Roles</Label>
            <Select<SelectOption, true>
              isMulti
              options={roleOptions}
              value={selectedRoles}
              onChange={(vals: MultiValue<SelectOption>) => setSelectedRoles([...vals])}
              placeholder="All roles"
              styles={reactSelectStyles as never}
            />
          </div>

          <div className="min-w-[280px] max-w-[380px] space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Permissions</Label>
            <Select
              isMulti
              options={
                groupedPermissionOptions.length > 0 ? groupedPermissionOptions : permissionOptions
              }
              value={selectedPermissions}
              onChange={(vals: MultiValue<SelectOption>) => setSelectedPermissions([...vals])}
              placeholder="All permissions"
              formatGroupLabel={
                groupedPermissionOptions.length > 0
                  ? (group: { label: string; options: SelectOption[] }) => (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{group.label}</span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {group.options.length}
                        </span>
                      </div>
                    )
                  : undefined
              }
              styles={reactSelectStyles as never}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-4">
          <TriStateFilter
            label="Account status"
            value={enabledFilter}
            onChange={setEnabledFilter}
            trueLabel="Active"
            falseLabel="Inactive"
          />
          <TriStateFilter
            label="Credentials"
            value={credentialsExpiredFilter}
            onChange={setCredentialsExpiredFilter}
            trueLabel="Expired"
            falseLabel="Valid"
          />
          <TriStateFilter
            label="Email verification"
            value={emailVerifiedFilter}
            onChange={setEmailVerifiedFilter}
            trueLabel="Verified"
            falseLabel="Unverified"
          />
          <TriStateFilter
            label="Mobile verification"
            value={mobileVerifiedFilter}
            onChange={setMobileVerifiedFilter}
            trueLabel="Verified"
            falseLabel="Unverified"
          />
        </div>
      </div>

      <DataTable
        data={users}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No users found."
        hideSearch
        manualPagination
        pageIndex={pageIndex}
        pageCount={totalPages}
        rowCount={totalRecords}
        pageSize={PAGE_SIZE}
        onPageChange={(page) =>
          fetchUsers({
            phrases: phrasesRef.current.length ? phrasesRef.current : undefined,
            roles: selectedRoles.map((o) => o.value),
            permissions: selectedPermissions.map((o) => o.value),
            enabled: enabledFilter,
            credentialsExpired: credentialsExpiredFilter,
            emailIdVerified: emailVerifiedFilter,
            mobileNoVerified: mobileVerifiedFilter,
            page,
          })
        }
      />

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete user?"
        description="This will permanently remove the user and all associated data."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmId) handleDelete(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
