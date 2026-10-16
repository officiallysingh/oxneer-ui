import type { RoleVM } from '@repo/api';

export interface RoleFormValues {
  label: string;
  name: string;
  description: string;
  permissionIds: string[];
}

export const EMPTY_ROLE_FORM: RoleFormValues = {
  label: '',
  name: '',
  description: '',
  permissionIds: [],
};

/** What the editor sheet is doing: creating (optionally prefilled) or editing a role. */
export type RoleEditorTarget =
  | { mode: 'create'; initial?: Partial<RoleFormValues> }
  | { mode: 'edit'; role: RoleVM };

/** "Auction Manager" → "auction.manager" */
export function nameFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

export function roleToForm(role: RoleVM): RoleFormValues {
  return {
    label: role.label,
    name: role.name,
    description: role.description ?? '',
    permissionIds: (role.permissions ?? []).map((p) => p.id),
  };
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
