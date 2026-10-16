import type { PermissionVM } from '@repo/api';

/**
 * Permission names follow `<resource>.<action>`, e.g. `master.data.categories.view`.
 * They are grouped into one row per resource with View / Create / Update / Delete columns;
 * anything that doesn't fit lands in `other`.
 */
export const ACTIONS = ['view', 'create', 'update', 'delete'] as const;
export type PermissionAction = (typeof ACTIONS)[number];

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
};

const ACTION_ALIASES: Record<string, PermissionAction> = {
  view: 'view',
  read: 'view',
  get: 'view',
  list: 'view',
  create: 'create',
  add: 'create',
  update: 'update',
  edit: 'update',
  delete: 'delete',
  remove: 'delete',
};

const VERB_PREFIX = /^(view|read|get|list|create|add|update|edit|delete|remove)\s+/i;

export interface ResourceRow {
  /** Name prefix shared by the row's permissions, e.g. `master.data.categories`. */
  key: string;
  label: string;
  cells: Partial<Record<PermissionAction, PermissionVM>>;
}

export interface PermissionGroups {
  rows: ResourceRow[];
  other: PermissionVM[];
  /** Permission id → the resource label it belongs to (its own label for `other`). */
  resourceOf: Map<string, string>;
}

function parseName(name: string): { key: string; action: PermissionAction } | null {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return null;
  const action = ACTION_ALIASES[name.slice(dot + 1).toLowerCase()];
  return action ? { key: name.slice(0, dot), action } : null;
}

function humanize(segment: string): string {
  const words = segment.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "View Categories" → "Categories"; falls back to the last name segment. */
function resourceLabel(key: string, perms: PermissionVM[]): string {
  for (const p of perms) {
    const stripped = p.label?.replace(VERB_PREFIX, '').trim();
    if (stripped && stripped !== p.label?.trim()) return stripped;
  }
  return humanize(key.slice(key.lastIndexOf('.') + 1));
}

export function groupPermissions(permissions: PermissionVM[]): PermissionGroups {
  const byKey = new Map<string, ResourceRow>();
  const other: PermissionVM[] = [];

  for (const p of permissions) {
    const parsed = parseName(p.name);
    const row = parsed && byKey.get(parsed.key);
    if (!parsed) {
      other.push(p);
    } else if (row && row.cells[parsed.action]) {
      // Two permissions map to the same cell (e.g. `read` and `view`): keep the extra one visible.
      other.push(p);
    } else if (row) {
      row.cells[parsed.action] = p;
    } else {
      byKey.set(parsed.key, { key: parsed.key, label: '', cells: { [parsed.action]: p } });
    }
  }

  const rows = [...byKey.values()];
  const resourceOf = new Map<string, string>();
  for (const row of rows) {
    const perms = Object.values(row.cells) as PermissionVM[];
    row.label = resourceLabel(row.key, perms);
    perms.forEach((p) => resourceOf.set(p.id, row.label));
  }
  other.forEach((p) => resourceOf.set(p.id, p.label || p.name));

  return { rows, other, resourceOf };
}

export function rowPermissionIds(row: ResourceRow): string[] {
  return (Object.values(row.cells) as PermissionVM[]).map((p) => p.id);
}

/** Unique resource labels covered by a set of permission ids, in first-seen order. */
export function resourcesCovered(ids: Iterable<string>, groups: PermissionGroups): string[] {
  const seen = new Set<string>();
  for (const id of ids) {
    const label = groups.resourceOf.get(id);
    if (label) seen.add(label);
  }
  return [...seen];
}
