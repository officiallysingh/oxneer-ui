'use client';

import { useCallback, useState } from 'react';

/**
 * Manages a `Record<string, string>` of field-level error messages.
 * Provides `clearErr` to remove a single field error on change,
 * and `setFieldErrors` / `resetFieldErrors` for submit-time use.
 */
export function useFieldErrors() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearErr = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const resetFieldErrors = useCallback(() => setFieldErrors({}), []);

  return { fieldErrors, setFieldErrors, clearErr, resetFieldErrors };
}
