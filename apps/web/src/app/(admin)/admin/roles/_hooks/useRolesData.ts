'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, type PermissionVM, type RoleVM } from '@repo/api';
import { groupPermissions } from '../_lib/permission-matrix';

/** All roles (with permissions) and all permissions, grouped for the matrix. */
export function useRolesData() {
  const [roles, setRoles] = useState<RoleVM[]>([]);
  const [permissions, setPermissions] = useState<PermissionVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [r, p] = await Promise.all([adminApi.getRoles(true), adminApi.getPermissions()]);
      setRoles(r);
      setPermissions(p);
    } catch {
      setError('Couldn’t load roles. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const groups = useMemo(() => groupPermissions(permissions), [permissions]);

  return {
    roles,
    permissions,
    groups,
    isLoading,
    error,
    refresh,
    removeRole: (id: string) => setRoles((prev) => prev.filter((r) => r.id !== id)),
  };
}
