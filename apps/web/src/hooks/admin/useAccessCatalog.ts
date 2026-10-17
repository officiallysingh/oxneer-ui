'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, type PermissionVM, type RoleVM } from '@repo/api';
import type { CheckListOption } from '@/components/common/admin/SearchableCheckList';
import { groupPermissions } from '@/lib/access/permission-matrix';

/**
 * All roles (with their permissions) and all permissions — shared by the Users, Roles and
 * Permissions screens — plus the permission matrix groups and picker options.
 */
export function useAccessCatalog() {
  const [roles, setRoles] = useState<RoleVM[]>([]);
  const [permissions, setPermissions] = useState<PermissionVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([adminApi.getRoles(true), adminApi.getPermissions()])
      .then(([r, p]) => {
        if (cancelled) return;
        setRoles(r);
        setPermissions(p);
        setError(null);
      })
      .catch(() => !cancelled && setError('Couldn’t load roles and permissions. Try again.'))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [version]);

  /** Reloads everything; the current data stays visible until the new data arrives. */
  const refresh = useCallback(() => {
    setIsLoading(true);
    setVersion((v) => v + 1);
  }, []);

  const groups = useMemo(() => groupPermissions(permissions), [permissions]);
  const roleOptions = useMemo<CheckListOption[]>(
    () => roles.map((r) => ({ value: r.id, label: r.label, sublabel: r.name })),
    [roles],
  );
  const permissionOptions = useMemo<CheckListOption[]>(
    () => permissions.map((p) => ({ value: p.id, label: p.label, sublabel: p.name })),
    [permissions],
  );

  return {
    roles,
    permissions,
    groups,
    roleOptions,
    permissionOptions,
    isLoading,
    error,
    refresh,
    removeRole: (id: string) => setRoles((prev) => prev.filter((r) => r.id !== id)),
    removePermission: (id: string) => setPermissions((prev) => prev.filter((p) => p.id !== id)),
  };
}

export type AccessCatalog = ReturnType<typeof useAccessCatalog>;
