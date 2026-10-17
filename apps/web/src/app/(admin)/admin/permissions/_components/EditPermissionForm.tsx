'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy } from 'lucide-react';
import { adminApi, type PermissionUpdateReq, type PermissionVM, type RoleVM } from '@repo/api';
import { Button, toast } from '@repo/ui';
import { ChangedDot } from '@/components/common/admin/ChangedDot';
import { FormField } from '@/components/common/admin/FormField';
import { SaveButton } from '@/components/common/admin/SaveButton';
import { parseApiError } from '@/lib/api-errors';
import { copyText } from '@/lib/clipboard';
import { roleEditHref } from '../_lib/permission-usage';
import { PermissionSheetFrame } from './PermissionSheetFrame';

const FORM_ID = 'edit-permission-form';

interface EditPermissionFormProps {
  permission: PermissionVM;
  /** Roles that include this permission. */
  usedBy: RoleVM[];
  onClose: () => void;
  onSaved: () => void;
}

/** Edit a permission's label and description; the name is fixed. Shows where it's used. */
export function EditPermissionForm({
  permission,
  usedBy,
  onClose,
  onSaved,
}: EditPermissionFormProps) {
  const original = { label: permission.label, description: permission.description ?? '' };
  const [label, setLabel] = useState(original.label);
  const [description, setDescription] = useState(original.description);
  const [labelError, setLabelError] = useState<string | undefined>();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelChanged = label.trim() !== original.label;
  const descriptionChanged = description.trim() !== original.description;
  const changes = [labelChanged && 'Label', descriptionChanged && 'Description'].filter(Boolean);

  const submit = async () => {
    setGeneralError(null);
    if (!label.trim()) {
      setLabelError('Label is required');
      return;
    }
    const patch: PermissionUpdateReq = {};
    if (labelChanged) patch.label = label.trim();
    if (descriptionChanged) patch.description = description.trim();

    setSaving(true);
    try {
      await adminApi.updatePermission(permission.id, patch);
      toast.success('Permission updated');
      onSaved();
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.fieldErrors.label) setLabelError(parsed.fieldErrors.label);
      else setGeneralError(parsed.general ?? 'Couldn’t save the permission. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionSheetFrame
      title={`Edit ${permission.label}`}
      description="Label and description changes show everywhere this permission appears."
      formId={FORM_ID}
      onSubmit={submit}
      footer={
        <>
          <span className="flex min-w-0 flex-[1_1_160px] items-center gap-1.5 text-[13px]">
            {changes.length > 0 ? (
              <>
                <ChangedDot className="" />
                {changes.join(', ')} changed
              </>
            ) : (
              <span className="text-muted-foreground">No unsaved changes</span>
            )}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setLabel(original.label);
              setDescription(original.description);
              setLabelError(undefined);
            }}
            disabled={saving || changes.length === 0}
          >
            Discard
          </Button>
          <SaveButton
            form={FORM_ID}
            saving={saving}
            label="Save changes"
            disabled={changes.length === 0}
          />
        </>
      }
    >
      <FormField
        id="perm-name"
        label="Name"
        value={permission.name}
        readOnly
        inputClassName="font-mono text-[13px]"
        hint="Used in code, so it can’t be changed."
        suffix={
          <button
            type="button"
            onClick={() => copyText(permission.name)}
            aria-label="Copy name"
            className="text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        }
      />
      <FormField
        id="perm-edit-label"
        label="Label"
        required
        value={label}
        onChange={(v) => {
          setLabel(v);
          setLabelError(undefined);
        }}
        error={labelError}
        changed={labelChanged}
      />
      <FormField
        id="perm-edit-description"
        label="Description"
        optional
        value={description}
        onChange={setDescription}
        changed={descriptionChanged}
      />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">
          {usedBy.length === 0
            ? 'Not in any role'
            : `Included in ${usedBy.length} ${usedBy.length === 1 ? 'role' : 'roles'}`}
        </h3>
        {usedBy.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">
            Only usable by assigning it to a user directly.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {usedBy.map((role) => (
              <li key={role.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <span className="flex-1 font-medium">{role.label}</span>
                <span className="text-[12.5px] text-muted-foreground">
                  {role.permissions?.length ?? 0} permissions
                </span>
                <Link
                  href={roleEditHref(role)}
                  className="text-[13px] font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open role
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {generalError && (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      )}
    </PermissionSheetFrame>
  );
}
