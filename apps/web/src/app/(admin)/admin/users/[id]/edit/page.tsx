'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  usersApi,
  adminApi,
  type RoleVM,
  type PermissionVM,
  type UserDetailVM,
  type UserUpdateReq,
} from '@repo/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { FormField } from '@/components/common/admin/FormField';
import { ToggleField } from '@/components/common/admin/ToggleField';
import { SaveButton } from '@/components/common/admin/SaveButton';
import { useFieldErrors } from '@/hooks/admin/useFieldErrors';
import { MultiSelect } from '@/components/common/admin/MultiSelect';
import { AvatarUpload } from '@/components/common/admin/AvatarUpload';
import { parseApiError } from '@/lib/api-errors';

function initialsOf(firstName: string, lastName: string): string | undefined {
  return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`.toUpperCase() || undefined;
}

interface UserFormValues {
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  profilePicture: string | undefined;
  enabled: boolean;
  askToVerifyEmail: boolean;
  askToVerifyMobile: boolean;
  promptChangePwd: boolean;
  selectedRoles: string[];
  selectedPerms: string[];
}

const EMPTY_FORM: UserFormValues = {
  email: '',
  firstName: '',
  lastName: '',
  mobile: '',
  profilePicture: undefined,
  enabled: true,
  askToVerifyEmail: false,
  askToVerifyMobile: false,
  promptChangePwd: false,
  selectedRoles: [],
  selectedPerms: [],
};

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const originalRef = useRef<UserDetailVM | null>(null);
  const originalRolesRef = useRef<string[]>([]);
  const originalPermsRef = useRef<string[]>([]);

  const [form, setForm] = useState<UserFormValues>(EMPTY_FORM);
  const setField = useCallback(
    <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const [allRoles, setAllRoles] = useState<RoleVM[]>([]);
  const [availablePerms, setAvailablePerms] = useState<PermissionVM[]>([]);
  const { fieldErrors, setFieldErrors, clearErr, resetFieldErrors } = useFieldErrors();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    Promise.all([
      usersApi.getUserById(id, ['roles', 'permissions']),
      adminApi.getRoles(),
      adminApi.getPermissions(),
    ])
      .then(([u, roles, permissions]) => {
        originalRef.current = u;
        setUsername(u.username ?? '');
        const roleIds = (u.roles ?? []).map((g) => g.id);
        const permIds = (u.permissions ?? []).map((a) => a.id);
        const permIdSet = new Set(permissions.map((p) => p.id));
        setForm({
          email: u.emailId ?? '',
          firstName: u.firstName ?? '',
          lastName: u.lastName ?? '',
          mobile: u.mobileNo ?? '',
          profilePicture: u.profilePicture ?? undefined,
          enabled: u.enabled,
          askToVerifyEmail: !u.emailIdVerified,
          askToVerifyMobile: !u.mobileNoVerified,
          promptChangePwd: u.promptChangePassword,
          selectedRoles: roleIds,
          selectedPerms: permIds.filter((pid) => permIdSet.has(pid)),
        });
        setAllRoles(roles);
        setAvailablePerms(permissions);
        originalRolesRef.current = roleIds;
        originalPermsRef.current = permIds;
      })
      .catch(() => setError('Failed to load user.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    resetFieldErrors();
    const orig = originalRef.current;
    if (!orig) return;

    const patch: UserUpdateReq = {};
    if (form.email.trim() !== (orig.emailId ?? '')) patch.emailId = form.email.trim() || undefined;
    if (form.firstName.trim() !== (orig.firstName ?? ''))
      patch.firstName = form.firstName.trim() || undefined;
    if (form.lastName.trim() !== (orig.lastName ?? ''))
      patch.lastName = form.lastName.trim() || undefined;
    if (form.mobile.trim() !== (orig.mobileNo ?? ''))
      patch.mobileNo = form.mobile.trim() || undefined;
    if (form.profilePicture !== (orig.profilePicture ?? undefined))
      patch.profilePicture = form.profilePicture ?? null;
    if (form.enabled !== orig.enabled) patch.enabled = form.enabled;
    if (form.askToVerifyEmail !== !orig.emailIdVerified)
      patch.emailIdVerified = !form.askToVerifyEmail;
    if (form.askToVerifyMobile !== !orig.mobileNoVerified)
      patch.mobileNoVerified = !form.askToVerifyMobile;
    if (form.promptChangePwd !== orig.promptChangePassword)
      patch.credentialsNonExpired = !form.promptChangePwd;

    const rolesChanged =
      form.selectedRoles.length !== originalRolesRef.current.length ||
      form.selectedRoles.some((r) => !originalRolesRef.current.includes(r));
    if (rolesChanged) patch.roles = form.selectedRoles;

    const permsChanged =
      form.selectedPerms.length !== originalPermsRef.current.length ||
      form.selectedPerms.some((p) => !originalPermsRef.current.includes(p));
    if (permsChanged) patch.permissions = form.selectedPerms;

    if (Object.keys(patch).length === 0) {
      router.push('/admin/users');
      return;
    }

    setSaving(true);
    try {
      await usersApi.updateUser(id, patch);
      router.push('/admin/users');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit user"
        description={username ? `Editing: ${username}` : 'Update user details'}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Account details</h3>
          <AvatarUpload
            value={form.profilePicture}
            onChange={(v) => setField('profilePicture', v)}
            fallbackText={initialsOf(form.firstName, form.lastName)}
          />
          <FormField id="username" label="Username" value={username} disabled />
          <FormField
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => {
              setField('email', v);
              clearErr('emailId');
            }}
            placeholder="abc@xyz.com"
            error={fieldErrors.emailId}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="firstName"
              label="First name"
              value={form.firstName}
              onChange={(v) => {
                setField('firstName', v);
                clearErr('firstName');
              }}
              placeholder="Rajveer"
              error={fieldErrors.firstName}
            />
            <FormField
              id="lastName"
              label="Last name"
              value={form.lastName}
              onChange={(v) => {
                setField('lastName', v);
                clearErr('lastName');
              }}
              placeholder="Singh"
              error={fieldErrors.lastName}
            />
          </div>
          <FormField
            id="mobile"
            label="Mobile"
            value={form.mobile}
            onChange={(v) => {
              setField('mobile', v);
              clearErr('mobileNo');
            }}
            placeholder="7082690057"
            error={fieldErrors.mobileNo}
            optional
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Roles &amp; Permissions</h3>
          <div className="space-y-1.5">
            <Label>
              Roles <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <MultiSelect
              options={allRoles.map((r) => ({ value: r.id, label: r.label, sublabel: r.name }))}
              value={form.selectedRoles}
              onChange={(roles) => setField('selectedRoles', roles)}
              placeholder="Select roles..."
              searchPlaceholder="Search roles..."
              emptyMessage="No roles found"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Additional permissions{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <MultiSelect
              options={availablePerms.map((p) => ({
                value: p.id,
                label: p.label,
                sublabel: p.name,
              }))}
              value={form.selectedPerms}
              onChange={(perms) => setField('selectedPerms', perms)}
              placeholder="Select permissions..."
              searchPlaceholder="Search permissions..."
              emptyMessage="No permissions found"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-6 divide-y divide-border">
          <h3 className="text-sm font-semibold text-foreground py-4">Account settings</h3>
          <ToggleField
            label="Enabled"
            description="User can log in"
            value={form.enabled}
            onChange={(v) => setField('enabled', v)}
          />
          <ToggleField
            label="Ask to verify email"
            value={form.askToVerifyEmail}
            onChange={(v) => setField('askToVerifyEmail', v)}
          />
          <ToggleField
            label="Ask to verify mobile"
            value={form.askToVerifyMobile}
            onChange={(v) => setField('askToVerifyMobile', v)}
          />
          <ToggleField
            label="Prompt change password"
            description="User must set a new password on next login"
            value={form.promptChangePwd}
            onChange={(v) => setField('promptChangePwd', v)}
          />
        </div>

        {error && <ErrorAlert message={error} />}

        <div className="flex gap-3">
          <SaveButton saving={saving} label="Save changes" savingLabel="Saving..." />
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/users')}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
