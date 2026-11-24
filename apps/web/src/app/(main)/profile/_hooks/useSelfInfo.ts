'use client';

import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '@oxneer/api';
import { parseApiError } from '@/lib/api-errors';
import { useAuthStore } from '@/store/authStore';

/** Loads the signed-in user's details fresh from the server into the auth store,
 *  so the profile form never edits a stale copy saved at sign-in. */
export function useSelfInfo(enabled: boolean) {
  const { userInfo, setUserInfo } = useAuthStore();
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    usersApi
      .getSelfInfo()
      .then((info) => {
        if (cancelled) return;
        setUserInfo(info);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(parseApiError(err).general ?? 'Your profile couldn’t be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt, setUserInfo]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  return { userInfo, loading, error, retry };
}
