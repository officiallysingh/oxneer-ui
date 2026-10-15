'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  XCircle,
  IndianRupee,
  ArrowRight,
} from 'lucide-react';
import { auctionsApi, type PolicyEvaluation, type PolicyEvaluationMap } from '@repo/api';
import { Badge, Button } from '@repo/ui';
import Tip from '@/components/common/admin/Tip';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { fmtLabel, resolveStr } from './PolicyShared';
import { formatDateTime } from '@/components/common/admin/format';

function statusStyle(statusType: string): { className: string; Icon: typeof Clock } {
  switch (statusType) {
    case 'COMPLETED':
      return {
        className: 'bg-success/10 text-success border-success/30',
        Icon: CheckCircle2,
      };
    case 'PENDING':
    case 'IN_PROGRESS':
    case 'RUNNING':
      return { className: 'bg-info/10 text-info border-info/30', Icon: Clock };
    case 'FAILED':
    case 'CANCELLED':
      return {
        className: 'bg-destructive/10 text-destructive border-destructive/30',
        Icon: XCircle,
      };
    default:
      return { className: 'bg-muted text-muted-foreground border-border', Icon: Clock };
  }
}

/** True for backend enum values shaped like `{ CODE: "Label" }` */
function isEnumObject(value: unknown): value is Record<string, string | null> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length !== 1) return false;
  const [key] = entries[0]!;
  return /^[A-Z][A-Z0-9_]*$/.test(key);
}

/** True for arrays shaped like `[{ "Aadhar Card": false }, { "Pan Card": true }, ...]`. */
function isChecklistArray(value: unknown): value is Record<string, boolean>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => {
      if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
      const entries = Object.entries(v as Record<string, unknown>);
      return entries.length === 1 && typeof entries[0]![1] === 'boolean';
    })
  );
}

function isISODateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(key);
}

function isNestedPaymentBlock(value: unknown): value is Record<string, string> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value as Record<string, unknown>);
  return keys.length <= 4 && keys.some((k) => k === 'amount' || k === 'refundable');
}

function formatValue(value: unknown): string {
  if (isEnumObject(value)) return fmtLabel(Object.keys(value)[0]) || '';
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    const str = resolveStr(value);
    return str || '';
  }
  return String(value);
}

type DetailRender =
  | { kind: 'chip'; text: string; label?: string }
  | { kind: 'checklist'; items: { label: string; ok: boolean }[]; label?: string }
  | { kind: 'block'; rows: [string, string, string?][]; label?: string }
  | { kind: 'payment-block'; amount: string; description: string; refundable?: string }
  | { kind: 'date-chip'; date: string; text: string }
  | { kind: 'pending-message'; text: string }
  | { kind: 'window-range'; from: string; to: string; note?: string }
  | { kind: 'deadline'; date: string; note?: string }
  | { kind: 'html-block'; html: string }
  | { kind: 'fields'; items: { label: string; value: string }[]; label?: string };

/** Normalises a `properties` evaluation detail — either `[{ name/label, value }, ...]`
 *  (Form/Participation step submissions) or a plain `{ label: value }` map — into
 *  label/value pairs. Returns null when every value is empty, since that means the
 *  detail is just echoing the form's schema, already shown by the step's own Form
 *  Fields preview — rendering it again here would just repeat the same thing. */
function normalizePropertiesDetail(value: unknown): { label: string; value: string }[] | null {
  let items: { label: string; value: string }[];
  if (Array.isArray(value)) {
    items = value.map((entry) => {
      const obj = (entry ?? {}) as Record<string, unknown>;
      const label = (obj.label as string) || fmtLabel(obj.name) || '';
      return { label, value: formatValue(obj.value) };
    });
  } else if (value && typeof value === 'object') {
    items = Object.entries(value as Record<string, unknown>).map(([key, v]) => ({
      label: fmtLabel(key),
      value: formatValue(v),
    }));
  } else {
    return null;
  }
  if (items.length === 0 || items.every((i) => !i.value)) return null;
  return items;
}

function formatAmount(value: unknown): string {
  if (value == null || value === '') return '';
  const str = String(value);
  const num = parseFloat(str);
  if (!Number.isNaN(num)) {
    return num % 1 === 0
      ? num.toLocaleString('en-IN')
      : num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return str;
}

/** True when an amount string is purely numeric (currency-formatted already). */
function isNumericAmount(str: string): boolean {
  return str !== '' && !Number.isNaN(parseFloat(str)) && /^[\d,.]+$/.test(str);
}

/** Backend refundable values arrive as `"true"`/`"false"` strings — normalize for display. */
function normalizeRefundable(value: unknown): string | undefined {
  const str = formatValue(value);
  if (!str) return undefined;
  if (str === 'true' || str === 'Yes') return 'Yes';
  if (str === 'false' || str === 'No') return 'No';
  return str;
}

/** Detail texts the backend uses to signal a value that can't be resolved yet. */
const PENDING_DETAIL_PATTERN =
  /couldn'?t determine|could not determine|not completed yet|would be evaluated once|not available yet/i;

/** Friendlier labels for raw detail keys. */
const LABEL_OVERRIDES: Record<string, string> = {
  timeWindow: 'Time Window',
  timeWindowAlt: 'Applicability',
  deadline: 'Payment Deadline',
  tnc: 'Terms & Conditions',
};

function labelFor(key: string): string {
  return LABEL_OVERRIDES[key] ?? fmtLabel(key);
}

function renderDetail(value: unknown): DetailRender | null {
  if (value == null || value === '') return null;
  if (isEnumObject(value)) {
    const text = fmtLabel(Object.keys(value)[0]);
    return text ? { kind: 'chip', text } : null;
  }
  if (isChecklistArray(value)) {
    return {
      kind: 'checklist',
      items: value.map((item) => {
        const [label, ok] = Object.entries(item)[0]!;
        return { label: fmtLabel(label), ok };
      }),
    };
  }
  if (Array.isArray(value)) {
    const text = value.map(formatValue).filter(Boolean).join(', ');
    return text ? { kind: 'chip', text } : null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (isNestedPaymentBlock(obj)) {
      return {
        kind: 'payment-block',
        amount: formatAmount(obj.amount ?? ''),
        description: formatValue(obj.description) || '',
        refundable: formatValue(obj.refundable),
      };
    }
    const rows: [string, string, string?][] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'description') continue;
      if (v == null) {
        if (isISODateKey(k)) {
          rows.push([k, formatDateTime(k), '']);
        }
        continue;
      }
      const formatted = formatValue(v);
      if (!formatted) {
        if (isISODateKey(k)) {
          rows.push([k, formatDateTime(k), '']);
        }
        continue;
      }
      if (isEnumObject(v)) {
        rows.push([k, fmtLabel(Object.keys(v)[0]!), '']);
      } else if (typeof v === 'object' && !Array.isArray(v) && v !== null) {
        const nested = v as Record<string, unknown>;
        if (isNestedPaymentBlock(nested)) {
          rows.push([k, formatAmount(nested.amount ?? ''), formatValue(nested.description) || '']);
        } else {
          rows.push([k, resolveStr(v), '']);
        }
      } else {
        rows.push([k, formatted, '']);
      }
    }
    if (rows.length === 0) return null;
    return { kind: 'block', rows };
  }
  const text = formatValue(value);
  return text ? { kind: 'chip', text } : null;
}

function buildDetailItems(
  details: Record<string, unknown> | undefined,
): { key: string; label: string; rendered: DetailRender }[] {
  if (!details) return [];
  const entries = Object.entries(details);
  const descriptionKeys = new Set(
    entries
      .map(([key]) => key)
      .filter((key) => Object.prototype.hasOwnProperty.call(details, `${key}Description`)),
  );
  // Companion keys folded into the `timeWindow` entry's own rendering below.
  const hasTimeWindow = descriptionKeys.has('timeWindow') || 'timeWindow' in details;

  return entries
    .filter(([key]) => !isDescriptionOf(key, descriptionKeys))
    .filter(
      ([key]) => !(hasTimeWindow && (key === 'timeWindowAlt' || key === 'timeWindowDescription')),
    )
    .map(([key, value]) => {
      // Price progression window — `{ "from display string": "to display string" }`
      // plus a human sentence; render as a highlighted from → till block.
      if (key === 'timeWindow') {
        const note =
          typeof details.timeWindowDescription === 'string'
            ? details.timeWindowDescription.trim()
            : undefined;
        const obj =
          value != null && typeof value === 'object' && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : null;
        const firstEntry = obj ? Object.entries(obj)[0] : undefined;
        if (firstEntry?.[0] && firstEntry[1]) {
          return {
            key,
            label: labelFor(key),
            rendered: {
              kind: 'window-range',
              from: String(firstEntry[0]),
              to: String(firstEntry[1]),
              note,
            } as DetailRender,
          };
        }
        // Unscheduled auction — backend explains applicability via alt/description.
        const text =
          (typeof details.timeWindowAlt === 'string' ? details.timeWindowAlt.trim() : '') || note;
        return text
          ? {
              key,
              label: LABEL_OVERRIDES.timeWindowAlt!,
              rendered: { kind: 'pending-message', text },
            }
          : null;
      }

      // Payment step deadline — single display date plus explanatory sentence.
      if (key === 'deadline') {
        const note =
          typeof details.deadlineDescription === 'string'
            ? details.deadlineDescription.trim()
            : undefined;
        if (!value) return null;
        return {
          key,
          label: labelFor(key),
          rendered: { kind: 'deadline', date: String(value), note } as DetailRender,
        };
      }

      // TnC step evaluation embeds the raw accepted HTML — render it like the
      // wizard's TnC preview instead of dumping markup as plain text.
      if (key === 'tnc' && typeof value === 'string' && /<[a-z][\s>]/i.test(value)) {
        return {
          key,
          label: labelFor(key),
          rendered: { kind: 'html-block', html: value } as DetailRender,
        };
      }

      // Form/Participation step submitted values — render as disabled fields
      // (matching the rest of the app's read-only field style) instead of a
      // generic key/value block.
      if (key === 'properties') {
        const items = normalizePropertiesDetail(value);
        return items
          ? { key, label: labelFor(key), rendered: { kind: 'fields', items } as DetailRender }
          : null;
      }

      const descValue = details[`${key}Description`];
      if (typeof descValue === 'string' && descValue.trim()) {
        const text = descValue.trim();
        const obj = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
        if (obj && isNestedPaymentBlock(obj)) {
          return {
            key,
            label: labelFor(key),
            rendered: {
              kind: 'payment-block',
              amount: formatAmount(obj.amount ?? ''),
              description: formatValue(obj.description) || '',
              refundable: normalizeRefundable(obj.refundable),
            } as DetailRender,
          };
        }
        return {
          key,
          label: labelFor(key),
          rendered: PENDING_DETAIL_PATTERN.test(text)
            ? ({ kind: 'pending-message', text } as DetailRender)
            : { kind: 'chip', text },
        };
      }
      const rendered = renderDetail(value);
      return rendered ? { key, label: labelFor(key), rendered } : null;
    })
    .filter(
      (item): item is { key: string; label: string; rendered: DetailRender } => item !== null,
    );
}

function isDescriptionOf(key: string, baseKeysWithDescription: Set<string>): boolean {
  return (
    key.endsWith('Description') && baseKeysWithDescription.has(key.slice(0, -'Description'.length))
  );
}

function isNumeric(value: string): boolean {
  const num = parseFloat(value);
  return !Number.isNaN(num) && String(num) === value;
}

export function EvaluationCard({
  name,
  evaluation,
  showStatus = true,
  resultLabel = 'Result',
  hideName = false,
}: {
  name: string;
  evaluation: PolicyEvaluation;
  showStatus?: boolean;
  resultLabel?: string;
  /** Hide the name header — used when the parent card already shows it. */
  hideName?: boolean;
}) {
  const statusType = showStatus ? resolveStr(evaluation.status?.type) : '';
  const { className, Icon } = statusStyle(statusType);
  const resultStr = formatValue(evaluation.result);
  const isLongResult = resultStr.length > 50;

  const detailItems = buildDetailItems(evaluation.details);
  const isShortChip = (d: (typeof detailItems)[number]) =>
    d.rendered.kind === 'chip' && d.rendered.text.length <= 50;
  const chipItems = detailItems.filter(
    (d): d is { key: string; label: string; rendered: { kind: 'chip'; text: string } } =>
      isShortChip(d),
  );
  const blockItems = detailItems.filter((d) => !isShortChip(d));

  const isPendingMessage =
    resultStr &&
    !isNumeric(resultStr) &&
    (resultStr.toLowerCase().includes("couldn't determine") ||
      resultStr.toLowerCase().includes('could not determine') ||
      resultStr.toLowerCase().includes('not available') ||
      resultStr.toLowerCase().includes('pending'));

  const showResult = resultStr && !isPendingMessage;

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2 text-xs">
      {/* Header row */}
      {!hideName && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-foreground text-sm">{name}</span>
          {statusType && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${className}`}
            >
              <Icon className="h-3 w-3" />
              {fmtLabel(statusType)}
            </span>
          )}
          {showStatus && evaluation.condition === false && (
            <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 text-warning px-2 py-0.5 text-[10px] font-medium">
              Not yet active
            </span>
          )}
        </div>
      )}
      {/* Status badges only (when name is hidden) */}
      {hideName && (statusType || evaluation.condition === false) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {statusType && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${className}`}
            >
              <Icon className="h-3 w-3" />
              {fmtLabel(statusType)}
            </span>
          )}
          {showStatus && evaluation.condition === false && (
            <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 text-warning px-2 py-0.5 text-[10px] font-medium">
              Not yet active
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {evaluation.description && (
        <p
          className={
            !resultStr && evaluation.condition == null
              ? 'text-muted-foreground/70 italic'
              : 'text-muted-foreground/80 leading-relaxed'
          }
        >
          {evaluation.description}
        </p>
      )}

      {/* Result - pending message style */}
      {isPendingMessage && (
        <div className="flex items-center gap-2 rounded-md bg-warning/5 border border-warning/20 px-2.5 py-1.5 text-warning">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[11px]">{resultStr}</span>
        </div>
      )}

      {/* Result - numeric/short result */}
      {showResult && !isLongResult && (
        <div className="flex items-center gap-1.5">
          {isNumeric(resultStr) && (
            <span className="p-1 rounded-md bg-primary/5 text-primary">
              <IndianRupee className="h-3 w-3" />
            </span>
          )}
          <span className="text-muted-foreground/70">
            {resultLabel}:{' '}
            <span
              className={`font-semibold text-foreground ${isNumeric(resultStr) ? 'text-base' : ''}`}
            >
              {isNumeric(resultStr) ? (
                <>
                  <span className="text-xs text-muted-foreground mr-0.5">₹</span>
                  {formatAmount(resultStr)}
                </>
              ) : (
                resultStr
              )}
            </span>
          </span>
        </div>
      )}

      {/* Result - long result */}
      {showResult && isLongResult && <p className="text-foreground leading-relaxed">{resultStr}</p>}

      {/* Chip items */}
      {chipItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {chipItems.map((d) => (
            <span
              key={d.key}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground"
            >
              <span className="font-medium">{d.label}:</span>
              <span className="text-foreground">{d.rendered.text}</span>
            </span>
          ))}
        </div>
      )}

      {/* Block items */}
      {blockItems.map((d) => (
        <div key={d.key} className="pt-1">
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1">
            {d.label}
          </p>
          {d.rendered.kind === 'checklist' ? (
            <div className="rounded-lg border border-border/50 bg-background/60 divide-y divide-border/30 overflow-hidden">
              {d.rendered.items.map((item) => (
                <label
                  key={item.label}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 cursor-not-allowed hover:bg-muted/20"
                >
                  <span className="text-xs text-foreground">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={item.ok}
                    disabled
                    className="h-3.5 w-3.5 accent-primary disabled:opacity-100"
                  />
                </label>
              ))}
            </div>
          ) : d.rendered.kind === 'payment-block' ? (
            <div className="rounded-lg border border-border/50 bg-background/60 px-3 py-2 space-y-1">
              {d.rendered.amount && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <span className="text-sm font-bold text-foreground">
                    {isNumericAmount(d.rendered.amount) && (
                      <span className="text-xs text-muted-foreground mr-0.5">₹</span>
                    )}
                    {d.rendered.amount}
                  </span>
                </div>
              )}
              {d.rendered.description && (
                <p className="text-[11px] text-muted-foreground/70">{d.rendered.description}</p>
              )}
              {d.rendered.refundable && (
                <div className="flex justify-between items-center pt-0.5 border-t border-border/30">
                  <span className="text-[10px] text-muted-foreground">Refundable</span>
                  <span
                    className={`text-[10px] font-medium ${d.rendered.refundable === 'Yes' ? 'text-success' : 'text-destructive'}`}
                  >
                    {d.rendered.refundable}
                  </span>
                </div>
              )}
            </div>
          ) : d.rendered.kind === 'pending-message' ? (
            <div className="flex items-center gap-2 rounded-md bg-warning/5 border border-warning/20 px-2.5 py-1.5 text-warning">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px]">{d.rendered.text}</span>
            </div>
          ) : d.rendered.kind === 'window-range' ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">{d.rendered.from}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                <span className="font-semibold text-foreground">{d.rendered.to}</span>
              </div>
              {d.rendered.note && (
                <p className="text-[10px] text-muted-foreground/70">{d.rendered.note}</p>
              )}
            </div>
          ) : d.rendered.kind === 'deadline' ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">{d.rendered.date}</span>
              </div>
              {d.rendered.note && (
                <p className="text-[10px] text-muted-foreground/70">{d.rendered.note}</p>
              )}
            </div>
          ) : d.rendered.kind === 'html-block' ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none max-h-44 overflow-y-auto rounded-lg border
                      border-border bg-background p-3 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
              dangerouslySetInnerHTML={{ __html: d.rendered.html }}
            />
          ) : d.rendered.kind === 'fields' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {d.rendered.items.map((f, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">{f.label}</span>
                  <div className="rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground/70">
                    {f.value || '—'}
                  </div>
                </div>
              ))}
            </div>
          ) : d.rendered.kind === 'block' ? (
            <div className="rounded-lg border border-border/50 bg-background/60 divide-y divide-border/30 overflow-hidden">
              {d.rendered.rows.map(([k, v, desc]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-3 py-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {fmtLabel(k)}
                  </span>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-foreground">{v}</span>
                    {desc && <p className="text-[10px] text-muted-foreground/60">{desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : d.rendered.kind === 'date-chip' ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground">
              {d.rendered.text}
            </span>
          ) : (
            <p className="text-xs text-foreground leading-relaxed">{d.rendered.text}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function EvaluationList({
  evaluations,
  loading,
  showStatus = true,
  resultLabel = 'Result',
  policyName,
}: {
  evaluations?: PolicyEvaluationMap | null;
  loading?: boolean;
  showStatus?: boolean;
  resultLabel?: string;
  /** When provided, single-entry evaluations whose key matches this name will
   *  suppress the redundant name header in EvaluationCard. */
  policyName?: string;
}) {
  const entries = Object.entries(evaluations ?? {}).filter(
    (entry): entry is [string, PolicyEvaluation] => entry[1] != null,
  );
  if (entries.length === 0) {
    if (!loading) return null;
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3 animate-pulse" />
        <span className="italic">Evaluating policies...</span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {entries.map(([name, evaluation]) => {
        const hideName =
          entries.length === 1 &&
          !!policyName &&
          name.trim().toLowerCase() === policyName.trim().toLowerCase();
        return (
          <EvaluationCard
            key={name}
            name={name}
            evaluation={evaluation}
            showStatus={showStatus}
            resultLabel={resultLabel}
            hideName={hideName}
          />
        );
      })}
    </div>
  );
}

export function PolicyItemCard({
  auctionId,
  policyId,
  name,
  type,
  description,
  evaluations,
  loadingEvaluation,
  showStatus = true,
  resultLabel = 'Result',
  showTypeBadge = true,
  editable,
  onEdit,
  deletable,
  onDeleted,
  deleteConfirmDescription,
}: {
  auctionId: string;
  policyId?: string;
  name?: string;
  type?: unknown;
  description?: string;
  evaluations?: PolicyEvaluationMap | null;
  loadingEvaluation?: boolean;
  showStatus?: boolean;
  resultLabel?: string;
  showTypeBadge?: boolean;
  editable?: boolean;
  onEdit?: () => void;
  deletable?: boolean;
  onDeleted?: () => void;
  deleteConfirmDescription?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!policyId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await auctionsApi.deleteAuctionPolicy(auctionId, policyId);
      setConfirmOpen(false);
      onDeleted?.();
    } catch {
      setDeleteError('Failed to delete policy. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">
            {name || fmtLabel(type) || 'Policy'}
          </span>
          {showTypeBadge && type != null && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              {fmtLabel(type)}
            </Badge>
          )}
        </div>
        {(editable || deletable) && (
          <div className="flex items-center gap-1 shrink-0">
            {editable && onEdit && (
              <Tip label="Edit">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={onEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </Tip>
            )}
            {deletable && policyId && (
              <Tip label="Delete">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Tip>
            )}
          </div>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed px-0.5">{description}</p>
      )}

      {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}

      <EvaluationList
        evaluations={evaluations}
        loading={loadingEvaluation}
        showStatus={showStatus}
        resultLabel={resultLabel}
        policyName={name || undefined}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete policy?"
        description={
          deleteConfirmDescription ??
          'This removes the policy and its related workflow steps. This action cannot be undone.'
        }
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmOpen(false)}
      />
    </div>
  );
}
