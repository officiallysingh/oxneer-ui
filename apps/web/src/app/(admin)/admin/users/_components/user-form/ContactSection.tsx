'use client';

import { FormField } from '@/components/common/admin/FormField';
import { FormSection } from '@/components/common/admin/FormSection';
import type { UserFormState } from '../../_hooks/useUserForm';
import type { UserFormMode } from '../../_lib/user-form';
import { VerificationMark } from '../VerificationMark';

export function ContactSection({ form, mode }: { form: UserFormState; mode: UserFormMode }) {
  const { original, setField, isChanged } = form;
  const emailChanged = mode === 'edit' && isChanged('email');
  const originalEmailVerified = !original.askToVerifyEmail;
  const showMobileVerified =
    mode === 'edit' && !!original.mobile && !isChanged('mobile') && !original.askToVerifyMobile;

  return (
    <FormSection
      title="Contact"
      description="Where the user receives verification and account messages."
    >
      <FormField
        {...form.textField('email')}
        type="email"
        required
        autoComplete="email"
        placeholder="name@example.com"
        suffix={
          emailChanged ? (
            <button
              type="button"
              onClick={() => setField('email', original.email)}
              className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Undo
            </button>
          ) : undefined
        }
      >
        {emailChanged && original.email && (
          <p className="rounded-md border border-warning/35 bg-warning/[0.08] px-3 py-2.5 text-[13px]">
            Was <b>{original.email}</b>
            {originalEmailVerified ? ' (verified)' : ''}. The new address will be <b>unverified</b>{' '}
            until the user confirms it.
          </p>
        )}
      </FormField>
      <FormField
        {...form.textField('mobile')}
        type="tel"
        optional
        prefix="+91"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="9876543210"
        suffix={
          showMobileVerified ? (
            <VerificationMark verified subject="Mobile" variant="pill" />
          ) : undefined
        }
      />
    </FormSection>
  );
}
