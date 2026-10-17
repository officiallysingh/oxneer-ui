'use client';

import { useMemo, useState } from 'react';
import { Check, Info, Loader2 } from 'lucide-react';
import { adminApi, type PermissionVM } from '@repo/api';
import { Badge, Button, Label, toast } from '@repo/ui';
import { FormField } from '@/components/common/admin/FormField';
import { SaveButton } from '@/components/common/admin/SaveButton';
import { SegmentedControl, type SegmentOption } from '@/components/common/admin/SegmentedControl';
import { useNameAvailability } from '@/hooks/admin';
import { parseApiError } from '@/lib/api-errors';
import { ACTION_LABELS, ACTIONS, type ResourceGroup } from '@/lib/access/permission-matrix';
import { PERMISSION_NAME_PATTERN } from '@/lib/validation';
import {
  buildName,
  emptyNewPermission,
  suggestLabel,
  takenActions,
  validateNewPermission,
  type ActionChoice,
  type NewPermissionErrors,
  type NewPermissionValues,
} from '../_lib/permission-form';
import { PermissionSheetFrame } from './PermissionSheetFrame';

const NEW_RESOURCE = '__new__';
const FORM_ID = 'create-permission-form';

interface CreatePermissionFormProps {
  /** Pre-selected resource prefix, e.g. when adding from a group. */
  initialResourceKey?: string;
  groups: ResourceGroup[];
  permissions: PermissionVM[];
  onClose: () => void;
  onSaved: () => void;
}

/** "Add permission": pick a resource and an action; the name is built from them. */
export function CreatePermissionForm({
  initialResourceKey,
  groups,
  permissions,
  onClose,
  onSaved,
}: CreatePermissionFormProps) {
  const [values, setValues] = useState(() => emptyNewPermission(initialResourceKey));
  const [errors, setErrors] = useState<NewPermissionErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saving, setSaving] = useState<'save' | 'another' | null>(null);

  const resourceGroups = useMemo(() => groups.filter((g) => g.key), [groups]);
  const existingNames = useMemo(() => new Set(permissions.map((p) => p.name)), [permissions]);
  const group = values.newResource
    ? undefined
    : resourceGroups.find((g) => g.key === values.resourceKey);
  const taken = takenActions(group);

  const name = buildName(values, permissions);
  const takenLocally = !!name && existingNames.has(name);
  const availability = useNameAvailability(name, {
    check: adminApi.checkPermissionNameExists,
    pattern: PERMISSION_NAME_PATTERN,
    enabled: !takenLocally,
  });
  const nameTaken = takenLocally || availability === 'taken';

  /** Updates values; the label follows the suggestion until the user edits it. */
  const update = (patch: Partial<NewPermissionValues>, clear: (keyof NewPermissionErrors)[]) => {
    setValues((prev) => {
      const next = { ...prev, ...patch };
      if (!next.labelEdited) {
        const label = next.newResource
          ? next.resourceLabel.trim()
          : (resourceGroups.find((g) => g.key === next.resourceKey)?.label ?? '');
        next.label = suggestLabel(next, label);
      }
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      clear.forEach((k) => delete next[k]);
      return next;
    });
  };

  const actionOptions: SegmentOption<ActionChoice>[] = [
    ...ACTIONS.map((a) => ({
      value: a,
      label: ACTION_LABELS[a],
      disabled: taken.has(a),
      title: taken.has(a) ? 'Already exists' : undefined,
    })),
    { value: 'other', label: 'Other…' },
  ];
  const allCrudTaken = ACTIONS.every((a) => taken.has(a));

  const submit = async (addAnother: boolean) => {
    setGeneralError(null);
    const found = validateNewPermission(values, name, existingNames);
    if (availability === 'taken' && !found.customAction)
      found.customAction = `${name} already exists`;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(addAnother ? 'another' : 'save');
    try {
      await adminApi.createPermission({
        name,
        label: values.label.trim(),
        description: values.description.trim(),
      });
      toast.success(`${values.label.trim()} created`);
      onSaved();
      if (addAnother) {
        // Keep the resource so related actions can be added in a row.
        setValues(emptyNewPermission(values.newResource ? '' : values.resourceKey));
      } else {
        onClose();
      }
    } catch (err) {
      const parsed = parseApiError(err);
      const fieldErrors: NewPermissionErrors = {};
      if (parsed.fieldErrors.name) fieldErrors.customAction = parsed.fieldErrors.name;
      if (parsed.fieldErrors.label) fieldErrors.label = parsed.fieldErrors.label;
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0)
        setGeneralError(parsed.general ?? 'Couldn’t create the permission. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <PermissionSheetFrame
      title="Add permission"
      description="Choose what it applies to and the action. We’ll build the name."
      formId={FORM_ID}
      onSubmit={() => submit(false)}
      footer={
        <>
          <span className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose} disabled={!!saving}>
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={() => submit(true)} disabled={!!saving}>
            {saving === 'another' && <Loader2 className="animate-spin" />}
            Create &amp; add another
          </Button>
          <SaveButton
            form={FORM_ID}
            saving={saving === 'save'}
            label="Create permission"
            savingLabel="Creating…"
            disabled={!!saving}
          />
        </>
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="perm-resource" className={errors.resourceKey ? 'text-destructive' : ''}>
          Resource<span className="ml-0.5 text-destructive">*</span>
        </Label>
        <select
          id="perm-resource"
          value={values.newResource ? NEW_RESOURCE : values.resourceKey}
          onChange={(e) => {
            const v = e.target.value;
            update(
              v === NEW_RESOURCE
                ? { newResource: true, resourceKey: '', action: null }
                : { newResource: false, resourceKey: v, action: null },
              ['resourceKey', 'action', 'customAction'],
            );
          }}
          aria-invalid={!!errors.resourceKey && !values.newResource}
          className={`h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring ${errors.resourceKey && !values.newResource ? 'border-destructive' : 'border-input'}`}
        >
          <option value="">Select a resource…</option>
          {resourceGroups.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label} — {g.key}
            </option>
          ))}
          <option value={NEW_RESOURCE}>New resource…</option>
        </select>
        {!values.newResource && errors.resourceKey && (
          <p className="text-xs font-medium text-destructive">{errors.resourceKey}</p>
        )}
        <p className="text-[12.5px] text-muted-foreground">
          Pick an existing resource, or choose “New resource…” at the bottom of the list.
        </p>
      </div>

      {values.newResource && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="perm-resource-label"
            label="Resource name"
            required
            value={values.resourceLabel}
            onChange={(v) => update({ resourceLabel: v }, ['resourceLabel'])}
            error={errors.resourceLabel}
            placeholder="Invoices"
          />
          <FormField
            id="perm-resource-key"
            label="Resource key"
            required
            value={values.resourceKey}
            onChange={(v) => update({ resourceKey: v.toLowerCase() }, ['resourceKey'])}
            error={errors.resourceKey}
            placeholder="billing.invoices"
            inputClassName="font-mono text-[13.5px]"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <span id="perm-action-label" className="text-sm font-medium">
          Action<span className="ml-0.5 text-destructive">*</span>
        </span>
        <SegmentedControl
          label="Action"
          options={actionOptions}
          value={values.action}
          onChange={(action) => update({ action }, ['action', 'customAction'])}
          className="flex w-full sm:w-auto"
        />
        {errors.action && <p className="text-xs font-medium text-destructive">{errors.action}</p>}
        {group && taken.size > 0 && (
          <p className="text-[12.5px] text-muted-foreground">
            {allCrudTaken
              ? `View, Create, Update and Delete already exist for ${group.label}.`
              : `${[...taken].map((a) => ACTION_LABELS[a]).join(', ')} already ${taken.size === 1 ? 'exists' : 'exist'} for ${group.label}.`}
          </p>
        )}
        {values.action === 'other' && (
          <FormField
            id="perm-custom-action"
            label="Custom action"
            value={values.customAction}
            onChange={(v) => update({ customAction: v.toLowerCase() }, ['customAction'])}
            error={errors.customAction}
            placeholder="export"
            inputClassName="font-mono text-[13.5px]"
          />
        )}
        {values.action !== 'other' && errors.customAction && (
          <p className="text-xs font-medium text-destructive">{errors.customAction}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 rounded-md bg-muted/60 px-3.5 py-3">
        <span className="text-[12.5px] text-muted-foreground">Name</span>
        <div className="flex flex-wrap items-center gap-2.5">
          <code className="font-mono text-sm font-semibold">{name || '—'}</code>
          {PERMISSION_NAME_PATTERN.test(name) && (
            <NameStatus taken={nameTaken} checking={availability === 'checking'} />
          )}
        </div>
        <span className="text-[12.5px] text-muted-foreground">
          Used in code. It can’t be changed after creation.
        </span>
      </div>

      <FormField
        id="perm-label"
        label="Label"
        required
        value={values.label}
        onChange={(v) => update({ label: v, labelEdited: true }, ['label'])}
        error={errors.label}
        hint={values.labelEdited ? undefined : 'Suggested from the action and resource.'}
      />
      <FormField
        id="perm-description"
        label="Description"
        optional
        value={values.description}
        onChange={(v) => update({ description: v }, [])}
      />

      {group && (
        <>
          <div className="h-px bg-border" />
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline">
              <h3 className="flex-1 text-sm font-semibold">Already in {group.label}</h3>
              <span className="text-[12.5px] text-muted-foreground">
                {group.permissions.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.permissions.map((p) => (
                <Badge key={p.id} variant="outline" className="font-medium">
                  {p.label}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex gap-3 rounded-lg border border-info/35 bg-info/[0.06] px-3.5 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
        <p className="text-[13px]">
          A new permission does nothing until the backend checks for it, and no one has it until you
          add it to a role or a user.
        </p>
      </div>

      {generalError && (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      )}
    </PermissionSheetFrame>
  );
}

function NameStatus({ taken, checking }: { taken: boolean; checking: boolean }) {
  if (taken)
    return <span className="text-[12.5px] font-medium text-destructive">Already exists</span>;
  if (checking)
    return (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Checking" />
    );
  return (
    <span className="flex items-center gap-1 text-[12.5px] font-medium text-success">
      <Check className="h-3.5 w-3.5" aria-hidden />
      Unique
    </span>
  );
}
