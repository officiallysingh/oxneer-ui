import type { PermissionVM, RoleVM } from '@repo/api';

export interface EffectivePermission {
  id: string;
  label: string;
  /** Role labels granting it, plus "direct" when assigned individually. */
  sources: string[];
}

export const DIRECT_SOURCE = 'direct';

/** Every permission the selected roles and direct permissions grant, with where each comes from. */
export function effectivePermissions(
  roleIds: string[],
  permissionIds: string[],
  roles: RoleVM[],
  permissions: PermissionVM[],
): EffectivePermission[] {
  const byId = new Map<string, EffectivePermission>();
  const add = (p: Pick<PermissionVM, 'id' | 'label'>, source: string) => {
    const entry = byId.get(p.id) ?? { id: p.id, label: p.label, sources: [] };
    if (!entry.sources.includes(source)) entry.sources.push(source);
    byId.set(p.id, entry);
  };

  roles
    .filter((r) => roleIds.includes(r.id))
    .forEach((r) => (r.permissions ?? []).forEach((p) => add(p, r.label)));
  permissions.filter((p) => permissionIds.includes(p.id)).forEach((p) => add(p, DIRECT_SOURCE));

  return [...byId.values()];
}

/** Direct permissions that a selected role already grants (safe to remove). */
export function redundantDirectPermissions(effective: EffectivePermission[]) {
  return effective.filter((p) => p.sources.includes(DIRECT_SOURCE) && p.sources.length > 1);
}
