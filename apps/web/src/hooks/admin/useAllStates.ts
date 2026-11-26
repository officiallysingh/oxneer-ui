'use client';

import { useEffect, useState } from 'react';
import { masterApi, type StateVM } from '@oxneer/api';

/**
 * Every state, loaded once, for the state pickers in the address dialogs.
 * A failure leaves the list empty, which disables the "Add" actions that need it.
 */
export function useAllStates() {
  const [states, setStates] = useState<StateVM[]>([]);

  useEffect(() => {
    let cancelled = false;
    masterApi
      .getStates()
      .then((result) => {
        if (!cancelled) setStates(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return states;
}
