'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2, Lock, Search } from 'lucide-react';
import { adminApi, type RoleVM, type RoleUpdateReq } from '@repo/api';
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  cn,
  toast,
} from '@repo/ui';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { FormField } from '@/components/common/admin/FormField';
import { SaveButton } from '@/components/common/admin/SaveButton';
import { parseApiError } from '@/lib/api-errors';
import { ROLE_NAME_ERROR, ROLE_NAME_PATTERN } from '@/lib/validation';
import { useNameAvailability } from '@/hooks/admin';
import { resourcesCovered, type PermissionGroups } from '@/lib/access/permission-matrix';
import {
  EMPTY_ROLE_FORM,
  nameFromLabel,
  plural,
  roleToForm,
  type RoleEditorTarget,
  type RoleFormValues,
} from '../_lib/role-form';
import { PermissionMatrix } from './PermissionMatrix';

interface RoleEditorSheetProps {
  /** null closes the sheet. */
  target: RoleEditorTarget | null;
  roles: RoleVM[];
  groups: PermissionGroups;
  totalPermissions: number;
  onClose: () => void;
  onSaved: () => void;
  /** Switch the sheet to editing an existing role (from the "name taken" hint). */
  onOpenRole: (role: RoleVM) => void;
}

/** Side sheet for creating or editing a role, with the permission matrix. */
export function RoleEditorSheet({ target, ...rest }: RoleEditorSheetProps) {
  const key = !target ? 'closed' : target.mode === 'edit' ? `edit-${target.role.id}` : 'create';
  return (
    <Sheet open={!!target} onOpenChange={(open) => !open && rest.onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-background p-0 sm:max-w-[680px]"
      >
        {target && <RoleEditorBody key={key} target={target} {...rest} />}
      </SheetContent>
    </Sheet>
  );
}

function RoleEditorBody({
  target,
  roles,
  groups,
  totalPermissions,
  onClose,
  onSaved,
  onOpenRole,
}: Omit<RoleEditorSheetProps, 'target'> & { target: RoleEditorTarget }) {
  const editing = target.mode === 'edit' ? target.role : null;
  const original = useMemo<RoleFormValues>(
    () =>
      editing
        ? roleToForm(editing)
        : { ...EMPTY_ROLE_FORM, ...(target.mode === 'create' ? target.initial : {}) },
    [editing, target],
  );
  const originalIds = useMemo(
    () => new Set(editing ? original.permissionIds : []),
    [editing, original],
  );

  const [values, setValues] = useState<RoleFormValues>(original);
  const [nameTouched, setNameTouched] = useState(!!editing || !!original.name);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  const name = nameTouched ? values.name : nameFromLabel(values.label);
  const selected = useMemo(() => new Set(values.permissionIds), [values.permissionIds]);
  const availability = useNameAvailability(name, {
    check: adminApi.checkRoleNameExists,
    pattern: ROLE_NAME_PATTERN,
    enabled: !editing,
  });

  const set = <K extends keyof RoleFormValues>(key: K, value: RoleFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key === 'permissionIds' ? 'permissions' : key];
      return next;
    });
  };

  const setPermissions = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    set('permissionIds', [...next]);
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const takenRole = availability === 'taken' ? roles.find((r) => r.name === name) : undefined;
  const nameError = editing
    ? undefined
    : (fieldErrors.name ??
      (availability === 'taken'
        ? 'A role with this name already exists.'
        : name && (nameTouched || submitted) && !ROLE_NAME_PATTERN.test(name)
          ? ROLE_NAME_ERROR
          : submitted && !name
            ? 'Enter a name.'
            : undefined));
  const labelError =
    fieldErrors.label ?? (submitted && !values.label.trim() ? 'Enter a label.' : undefined);

  const freeName = useMemo(() => {
    if (availability !== 'taken') return null;
    const names = new Set(roles.map((r) => r.name));
    for (let i = 2; i < 100; i++) if (!names.has(`${name}${i}`)) return `${name}${i}`;
    return null;
  }, [availability, roles, name]);

  // ── Change summary ───────────────────────────────────────────────────────────
  const added = values.permissionIds.filter((id) => !originalIds.has(id));
  const removed = [...originalIds].filter((id) => !selected.has(id));
  const labelChanged = values.label.trim() !== original.label;
  const descriptionChanged = values.description.trim() !== original.description;
  const hasChanges = labelChanged || descriptionChanged || added.length > 0 || removed.length > 0;
  const resources = resourcesCovered(values.permissionIds, groups);

  const submit = async () => {
    setSubmitted(true);
    setRequestError(null);
    const label = values.label.trim();
    if (
      !label ||
      (!editing && (!name || !ROLE_NAME_PATTERN.test(name) || availability === 'taken'))
    ) {
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const patch: RoleUpdateReq = {};
        if (labelChanged) patch.label = label;
        if (descriptionChanged) patch.description = values.description.trim();
        if (added.length || removed.length) patch.permissions = values.permissionIds;
        await adminApi.updateRole(editing.id, patch);
        toast.success(`${label} saved`);
      } else {
        await adminApi.createRole({
          name,
          label,
          description: values.description.trim(),
          permissions: values.permissionIds,
        });
        toast.success(`${label} created`);
      }
      onSaved();
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setRequestError(parsed.general ?? 'Couldn’t save the role. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const nameSuffix =
    availability === 'checking' ? (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Checking
      </span>
    ) : availability === 'available' ? (
      <span className="flex items-center gap-1 text-xs font-medium text-success">
        <Check className="h-3.5 w-3.5" aria-hidden />
        Available
      </span>
    ) : undefined;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="border-b border-border px-6 py-5 pr-12">
        <SheetTitle className="font-display text-xl font-semibold">
          {editing ? `Edit ${editing.label}` : 'New role'}
        </SheetTitle>
        <SheetDescription className="mt-1 text-[13px]">
          {editing
            ? 'Changes apply to every user with this role.'
            : 'Group the permissions a job needs, then assign the role to users.'}
        </SheetDescription>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <FormField
          id="role-label"
          label="Label"
          required
          value={values.label}
          onChange={(v) => set('label', v)}
          error={labelError}
          changed={!!editing && labelChanged}
          hint="Shown to admins when assigning roles."
          placeholder="Auction Manager"
        />

        <FormField
          id="role-name"
          label="Name"
          required={!editing}
          value={name}
          onChange={
            editing
              ? undefined
              : (v) => {
                  setNameTouched(true);
                  set('name', v);
                }
          }
          readOnly={!!editing}
          error={nameError}
          suffix={
            editing ? (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            ) : (
              nameSuffix
            )
          }
          inputClassName="font-mono text-[13.5px]"
          placeholder="auction.manager"
          hint={
            editing
              ? 'Used by the system. It can’t be changed.'
              : 'Generated from the label. Lowercase, dot-separated, used by the system. It can’t be changed later.'
          }
        >
          {(takenRole || freeName) && (
            <div className="flex flex-wrap gap-3 text-[13px]">
              {takenRole && (
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                  onClick={() => onOpenRole(takenRole)}
                >
                  Open “{takenRole.label}”
                </button>
              )}
              {freeName && (
                <button
                  type="button"
                  className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    setNameTouched(true);
                    set('name', freeName);
                  }}
                >
                  Use {freeName}
                </button>
              )}
            </div>
          )}
        </FormField>

        <div className="space-y-1.5">
          <Label htmlFor="role-description">
            Description
            <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
          </Label>
          <textarea
            id="role-description"
            rows={2}
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What this role is for, e.g. runs day-to-day auctions"
            className={cn(
              'flex w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              editing && descriptionChanged && 'border-primary',
            )}
          />
        </div>

        <div className="border-t border-border" />

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex-[1_1_200px]">
            <h3 className="text-base font-semibold text-foreground">Permissions</h3>
            <p className="text-[13px] text-muted-foreground">
              <b className="tabular-nums text-foreground">{values.permissionIds.length}</b> of{' '}
              {totalPermissions} selected
            </p>
          </div>
          {!editing && roles.length > 0 && (
            <select
              aria-label="Start from an existing role"
              value=""
              onChange={(e) => {
                const role = roles.find((r) => r.id === e.target.value);
                if (role)
                  set(
                    'permissionIds',
                    (role.permissions ?? []).map((p) => p.id),
                  );
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Start from a role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter, e.g. banks"
            aria-label="Filter permissions"
            className="h-9 pl-9"
          />
        </div>

        <PermissionMatrix
          groups={groups}
          selected={selected}
          onSet={setPermissions}
          original={editing ? originalIds : undefined}
          query={filter}
        />
        <p className="text-[12.5px] text-muted-foreground">
          Grouped by resource from the permission names. Anything that doesn’t fit appears under
          “Other”.
        </p>

        {requestError && <ErrorAlert message={requestError} />}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-3.5">
        <div className="min-w-0 flex-[1_1_200px] text-[13px] text-muted-foreground">
          {editing ? (
            <ChangeSummary
              added={added.length}
              removed={removed.length}
              details={hasChanges}
              changedResources={resourcesCovered([...added, ...removed], groups)}
            />
          ) : values.permissionIds.length > 0 ? (
            `${plural(values.permissionIds.length, 'permission')} across ${plural(resources.length, 'resource')}`
          ) : (
            'No permissions selected yet'
          )}
        </div>
        {editing ? (
          <>
            <Button
              type="button"
              variant="ghost"
              disabled={saving || !hasChanges}
              onClick={() => {
                setValues(original);
                setFieldErrors({});
                setSubmitted(false);
              }}
            >
              Discard
            </Button>
            <SaveButton saving={saving} label="Save changes" disabled={!hasChanges} />
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <SaveButton saving={saving} label="Create role" savingLabel="Creating…" />
          </>
        )}
      </div>
    </form>
  );
}

function ChangeSummary({
  added,
  removed,
  details,
  changedResources,
}: {
  added: number;
  removed: number;
  details: boolean;
  changedResources: string[];
}) {
  if (!details) return <>No unsaved changes</>;
  if (!added && !removed) return <>Unsaved changes to the details</>;
  return (
    <span className="flex flex-wrap gap-x-2.5 gap-y-0.5">
      {added > 0 && <span className="font-semibold text-success">+{added} added</span>}
      {removed > 0 && <span className="font-semibold text-destructive">−{removed} removed</span>}
      {changedResources.length > 0 && (
        <span className="truncate">{changedResources.join(', ')}</span>
      )}
    </span>
  );
}
