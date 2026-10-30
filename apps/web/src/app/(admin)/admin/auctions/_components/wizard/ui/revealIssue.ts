'use client';

import { useEffect, useRef } from 'react';

/** Event a block listens for to open itself when an issue points at it. */
const REVEAL_ISSUE_EVENT = 'auction-wizard:reveal-issue';

/** Opens (if it can) and scrolls to the block an issue points at, then focuses it. */
export function revealIssue(anchor: string) {
  window.dispatchEvent(new CustomEvent<string>(REVEAL_ISSUE_EVENT, { detail: anchor }));
  // Let the block open before scrolling to it.
  requestAnimationFrame(() => {
    const target = document.getElementById(anchor);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  });
}

/** Runs `onReveal` when an issue's "Show" points at `id` (e.g. to expand a block). */
export function useRevealIssue(id: string | undefined, onReveal: () => void) {
  const handler = useRef(onReveal);
  useEffect(() => {
    handler.current = onReveal;
  }, [onReveal]);

  useEffect(() => {
    if (!id) return;
    const listener = (event: Event) => {
      if ((event as CustomEvent<string>).detail === id) handler.current();
    };
    window.addEventListener(REVEAL_ISSUE_EVENT, listener);
    return () => window.removeEventListener(REVEAL_ISSUE_EVENT, listener);
  }, [id]);
}
