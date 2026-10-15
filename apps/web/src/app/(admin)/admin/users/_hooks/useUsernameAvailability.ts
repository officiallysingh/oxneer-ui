'use client';

import { useEffect, useState } from 'react';
import { usersApi } from '@repo/api';
import { resolvesExists } from '@/lib/exists-check';
import { USERNAME_PATTERN } from '@/lib/validation';

export type UsernameAvailability = 'idle' | 'checking' | 'available' | 'taken';

const DEBOUNCE_MS = 400;

/** Debounced "is this username free?" check; only runs for syntactically valid usernames. */
export function useUsernameAvailability(username: string, enabled = true): UsernameAvailability {
  const [result, setResult] = useState<{ value: string; exists: boolean } | null>(null);
  const value = username.trim();
  const checkable = enabled && USERNAME_PATTERN.test(value);

  useEffect(() => {
    if (!checkable) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const exists = await resolvesExists(usersApi.checkUsernameExists(value));
      if (!cancelled) setResult({ value, exists });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, checkable]);

  if (!checkable) return 'idle';
  if (result?.value !== value) return 'checking';
  return result.exists ? 'taken' : 'available';
}
