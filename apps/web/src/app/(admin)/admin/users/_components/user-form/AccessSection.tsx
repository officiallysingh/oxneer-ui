'use client';

import { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { PermissionVM, RoleVM } from '@repo/api';
import { Label } from '@repo/ui';
import { ChangedDot } from '@/components/common/admin/ChangedDot';
import { FormSection } from '@/components/common/admin/FormSection';
import { MultiSelect } from '@/components/common/admin/MultiSelect';
import type { CheckListOption } from '@/components/common/admin/SearchableCheckList';
import type { UserFormState } from '../../_hooks/useUserForm';
import {
  DIRECT_SOURCE,
  effectivePermissions,
  redundantDirectPermissions,
} from '../../_lib/effective-permissions';
import { fieldId, FIELD_LABELS } from '../../_lib/user-form';

interface AccessSectionProps {
  form: UserFormState;
  roles: RoleVM[];
  permissions: PermissionVM[];
  roleOptions: CheckListOption[];
  permissionOptions: CheckListOption[];
}

/** Section id used by "Manage access" links (`/edit#access`). */
export const ACCESS_SECTION_ID = 'access';

export function AccessSection({
  form,
  roles,
  permissions,
  roleOptions,
  permissionOptions,
}: AccessSectionProps) {
  const { values, setField, isChanged } = form;

  const effective = useMemo(
    () => effectivePermissions(values.roles, values.permissions, roles, permissions),
    [values.roles, values.permissions, roles, permissions],
  );
  const redundant = redundantDirectPermissions(effective);

  return (
    <FormSection
      id={ACCESS_SECTION_ID}
      title="Access"
      description="Roles bundle permissions. Add individual permissions only for exceptions."
    >
      <PickerField
        field="roles"
        changed={isChanged('roles')}
        options={roleOptions}
        value={values.roles}
        onChange={(v) => setField('roles', v)}
        placeholder="Add role…"
        noun="roles"
      />
      <PickerField
        field="permissions"
        changed={isChanged('permissions')}
        options={permissionOptions}
        value={values.permissions}
        onChange={(v) => setField('permissions', v)}
        placeholder="Add permission…"
        noun="permissions"
        hint={
          redundant.length > 0
            ? `${redundant.map((p) => `“${p.label}”`).join(', ')} ${redundant.length === 1 ? 'is' : 'are'} also granted by a selected role, so you can remove ${redundant.length === 1 ? 'it' : 'them'} here.`
            : undefined
        }
      />

      {effective.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-lg border border-info/35 bg-info/[0.06] px-4 py-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-info" aria-hidden />
            This user will be able to use {effective.length}{' '}
            {effective.length === 1 ? 'permission' : 'permissions'}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {effective.map((p) => (
              <li
                key={p.id}
                className="inline-flex h-[22px] items-center gap-1 rounded-full border border-border px-2.5 text-xs font-medium"
              >
                {p.label}
                <span className="font-normal text-muted-foreground">
                  · {p.sources.map((s) => (s === DIRECT_SOURCE ? 'direct' : s)).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </FormSection>
  );
}

interface PickerFieldProps {
  field: 'roles' | 'permissions';
  changed: boolean;
  options: CheckListOption[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  noun: string;
  hint?: string;
}

function PickerField({
  field,
  changed,
  options,
  value,
  onChange,
  placeholder,
  noun,
  hint,
}: PickerFieldProps) {
  const id = fieldId(field);
  return (
    <div id={`${id}-field`} className="space-y-1.5 scroll-mt-24">
      <Label id={`${id}-label`}>
        {FIELD_LABELS[field]}
        <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
        {changed && <ChangedDot />}
      </Label>
      <MultiSelect
        id={id}
        ariaLabelledBy={`${id}-label`}
        options={options}
        value={value}
        onChange={onChange}
        changed={changed}
        placeholder={placeholder}
        searchPlaceholder={`Search ${noun}...`}
        emptyMessage={`No ${noun} found`}
      />
      {hint && <p className="text-[12.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
