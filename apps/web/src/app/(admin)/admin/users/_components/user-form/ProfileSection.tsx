'use client';

import { AvatarUpload } from '@/components/common/admin/AvatarUpload';
import { FormField } from '@/components/common/admin/FormField';
import { FormSection } from '@/components/common/admin/FormSection';
import type { UsernameAvailability } from '../../_hooks/useUsernameAvailability';
import type { UserFormState } from '../../_hooks/useUserForm';
import type { UserFormMode } from '../../_lib/user-form';
import { UsernameField } from './UsernameField';

interface ProfileSectionProps {
  form: UserFormState;
  mode: UserFormMode;
  usernameAvailability: UsernameAvailability;
}

function initialsOf(firstName: string, lastName: string): string | undefined {
  return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`.toUpperCase() || undefined;
}

export function ProfileSection({ form, mode, usernameAvailability }: ProfileSectionProps) {
  const { values, setField } = form;
  return (
    <FormSection
      title="Profile"
      description={
        mode === 'create'
          ? 'Name and username shown across the app.'
          : 'Name and photo shown across the app.'
      }
    >
      <AvatarUpload
        value={values.profilePicture}
        onChange={(v) => setField('profilePicture', v)}
        fallbackText={initialsOf(values.firstName, values.lastName)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          {...form.textField('firstName')}
          required
          autoComplete="given-name"
          placeholder="Rajveer"
        />
        <FormField
          {...form.textField('lastName')}
          required
          autoComplete="family-name"
          placeholder="Singh"
        />
      </div>
      {mode === 'create' ? (
        <UsernameField form={form} availability={usernameAvailability} />
      ) : (
        <FormField
          {...form.textField('username')}
          onChange={undefined}
          readOnly
          prefix="@"
          hint="Usernames can’t be changed after the account is created."
        />
      )}
    </FormSection>
  );
}
