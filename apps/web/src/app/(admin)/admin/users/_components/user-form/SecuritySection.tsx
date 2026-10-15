'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@repo/ui';
import { FormSection } from '@/components/common/admin/FormSection';
import { SettingRow } from '@/components/common/admin/SettingRow';
import { ToggleField } from '@/components/common/admin/ToggleField';
import type { UserFormState } from '../../_hooks/useUserForm';
import type { UserFormMode } from '../../_lib/user-form';

interface SecuritySectionProps {
  form: UserFormState;
  mode: UserFormMode;
  /** Edit only: sends a password reset for the saved user. */
  onResetPassword?: () => void;
  resetting?: boolean;
}

export function SecuritySection({ form, mode, onResetPassword, resetting }: SecuritySectionProps) {
  const { values, original, setField, isChanged } = form;
  const editing = mode === 'edit';
  const hasMobile = !!values.mobile.trim();
  const mobileAlreadyVerified =
    editing && hasMobile && !isChanged('mobile') && !original.askToVerifyMobile;

  const emailHelp =
    editing && isChanged('email')
      ? 'Turned on because the email changed. The new address must be confirmed.'
      : 'The user must confirm their email before it’s marked verified.';
  const mobileHelp = !hasMobile
    ? 'Available once a mobile number is entered.'
    : mobileAlreadyVerified && !values.askToVerifyMobile
      ? 'Mobile is already verified.'
      : 'The user must confirm their mobile before it’s marked verified.';

  return (
    <FormSection
      title="Sign-in & security"
      description="Control whether and how the user can sign in."
      dense
    >
      <ToggleField
        label="Enabled"
        description={
          editing
            ? 'The user can sign in. When off, they’re signed out and can’t sign in.'
            : 'The user can sign in. Turn off to create the account without allowing sign-in yet.'
        }
        value={values.enabled}
        onChange={(v) => setField('enabled', v)}
        changed={isChanged('enabled')}
      />
      <ToggleField
        label="Ask to verify email"
        description={emailHelp}
        value={values.askToVerifyEmail}
        onChange={(v) => setField('askToVerifyEmail', v)}
        changed={isChanged('askToVerifyEmail')}
      />
      <ToggleField
        label="Ask to verify mobile"
        description={mobileHelp}
        value={values.askToVerifyMobile}
        onChange={(v) => setField('askToVerifyMobile', v)}
        disabled={!hasMobile}
        changed={isChanged('askToVerifyMobile')}
      />
      <ToggleField
        label="Prompt password change"
        description="The user must set a new password at next sign-in."
        value={values.promptChangePwd}
        onChange={(v) => setField('promptChangePwd', v)}
        changed={isChanged('promptChangePwd')}
      />
      {onResetPassword && (
        <SettingRow
          label="Password reset"
          description="Reset the user’s password so they choose a new one."
          control={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetPassword}
              disabled={resetting}
            >
              {resetting && <Loader2 className="animate-spin" />}
              Reset password
            </Button>
          }
        />
      )}
    </FormSection>
  );
}
