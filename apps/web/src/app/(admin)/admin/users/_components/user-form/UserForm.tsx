'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { usersApi, type UserDetailVM } from '@repo/api';
import { Button, toast } from '@repo/ui';
import { ChangedDot } from '@/components/common/admin/ChangedDot';
import { FormErrorSummary } from '@/components/common/admin/FormErrorSummary';
import { SaveButton } from '@/components/common/admin/SaveButton';
import { StickyActionBar } from '@/components/common/admin/StickyActionBar';
import { useRolesAndPermissions } from '../../_hooks/useRolesAndPermissions';
import { useUserActions } from '../../_hooks/useUserActions';
import { useUserForm, type UserFormState } from '../../_hooks/useUserForm';
import { useUsernameAvailability } from '../../_hooks/useUsernameAvailability';
import { isSuperAdmin, plural } from '../../_lib/user-display';
import {
  EMPTY_USER_FORM,
  FIELD_LABELS,
  fieldId,
  orderedErrors,
  toCreatePayload,
  toUpdatePatch,
  type UserFormMode,
  type UserFormValues,
} from '../../_lib/user-form';
import { DeleteUserDialog } from '../DeleteUserDialog';
import { AccessSection } from './AccessSection';
import { ContactSection } from './ContactSection';
import { DangerZoneSection } from './DangerZoneSection';
import { ProfileSection } from './ProfileSection';
import { SecuritySection } from './SecuritySection';

type UserFormProps =
  | { mode: 'create' }
  | { mode: 'edit'; user: UserDetailVM; initialValues: UserFormValues };

const USERS_PATH = '/admin/users';

/** Add/edit user form: sections, validation, error summary and the sticky action bar. */
export function UserForm(props: UserFormProps) {
  const { mode } = props;
  const editUser = props.mode === 'edit' ? props.user : null;
  const router = useRouter();

  const form = useUserForm(props.mode === 'edit' ? props.initialValues : EMPTY_USER_FORM, mode);
  const access = useRolesAndPermissions();
  const usernameAvailability = useUsernameAvailability(form.values.username, mode === 'create');
  const actions = useUserActions();

  const [saving, setSaving] = useState<'save' | 'another' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // "Manage access" links land on /edit#access; the section renders after data loads.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: 'start' });
  }, []);

  const errorItems = submitted ? orderedErrors(form.errors) : [];

  const submit = async (addAnother = false) => {
    setRequestError(null);
    setSubmitted(true);
    const username = form.values.username.trim();
    const extra =
      mode === 'create' && usernameAvailability === 'taken'
        ? { username: `@${username} is already taken` }
        : {};
    if (!form.validate(extra)) return;

    setSaving(addAnother ? 'another' : 'save');
    try {
      if (editUser) {
        await usersApi.updateUser(editUser.id, toUpdatePatch(form.values, form.original));
        toast.success('Changes saved');
        router.push(USERS_PATH);
      } else {
        await usersApi.createUser(toCreatePayload(form.values));
        toast.success(`@${username} created`);
        if (addAnother) {
          form.load(EMPTY_USER_FORM);
          setSubmitted(false);
          document.getElementById(fieldId('firstName'))?.focus();
        } else {
          router.push(USERS_PATH);
        }
      }
    } catch (err) {
      setRequestError(form.applyApiError(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-5"
    >
      <FormErrorSummary
        errors={errorItems}
        action={mode === 'create' ? 'to create this user' : 'to save your changes'}
      />

      <ProfileSection form={form} mode={mode} usernameAvailability={usernameAvailability} />
      <ContactSection form={form} mode={mode} />
      <AccessSection
        form={form}
        roles={access.roles}
        permissions={access.permissions}
        roleOptions={access.roleOptions}
        permissionOptions={access.permissionOptions}
      />
      <SecuritySection
        form={form}
        mode={mode}
        onResetPassword={editUser ? () => actions.resetPassword(editUser) : undefined}
        resetting={editUser ? actions.busyIds.has(editUser.id) : false}
      />
      {editUser && (
        <DangerZoneSection
          onDelete={() => setConfirmDelete(true)}
          disabledReason={isSuperAdmin(editUser) ? 'A superadmin can’t be deleted.' : undefined}
        />
      )}

      {requestError && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">
            <b className="text-foreground">
              {mode === 'create'
                ? 'Couldn’t create the user right now.'
                : 'Couldn’t save your changes right now.'}
            </b>{' '}
            Your entries are kept. {requestError}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => submit()}
            disabled={!!saving}
          >
            Try again
          </Button>
        </div>
      )}

      <StickyActionBar
        status={<FormStatus form={form} mode={mode} errorCount={errorItems.length} />}
      >
        {editUser ? (
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                form.discard();
                setSubmitted(false);
              }}
              disabled={!!saving || form.changed.length === 0}
            >
              Discard
            </Button>
            <SaveButton
              saving={saving === 'save'}
              label="Save changes"
              disabled={form.changed.length === 0}
            />
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" asChild>
              <Link href={USERS_PATH}>Cancel</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submit(true)}
              disabled={!!saving}
            >
              {saving === 'another' ? 'Creating…' : 'Create & add another'}
            </Button>
            <SaveButton
              saving={saving === 'save'}
              label="Create user"
              savingLabel="Creating…"
              disabled={!!saving}
            />
          </>
        )}
      </StickyActionBar>

      {editUser && (
        <DeleteUserDialog
          user={confirmDelete ? editUser : null}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async (u) => {
            const deleted = await actions.deleteUser(u);
            if (deleted) router.push(USERS_PATH);
            return deleted;
          }}
        />
      )}
    </form>
  );
}

function FormStatus({
  form,
  mode,
  errorCount,
}: {
  form: UserFormState;
  mode: UserFormMode;
  errorCount: number;
}) {
  if (errorCount > 0) {
    return (
      <span className="font-medium text-destructive">
        {plural(errorCount, 'field')} {errorCount === 1 ? 'needs' : 'need'} attention
      </span>
    );
  }
  if (mode === 'edit') {
    const { changed } = form;
    if (changed.length === 0) return <>No unsaved changes</>;
    return (
      <span className="flex items-center gap-2 font-medium text-foreground">
        <ChangedDot className="" />
        {plural(changed.length, 'unsaved change')} ·{' '}
        {changed.map((f) => FIELD_LABELS[f]).join(', ')}
      </span>
    );
  }
  const { roles, permissions } = form.values;
  return (
    <>
      Ready to create · {plural(roles.length, 'role')},{' '}
      {plural(permissions.length, 'extra permission')}
    </>
  );
}
