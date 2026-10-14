'use client';

import { useEffect } from 'react';
import { toast } from '@repo/ui';
import { SESSION_ERROR_EVENT } from '@repo/api';

/**
 * Surfaces API errors raised when the session expires (401/403) as a toast,
 * before the client is redirected to /login. The message is also stored in
 * sessionStorage so the login page can render it.
 */
export function ApiSessionWatcher() {
  useEffect(() => {
    const onSessionError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      if (message) toast.error(message);
    };

    window.addEventListener(SESSION_ERROR_EVENT, onSessionError);
    return () => window.removeEventListener(SESSION_ERROR_EVENT, onSessionError);
  }, []);

  return null;
}
