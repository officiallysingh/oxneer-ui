import type { PermissionVM, RoleVM } from '@repo/api';

/** Permission id → the roles that include it. */
export function rolesByPermission(roles: RoleVM[]): Map<string, RoleVM[]> {
  const map = new Map<string, RoleVM[]>();
  for (const role of roles) {
    for (const p of role.permissions ?? []) {
      map.set(p.id, [...(map.get(p.id) ?? []), role]);
    }
  }
  return map;
}

/** Search across label, name and description. */
export function matchesQuery(p: PermissionVM, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [p.label, p.name, p.description ?? ''].some((s) => s.toLowerCase().includes(q));
}

/** Link that opens a role in the Roles screen's editor. */
export const roleEditHref = (role: Pick<RoleVM, 'id'>) => `/admin/roles?edit=${role.id}`;
