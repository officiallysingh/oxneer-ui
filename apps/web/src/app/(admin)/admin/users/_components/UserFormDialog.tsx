'use client';

import React, { useEffect, useState } from 'react';
import { usersApi, type UserDetailVM } from '@repo/api';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { FormField } from '@/components/common/admin/FormField';
import { ToggleField } from '@/components/common/admin/ToggleField';
import { SaveButton } from '@/components/common/admin/SaveButton';
import { useFieldErrors } from '@/components/common/admin/useFieldErrors';
import { AvatarUpload } from '@/components/common/admin/AvatarUpload';
import { parseApiError } from '@/lib/api-errors';
import { resolvesExists } from '@/lib/exists-check';

// ── helpers ───────────────────────────────────────────────────────────────────

function initialsOf(firstName: string, lastName: string): string | undefined {
  return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`.toUpperCase() || undefined;
}

// ── Create Dialog ─────────────────────────────────────────────────────────────

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface CreateUserFormValues {
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
}

const EMPTY_CREATE_FORM: CreateUserFormValues = {
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
};

export function CreateUserDialog({ open, onOpenChange, onCreated }: CreateUserDialogProps) {
  const [form, setForm] = useState<CreateUserFormValues>(EMPTY_CREATE_FORM);
  const { fieldErrors, setFieldErrors, clearErr, resetFieldErrors } = useFieldErrors();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof CreateUserFormValues>(key: K, value: CreateUserFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm(EMPTY_CREATE_FORM);
    resetFieldErrors();
    setError(null);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    resetFieldErrors();
    if (
      !form.username.trim() ||
      !form.email.trim() ||
      !form.firstName.trim() ||
      !form.lastName.trim()
    ) {
      setError('Username, email, first name and last name are required.');
      return;
    }
    setSaving(true);
    try {
      await usersApi.createUser({
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
      });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>Create a new user in the system.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <AvatarUpload
            value={form.profilePicture}
            onChange={(v) => setField('profilePicture', v)}
            fallbackText={initialsOf(form.firstName, form.lastName)}
          />
          <FormField
            id="cu-username"
            label="Username"
            required
            value={form.username}
            onChange={(v) => {
              setField('username', v);
              clearErr('username');
            }}
            onBlur={async (v) => {
              if (!v.trim()) return;
              const taken = await resolvesExists(usersApi.checkUsernameExists(v.trim()));
              if (taken) setFieldErrors((p) => ({ ...p, username: 'This username is taken.' }));
            }}
            placeholder="rajveer.singh"
            error={fieldErrors.username}
          />
          <FormField
            id="cu-email"
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(v) => {
              setField('email', v);
              clearErr('emailId');
            }}
            onBlur={async (v) => {
              if (!v.trim()) return;
              const taken = await resolvesExists(usersApi.checkEmailExists(v.trim()));
              if (taken)
                setFieldErrors((p) => ({ ...p, emailId: 'This email is already registered.' }));
            }}
            placeholder="abc@xyz.com"
            error={fieldErrors.emailId}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="cu-first"
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
              id="cu-last"
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
            id="cu-mobile"
            label="Mobile"
            value={form.mobile}
            onChange={(v) => {
              setField('mobile', v);
              clearErr('mobileNo');
            }}
            onBlur={async (v) => {
              if (!v.trim()) return;
              const taken = await resolvesExists(usersApi.checkMobileExists(v.trim()));
              if (taken)
                setFieldErrors((p) => ({
                  ...p,
                  mobileNo: 'This mobile number is already in use.',
                }));
            }}
            placeholder="7082690057"
            error={fieldErrors.mobileNo}
            optional
          />

          <div className="rounded-lg border border-border bg-muted/30 px-4 py-2 space-y-1 divide-y divide-border">
            <ToggleField
              label="Enabled"
              value={form.enabled}
              onChange={(v) => setField('enabled', v)}
              description="User can log in"
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
              value={form.promptChangePwd}
              onChange={(v) => setField('promptChangePwd', v)}
              description="User must change password on next login"
            />
          </div>

          {error && <ErrorAlert message={error} />}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <SaveButton saving={saving} label="Create user" savingLabel="Saving" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────

interface EditUserDialogProps {
  user: UserDetailVM | null;
  onClose: () => void;
  onUpdated: (updated: Partial<UserDetailVM>) => void;
}

interface EditUserFormValues {
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  profilePicture: string | undefined;
}

export function EditUserDialog({ user, onClose, onUpdated }: EditUserDialogProps) {
  const [form, setForm] = useState<EditUserFormValues>({
    email: '',
    firstName: '',
    lastName: '',
    mobile: '',
    profilePicture: undefined,
  });
  const { fieldErrors, setFieldErrors, clearErr, resetFieldErrors } = useFieldErrors();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof EditUserFormValues>(key: K, value: EditUserFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (user) {
      setForm({
        email: user.emailId ?? '',
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        mobile: user.mobileNo ?? '',
        profilePicture: user.profilePicture ?? undefined,
      });
      resetFieldErrors();
      setError(null);
    }
  }, [user, resetFieldErrors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    resetFieldErrors();
    setSaving(true);
    try {
      const pictureChanged = form.profilePicture !== (user.profilePicture ?? undefined);
      await usersApi.updateUser(user.id, {
        emailId: form.email.trim() || undefined,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        mobileNo: form.mobile.trim() || undefined,
        ...(pictureChanged ? { profilePicture: form.profilePicture ?? null } : {}),
      });
      onUpdated({
        emailId: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mobileNo: form.mobile.trim(),
        ...(pictureChanged ? { profilePicture: form.profilePicture ?? null } : {}),
      });
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!user}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update details for{' '}
            <span className="font-medium text-foreground">{user?.username ?? user?.emailId}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <AvatarUpload
            value={form.profilePicture}
            onChange={(v) => setField('profilePicture', v)}
            fallbackText={initialsOf(form.firstName, form.lastName)}
          />
          <FormField
            id="eu-email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => {
              setField('email', v);
              clearErr('emailId');
            }}
            onBlur={async (v) => {
              if (!v.trim() || v.trim() === (user?.emailId ?? '')) return;
              const taken = await resolvesExists(usersApi.checkEmailExists(v.trim()));
              if (taken)
                setFieldErrors((p) => ({ ...p, emailId: 'This email is already registered.' }));
            }}
            placeholder="abc@xyz.com"
            error={fieldErrors.emailId}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="eu-first"
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
              id="eu-last"
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
            id="eu-mobile"
            label="Mobile"
            value={form.mobile}
            onChange={(v) => {
              setField('mobile', v);
              clearErr('mobileNo');
            }}
            onBlur={async (v) => {
              if (!v.trim() || v.trim() === (user?.mobileNo ?? '')) return;
              const taken = await resolvesExists(usersApi.checkMobileExists(v.trim()));
              if (taken)
                setFieldErrors((p) => ({
                  ...p,
                  mobileNo: 'This mobile number is already in use.',
                }));
            }}
            placeholder="7082690057"
            error={fieldErrors.mobileNo}
          />
          {error && <ErrorAlert message={error} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <SaveButton saving={saving} label="Save changes" savingLabel="Saving" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
