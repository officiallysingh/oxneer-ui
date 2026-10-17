'use client';

import { useEffect, useRef } from 'react';

/** True when the key press is going into a text field, so shortcuts must not fire. */
function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/**
 * Calls `focus` when `key` (e.g. "/") is pressed anywhere outside a text field.
 * Pass `undefined` to disable.
 */
export function useFocusShortcut(key: string | undefined, focus: () => void) {
  const focusRef = useRef(focus);
  useEffect(() => {
    focusRef.current = focus;
  });

  useEffect(() => {
    if (!key) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== key || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      focusRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [key]);
}
