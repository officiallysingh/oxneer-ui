import type { PermissionVM } from '@repo/api';
import {
  ACTION_LABELS,
  actionOf,
  actionSegment,
  type PermissionAction,
  type ResourceGroup,
} from '@/lib/access/permission-matrix';
import {
  PERMISSION_ACTION_ERROR,
  PERMISSION_ACTION_PATTERN,
  PERMISSION_RESOURCE_ERROR,
  PERMISSION_RESOURCE_PATTERN,
} from '@/lib/validation';

export type ActionChoice = PermissionAction | 'other';

/** What the editor sheet is doing: creating (optionally for a resource) or editing. */
export type PermissionEditorTarget =
  | { mode: 'create'; resourceKey?: string }
  | { mode: 'edit'; permission: PermissionVM };

export interface NewPermissionValues {
  /** Existing resource prefix, or the typed prefix when `newResource`. */
  resourceKey: string;
  newResource: boolean;
  /** Label of a new resource, e.g. "Banks" (existing ones use the group label). */
  resourceLabel: string;
  action: ActionChoice | null;
  customAction: string;
  label: string;
  /** False until the user edits the label, so it keeps following the suggestion. */
  labelEdited: boolean;
  description: string;
}

export type NewPermissionField =
  | 'resourceKey'
  | 'resourceLabel'
  | 'action'
  | 'customAction'
  | 'label';
export type NewPermissionErrors = Partial<Record<NewPermissionField, string>>;

export function emptyNewPermission(resourceKey = ''): NewPermissionValues {
  return {
    resourceKey,
    newResource: false,
    resourceLabel: '',
    action: null,
    customAction: '',
    label: '',
    labelEdited: false,
    description: '',
  };
}

/** Actions that already exist for a resource (so they can't be added twice). */
export function takenActions(group: ResourceGroup | undefined): Set<PermissionAction> {
  const taken = new Set<PermissionAction>();
  group?.permissions.forEach((p) => {
    const a = actionOf(p.name);
    if (a) taken.add(a);
  });
  return taken;
}

function actionSegmentOf(v: NewPermissionValues, catalog: PermissionVM[]): string {
  if (!v.action) return '';
  return v.action === 'other'
    ? v.customAction.trim().toLowerCase()
    : actionSegment(v.action, catalog);
}

/** The generated permission name, e.g. `master.data.banks.export` ('' while incomplete). */
export function buildName(v: NewPermissionValues, catalog: PermissionVM[]): string {
  const resource = v.resourceKey.trim().toLowerCase();
  const action = actionSegmentOf(v, catalog);
  return resource && action ? `${resource}.${action}` : '';
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "View Banks", "Export Banks"… from the action and the resource label. */
export function suggestLabel(v: NewPermissionValues, resourceLabel: string): string {
  if (!v.action || !resourceLabel) return '';
  const verb = v.action === 'other' ? capitalize(v.customAction.trim()) : ACTION_LABELS[v.action];
  return verb ? `${verb} ${resourceLabel}` : '';
}

export function validateNewPermission(
  v: NewPermissionValues,
  name: string,
  existingNames: Set<string>,
): NewPermissionErrors {
  const errors: NewPermissionErrors = {};
  if (!v.resourceKey.trim()) errors.resourceKey = 'Choose a resource';
  else if (v.newResource && !PERMISSION_RESOURCE_PATTERN.test(v.resourceKey.trim()))
    errors.resourceKey = PERMISSION_RESOURCE_ERROR;
  if (v.newResource && !v.resourceLabel.trim()) errors.resourceLabel = 'Give the resource a name';
  if (!v.action) errors.action = 'Choose an action';
  else if (v.action === 'other' && !PERMISSION_ACTION_PATTERN.test(v.customAction.trim()))
    errors.customAction = PERMISSION_ACTION_ERROR;
  else if (name && existingNames.has(name)) errors.customAction = `${name} already exists`;
  if (!v.label.trim()) errors.label = 'Label is required';
  return errors;
}
