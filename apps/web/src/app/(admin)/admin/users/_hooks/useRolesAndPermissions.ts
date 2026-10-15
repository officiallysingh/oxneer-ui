'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi, type PermissionVM, type RoleVM } from '@repo/api';
import type { CheckListOption } from '@/components/common/admin/SearchableCheckList';

/** All roles (with their permissions) and permissions, plus picker options for both. */
export function useRolesAndPermissions() {
  const [roles, setRoles] = useState<RoleVM[]>([]);
  const [permissions, setPermissions] = useState<PermissionVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getRoles(true), adminApi.getPermissions()])
      .then(([r, p]) => {
        setRoles(r);
        setPermissions(p);
      })
      .catch(() => {
        /* pickers stay empty; the page is still usable */
      })
      .finally(() => setIsLoading(false));
  }, []);

  const roleOptions = useMemo<CheckListOption[]>(
    () => roles.map((r) => ({ value: r.id, label: r.label, sublabel: r.name })),
    [roles],
  );
  const permissionOptions = useMemo<CheckListOption[]>(
    () => permissions.map((p) => ({ value: p.id, label: p.label, sublabel: p.name })),
    [permissions],
  );

  return { roles, permissions, roleOptions, permissionOptions, isLoading };
}
