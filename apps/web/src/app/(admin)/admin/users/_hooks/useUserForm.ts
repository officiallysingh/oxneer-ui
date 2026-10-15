'use client';

import { useCallback, useMemo, useState } from 'react';
import { parseApiError } from '@/lib/api-errors';
import {
  changedFields,
  FIELD_LABELS,
  fieldId,
  mapApiFieldErrors,
  validateUserForm,
  type UserFormErrors,
  type UserFormMode,
  type UserFormTextField,
  type UserFormValues,
} from '../_lib/user-form';

/** Values, original snapshot, dirty tracking and errors for the add/edit user form. */
export function useUserForm(initial: UserFormValues, mode: UserFormMode) {
  const [values, setValues] = useState(initial);
  const [original, setOriginal] = useState(initial);
  const [errors, setErrors] = useState<UserFormErrors>({});

  const setField = useCallback(
    <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => {
      setValues((prev) => {
        const next = { ...prev, [key]: value };
        // A new email must be confirmed again; reverting restores the saved setting.
        if (key === 'email' && mode === 'edit') {
          next.askToVerifyEmail =
            next.email.trim() !== original.email.trim() ? true : original.askToVerifyEmail;
        }
        // Mobile verification only applies when there is a mobile number.
        if (key === 'mobile' && !next.mobile.trim()) next.askToVerifyMobile = false;
        return next;
      });
      setErrors((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [mode, original],
  );

  /** Replaces both the values and the snapshot they are compared against. */
  const load = useCallback((v: UserFormValues) => {
    setOriginal(v);
    setValues(v);
    setErrors({});
  }, []);

  const discard = useCallback(() => {
    setValues(original);
    setErrors({});
  }, [original]);

  const changed = useMemo(
    () => (mode === 'edit' ? changedFields(values, original) : []),
    [mode, values, original],
  );
  const isChanged = useCallback(
    (field: keyof UserFormValues) => changed.includes(field),
    [changed],
  );

  /** Runs client-side validation (plus any `extra` errors); returns true when submittable. */
  const validate = useCallback(
    (extra: UserFormErrors = {}) => {
      const next = { ...validateUserForm(values, mode), ...extra };
      setErrors(next);
      return Object.keys(next).length === 0;
    },
    [values, mode],
  );

  /** Common `FormField` props for a text field. */
  const textField = (field: UserFormTextField) => ({
    id: fieldId(field),
    label: FIELD_LABELS[field],
    value: values[field],
    onChange: (v: string) => setField(field, v),
    error: errors[field],
    changed: isChanged(field),
  });

  /** Maps a failed request onto field errors; returns a general message when none apply. */
  const applyApiError = useCallback((err: unknown): string | null => {
    const parsed = parseApiError(err);
    const fieldErrors = mapApiFieldErrors(parsed.fieldErrors);
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length > 0
      ? null
      : (parsed.general ?? 'Something went wrong. Please try again.');
  }, []);

  return {
    values,
    original,
    errors,
    setField,
    load,
    discard,
    changed,
    isChanged,
    validate,
    applyApiError,
    textField,
  };
}

export type UserFormState = ReturnType<typeof useUserForm>;
