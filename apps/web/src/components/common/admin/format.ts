/** Shared enum/string formatting helpers for admin screens.
 *
 *  Backend enums arrive in three shapes:
 *  1. plain string  — `"PUBLIC"`
 *  2. enum object   — `{ PUBLIC: "Open to all" }` (the enum *key* is the canonical value)
 *  3. anything else — coerced to a string
 *
 *  `resolveStr` returns the canonical value in all three cases; `formatLabel`
 *  converts it to a human-readable label ("Public", "Step Based"). */

export function resolveStr(value?: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 0) return String(entries[0]![0]);
  }
  return String(value);
}

/** Short alias used by some callers in `auctions/_components`. */
export const fmtLabel = formatLabel;

export function formatLabel(value?: unknown): string {
  const str = resolveStr(value);
  if (!str) return '—';
  return str
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Format an ISO date string for display. Returns `—` for missing/invalid input
 *  and falls back to the raw string if the Date constructor throws. */
export function formatDateTime(iso?: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(
      undefined,
      opts ?? {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      },
    );
  } catch {
    return iso;
  }
}

/** Date-only variant. */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Clock-only variant without seconds — used to pair with `formatDate` on a second line. */
export function formatClock(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

/** Compact time-only variant — used for "last evaluated 12:34:56" style timestamps. */
export function formatTime(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}
