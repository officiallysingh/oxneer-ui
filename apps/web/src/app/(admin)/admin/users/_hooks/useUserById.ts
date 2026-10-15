'use client';

import { useEffect, useState } from 'react';
import { usersApi, type UserDetailVM } from '@repo/api';

/**
 * The user with `id`: `loaded` when the caller already has it (e.g. on the current list
 * page), otherwise fetched — for deep links like `/admin/users?view=<id>`.
 */
export function useUserById(id: string | null, loaded: UserDetailVM | undefined) {
  const [fetched, setFetched] = useState<UserDetailVM | null>(null);
  const needsFetch = !!id && !loaded && fetched?.id !== id;

  useEffect(() => {
    if (!needsFetch || !id) return;
    let cancelled = false;
    usersApi
      .getUserById(id, ['roles', 'permissions'])
      .then((u) => !cancelled && setFetched(u))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, needsFetch]);

  if (!id) return null;
  return loaded ?? (fetched?.id === id ? fetched : null);
}
