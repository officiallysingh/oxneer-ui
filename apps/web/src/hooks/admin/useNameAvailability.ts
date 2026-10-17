'use client';

import { useEffect, useState } from 'react';
import { resolvesExists } from '@/lib/exists-check';

export type NameAvailability = 'idle' | 'checking' | 'available' | 'taken';

const DEBOUNCE_MS = 400;

interface NameAvailabilityOptions {
  /** Calls the backend "exists" endpoint for a name. */
  check: (name: string) => Promise<unknown>;
  /** Only names matching this are checked (others stay `idle`). */
  pattern?: RegExp;
  enabled?: boolean;
}

/** Debounced "is this name free?" check for usernames, role names, permission names… */
export function useNameAvailability(
  name: string,
  { check, pattern, enabled = true }: NameAvailabilityOptions,
): NameAvailability {
  const [result, setResult] = useState<{ value: string; exists: boolean } | null>(null);
  const value = name.trim();
  const checkable = enabled && !!value && (!pattern || pattern.test(value));

  useEffect(() => {
    if (!checkable) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const exists = await resolvesExists(check(value));
      if (!cancelled) setResult({ value, exists });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `check` is expected to be a stable API function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, checkable]);

  if (!checkable) return 'idle';
  if (result?.value !== value) return 'checking';
  return result.exists ? 'taken' : 'available';
}
