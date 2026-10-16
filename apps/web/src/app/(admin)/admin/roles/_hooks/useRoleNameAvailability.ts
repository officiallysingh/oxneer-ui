'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@repo/api';
import { resolvesExists } from '@/lib/exists-check';
import { ROLE_NAME_PATTERN } from '@/lib/validation';

export type RoleNameAvailability = 'idle' | 'checking' | 'available' | 'taken';

const DEBOUNCE_MS = 400;

/** Debounced "is this role name free?" check; only runs for syntactically valid names. */
export function useRoleNameAvailability(name: string, enabled = true): RoleNameAvailability {
  const [result, setResult] = useState<{ value: string; exists: boolean } | null>(null);
  const value = name.trim();
  const checkable = enabled && ROLE_NAME_PATTERN.test(value);

  useEffect(() => {
    if (!checkable) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const exists = await resolvesExists(adminApi.checkRoleNameExists(value));
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
