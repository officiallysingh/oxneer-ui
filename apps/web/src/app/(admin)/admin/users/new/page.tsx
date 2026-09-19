'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi, UserCreationReq, adminApi, type RoleVM, type PermissionVM } from '@repo/api';
import { ArrowLeft } from 'lucide-react';
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
import { USERNAME_RULES } from '@/lib/validation';

function initialsOf(firstName: string, lastName: string): string | undefined {
  return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`.toUpperCase() || undefined;
}

interface NewUserFormValues {
  username: string;
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

const EMPTY_FORM: NewUserFormValues = {
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  mobile: '',
  profilePicture: undefined,
  enabled: true,
  askToVerifyEmail: false,
  askToVerifyMobile: false,
  promptChangePwd: true,
  selectedRoles: [],
  selectedPerms: [],
};

export default function NewUserPage() {
  const router = useRouter();
  const [form, setForm] = useState<NewUserFormValues>(EMPTY_FORM);
  const [allRoles, setAllRoles] = useState<RoleVM[]>([]);
  const [availablePerms, setAvailablePerms] = useState<PermissionVM[]>([]);
  const { fieldErrors, setFieldErrors, clearErr, resetFieldErrors } = useFieldErrors();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof NewUserFormValues>(key: K, value: NewUserFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    Promise.all([adminApi.getRoles(), adminApi.getPermissions()])
      .then(([roles, permissions]) => {
        setAllRoles(roles);
        setAvailablePerms(permissions);
      })
      .catch(() => {
        /* roles/perms are optional — page still usable */
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    resetFieldErrors();
    setSaving(true);
    try {
      const payload: UserCreationReq = {
        username: form.username.trim(),
        emailId: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mobileNo: form.mobile.trim() || undefined,
        profilePicture: form.profilePicture,
        enabled: form.enabled,
        emailIdVerified: !form.askToVerifyEmail,
        mobileNoVerified: !form.askToVerifyMobile,
        credentialsNonExpired: !form.promptChangePwd,
        promptChangePassword: form.promptChangePwd,
        accountNonLocked: true,
        accountNonExpired: true,
        roles: form.selectedRoles.length ? form.selectedRoles : undefined,
        permissions: form.selectedPerms.length ? form.selectedPerms : undefined,
      };
      await usersApi.createUser(payload);
      router.push('/admin/users');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add user"
        description="Create a new user account"
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
          <FormField
            id="username"
            label="Username"
            required
            value={form.username}
            onChange={(v) => {
              setField('username', v);
              clearErr('username');
            }}
            placeholder="rajveer.singh"
            error={fieldErrors.username}
            tip={USERNAME_RULES}
          />
          <FormField
            id="email"
            label="Email"
            type="email"
            required
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
              required
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
              required
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
              onChange={(ids) => setField('selectedPerms', ids)}
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
          <SaveButton saving={saving} label="Create user" savingLabel="Saving..." />
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
