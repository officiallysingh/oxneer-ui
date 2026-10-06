'use client';

import { useCallback, useState } from 'react';

interface ConfirmOptions {
  title: string;
  description: string;
  onConfirm: () => void;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

const CLOSED: ConfirmState = {
  open: false,
  title: '',
  description: '',
  onConfirm: () => {},
};

/**
 * Manages a single shared ConfirmDialog state.
 * Returns `confirm` (props for ConfirmDialog) and `openConfirm` to trigger it.
 */
export function useConfirmDialog() {
  const [confirm, setConfirm] = useState<ConfirmState>(CLOSED);

  const openConfirm = useCallback((opts: ConfirmOptions) => {
    setConfirm({ open: true, ...opts });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirm((prev) => ({ ...prev, open: false }));
  }, []);

  return { confirm, openConfirm, closeConfirm };
}
