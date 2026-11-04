import type { PropertyDef, PropertyType } from '@repo/api';

/** Pure helpers shared by the attribute form renderer and the listing value renderer. */

export interface AttrOption {
  label: string;
  value: string;
}

export type AttrTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const TONES: AttrTone[] = ['primary', 'success', 'warning', 'danger', 'info', 'muted'];

export const INTEGER_DATA_TYPES = new Set(['BYTE', 'SHORT', 'INTEGER', 'LONG', 'BIG_INTEGER']);
export const DECIMAL_DATA_TYPES = new Set(['FLOAT', 'DOUBLE', 'BIG_DECIMAL']);

export function isListType(type: PropertyType | string | undefined): boolean {
  return type === 'LIST_PROPERTY' || type === 'SET_PROPERTY';
}

/** Data types arrive either as "STRING" or as `{ STRING: "Text" }`. */
export function resolveDataType(dataType: unknown): string {
  if (typeof dataType === 'string') return dataType;
  if (typeof dataType === 'object' && dataType !== null)
    return Object.keys(dataType as Record<string, unknown>)[0] ?? '';
  return '';
}

export function isRequired(prop: PropertyDef): boolean {
  if (prop.required) return true;
  return (prop.validators ?? []).some((v) => {
    const t = v.type as unknown;
    if (typeof t === 'string') return t === 'NOT_NULL';
    if (typeof t === 'object' && t !== null) return 'NOT_NULL' in (t as object);
    return false;
  });
}

export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Split on `sep` unless it is escaped with a backslash; unescapes `\,` and `\:`. */
function splitEscaped(raw: string, sep: string, limit = Infinity): string[] {
  const parts: string[] = [];
  let cur = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch === '\\' && i + 1 < raw.length) {
      cur += raw[i + 1];
      i++;
    } else if (ch === sep && parts.length < limit - 1) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts;
}

/** Splits on unescaped commas but leaves escapes in place for a second pass. */
function splitTopLevel(raw: string): string[] {
  const parts: string[] = [];
  let cur = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch === '\\' && i + 1 < raw.length) {
      cur += ch + raw[i + 1];
      i++;
    } else if (ch === ',') {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts;
}

/** `style:options`: "Label:value,Label:value" or "value,value". The first unescaped colon splits. */
export function parseOptions(raw: string | undefined): AttrOption[] | null {
  if (!raw || !raw.trim()) return null;
  const opts = splitTopLevel(raw)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [label, value] = splitEscaped(entry, ':', 2).map((s) => s.trim());
      return { label: label ?? '', value: value !== undefined && value !== '' ? value : label! };
    });
  return opts.length ? opts : null;
}

export function optionLabel(value: string, options: AttrOption[] | null): string {
  return options?.find((o) => o.value === value)?.label ?? value;
}

/** Comma-separated list (color options, tag values). */
export function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return splitEscaped(raw, ',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Multi-value fields are stored comma-separated; arrays are accepted too. */
export function splitMulti(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === undefined || value === null) return [];
  return parseList(String(value));
}

export function joinMulti(values: string[]): string {
  return values.map((v) => v.replace(/,/g, '\\,')).join(',');
}

/** `list:badge.color-map`: "active:success,pending:warning". Unknown tones are skipped. */
export function parseToneMap(raw: string | undefined): Record<string, AttrTone> {
  const out: Record<string, AttrTone> = {};
  for (const opt of parseOptions(raw) ?? []) {
    const tone = opt.value === 'destructive' ? 'danger' : opt.value;
    if ((TONES as string[]).includes(tone)) out[opt.label] = tone as AttrTone;
  }
  return out;
}

/** Converts form strings to the JSON type the backend expects for the data type. */
export function coerceValue(prop: PropertyDef, value: unknown): unknown {
  if (value === undefined || value === null) return value;
  const dataType = resolveDataType(prop.dataType as unknown);

  if (dataType === 'BOOLEAN') {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === '' ? value : value === 'true';
    if (typeof value === 'number') return value !== 0;
  }

  if (INTEGER_DATA_TYPES.has(dataType) && typeof value === 'string') {
    if (value === '') return value;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : value;
  }

  if (DECIMAL_DATA_TYPES.has(dataType) && typeof value === 'string') {
    if (value === '' || value.endsWith('.')) return value;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}

// ── Display formatting ───────────────────────────────────────────────────────

export interface FormatOptions {
  decimals?: number;
  currency?: string;
  locale?: string;
  /** Reference time for `relative` (tests). */
  now?: number;
}

function toNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function digits(decimals: number | undefined) {
  return decimals === undefined
    ? {}
    : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
}

function validDate(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatRelative(date: Date, now: number, locale?: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffSec = Math.round((date.getTime() - now) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, sec] of steps) {
    if (Math.abs(diffSec) >= sec) return rtf.format(Math.round(diffSec / sec), unit);
  }
  return rtf.format(diffSec, 'second');
}

/** Applies `list:format`. Values that don't parse for the format are returned unchanged. */
export function formatValue(raw: string, format: string | undefined, opts: FormatOptions = {}) {
  if (!format || format === 'raw') return raw;
  const { locale, decimals } = opts;

  switch (format) {
    case 'uppercase':
      return raw.toUpperCase();
    case 'lowercase':
      return raw.toLowerCase();
    case 'capitalize':
      return raw.replace(
        /(^|[\s_-])(\p{L})/gu,
        (_m, sep: string, ch: string) => sep + ch.toUpperCase(),
      );
    case 'date':
    case 'datetime':
    case 'time':
    case 'relative': {
      const d = validDate(raw);
      if (!d) return raw;
      if (format === 'date') return d.toLocaleDateString(locale);
      if (format === 'time') return d.toLocaleTimeString(locale, { timeStyle: 'short' });
      if (format === 'datetime')
        return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
      return formatRelative(d, opts.now ?? Date.now(), locale);
    }
  }

  const n = toNumber(raw);
  if (n === null) return raw;
  switch (format) {
    case 'number':
      return n.toLocaleString(locale, digits(decimals));
    case 'compact':
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits: decimals ?? 1,
      }).format(n);
    case 'percentage':
      return `${n.toLocaleString(locale, digits(decimals))}%`;
    case 'currency':
      return formatPrice(raw, { currency: opts.currency ?? 'USD', decimals, locale });
    case 'bytes': {
      let v = n;
      let i = 0;
      while (Math.abs(v) >= 1024 && i < BYTE_UNITS.length - 1) {
        v /= 1024;
        i++;
      }
      return `${v.toLocaleString(locale, { maximumFractionDigits: decimals ?? (i ? 1 : 0) })} ${BYTE_UNITS[i]}`;
    }
  }
  return raw;
}

export interface PriceOptions {
  currency?: string;
  display?: 'symbol' | 'code' | 'name' | string;
  decimals?: number;
  locale?: string;
}

/** `list:display=price`. `custom` (or an unknown code) formats the number only. */
export function formatPrice(raw: string, opts: PriceOptions = {}): string {
  const n = toNumber(raw);
  if (n === null) return raw;
  const currency = opts.currency ?? 'USD';
  const fraction = opts.decimals ?? (Number.isInteger(n) ? 0 : 2);
  const numberOnly = () =>
    n.toLocaleString(opts.locale, {
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction,
    });
  if (currency === 'custom') return numberOnly();
  try {
    return new Intl.NumberFormat(opts.locale, {
      style: 'currency',
      currency,
      currencyDisplay: opts.display === 'code' || opts.display === 'name' ? opts.display : 'symbol',
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction,
    }).format(n);
  } catch {
    return `${numberOnly()} ${currency}`;
  }
}

export function truncate(value: string, max: number | undefined): string {
  if (!max || max <= 0 || value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

/** Only http(s), mailto, tel and relative URLs are rendered as links (blocks `javascript:`). */
export function safeHref(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#?]/.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null;
  // bare domain such as "example.com/page"
  return /^[\w-]+(\.[\w-]+)+/.test(v) ? `https://${v}` : null;
}

const MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
] as const;
const DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export const MONTH_OPTIONS: AttrOption[] = MONTHS.map((m) => ({ value: m, label: titleCase(m) }));
export const DAY_OPTIONS: AttrOption[] = DAYS.map((d) => ({ value: d, label: titleCase(d) }));

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export function parseDuration(val: string): { hours: number; minutes: number; seconds: number } {
  const m = val.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!m) return { hours: 0, minutes: 0, seconds: 0 };
  return {
    hours: m[1] ? Number(m[1]) : 0,
    minutes: m[2] ? Number(m[2]) : 0,
    seconds: m[3] ? Math.floor(Number(m[3])) : 0,
  };
}

export function parsePeriod(val: string): { years: number; months: number; days: number } {
  const m = val.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/);
  if (!m) return { years: 0, months: 0, days: 0 };
  return {
    years: m[1] ? Number(m[1]) : 0,
    months: m[2] ? Number(m[2]) : 0,
    days: m[3] ? Number(m[3]) : 0,
  };
}

/**
 * Human text for structured data types (coordinates, address, duration, …).
 * Returns null when the data type has no special formatting.
 */
export function formatByDataType(dataType: string, value: unknown): string | null {
  if (dataType === 'COORDINATES' && typeof value === 'object' && value !== null) {
    const c = value as Record<string, unknown>;
    return `${c['latitude'] ?? '—'}, ${c['longitude'] ?? '—'}`;
  }
  if (dataType === 'ADDRESS' && typeof value === 'object' && value !== null) {
    const a = value as Record<string, unknown>;
    const parts = [
      a['addressLine1'],
      a['addressLine2'],
      a['area'],
      a['city'],
      a['state'],
      a['country'],
      a['pinCode'] ?? a['pincode'],
    ].filter((p) => typeof p === 'string' && p.trim());
    return parts.join(', ') || null;
  }
  if (typeof value !== 'string') return null;
  if (dataType === 'DURATION' && /^PT/.test(value)) {
    const { hours, minutes, seconds } = parseDuration(value);
    const parts = [hours && `${hours}h`, minutes && `${minutes}m`, seconds && `${seconds}s`];
    return parts.filter(Boolean).join(' ') || '0s';
  }
  if (dataType === 'PERIOD' && /^P/.test(value)) {
    const { years, months, days } = parsePeriod(value);
    const parts = [years && `${years}y`, months && `${months}mo`, days && `${days}d`];
    return parts.filter(Boolean).join(' ') || '0d';
  }
  if (dataType === 'MONTH') return optionLabel(value, MONTH_OPTIONS);
  if (dataType === 'DAY_OF_WEEK') return optionLabel(value, DAY_OPTIONS);
  return null;
}

// ── Embedded listing data ────────────────────────────────────────────────────

/** Shape of `listing.embedded.properties` returned by the API. */
export interface EmbeddedProp {
  type?: string;
  name?: string;
  label?: string;
  dataType?: unknown;
  value?: unknown;
}

function isEmbeddedPropArray(v: unknown): v is EmbeddedProp[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((x) => typeof x === 'object' && x !== null && 'name' in x && 'value' in x)
  );
}

function normalizeEmbeddedValue(prop: EmbeddedProp): unknown {
  const v = prop.value;
  if (prop.type === 'COMPOSITE_PROPERTY') {
    return Array.isArray(v) ? embeddedToValues(v as EmbeddedProp[]) : (v ?? {});
  }
  if (isListType(prop.type) && Array.isArray(v)) {
    return v.map((item) => {
      if (isEmbeddedPropArray(item)) return embeddedToValues(item);
      if (typeof item === 'object' && item !== null && 'value' in item && !('name' in item))
        return (item as { value: unknown }).value;
      return item;
    });
  }
  return v;
}

/** `[{ name, value }]` (recursively) → `{ name: value }`, the same shape the form edits. */
export function embeddedToValues(props: EmbeddedProp[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of props) {
    if (p.name) out[p.name] = normalizeEmbeddedValue(p);
  }
  return out;
}

/** Fallback definitions when the managed type can't be loaded (no attributes). */
export function defsFromEmbedded(props: EmbeddedProp[]): PropertyDef[] {
  return props
    .filter((p) => p.name)
    .map((p) => ({
      type: (p.type ?? 'SIMPLE_PROPERTY') as PropertyType,
      name: p.name!,
      label: p.label ?? p.name!,
      dataType: p.dataType as PropertyDef['dataType'],
      value:
        p.type === 'COMPOSITE_PROPERTY' && Array.isArray(p.value)
          ? defsFromEmbedded(p.value as EmbeddedProp[])
          : undefined,
    }));
}

/** Managed-type defs first (they carry attributes), then any extra embedded props. */
export function mergeDefs(defs: PropertyDef[], embedded: EmbeddedProp[]): PropertyDef[] {
  const known = new Set(defs.map((d) => d.name));
  return [...defs, ...defsFromEmbedded(embedded.filter((p) => p.name && !known.has(p.name)))];
}
