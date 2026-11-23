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

/** Narrow currency symbol for an ISO code. INR → ₹, USD → $. Empty when unknown. */
export function currencySymbol(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return '';
  try {
    const part = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: normalized,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((entry) => entry.type === 'currency')?.value;
    return part && part !== normalized ? part : '';
  } catch {
    return '';
  }
}

/** Full money amount with the currency symbol, grouped Indian-style:
 *  `formatMoney(8500000)` → "₹85,00,000". Falls back to "INR 85,00,000" for
 *  codes Intl doesn't know, and "—" for non-numeric input. */
export function formatMoney(value: string | number, currency = 'INR'): string {
  const amount = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-IN')}`;
  }
}

/** Short money amount for cards and tight spaces, in lakh/crore for INR:
 *  `formatCompactMoney(92000000)` → "₹9.2Cr", `formatCompactMoney(8500000)` → "₹85L". */
export function formatCompactMoney(value: string | number, currency = 'INR'): string {
  const amount = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return formatMoney(amount, currency);
  }
}

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Remaining time at the precision people care about: "4d 20h", "3h 12m",
 *  and seconds only in the last hour ("12m 05s"). Returns "" once elapsed. */
export function formatTimeLeft(ms: number): string {
  if (!(ms > 0)) return '';
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((ms % MINUTE_MS) / SECOND_MS);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
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
