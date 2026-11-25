'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Input, Label, cn } from '@oxneer/ui';
import type {
  AuctionWorkflowStep,
  PolicyEvaluationMap,
  PolicyHeadRQ,
  PolicyItemRQ,
} from '@oxneer/api';
import { resolveStr as resolveStrShared } from '@/components/common/admin/format';

// Re-export the shared resolveStr under the same local name so existing
// `import { resolveStr } from './PolicyShared'` callers keep working.
export const resolveStr = resolveStrShared;

/** Title-cases an enum code, snake_case key, or camelCase key alike (e.g.
 *  "MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY" / "deadlineDescription" / "Aadhar Card"
 *  all become "Minimum Participants Requirement Policy" / "Deadline Description" /
 *  "Aadhar Card"). Idempotent on already-formatted text. */
export function fmtLabel(value?: unknown): string {
  const str = resolveStr(value);
  if (!str) return '';
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

export const POLICY_DEFAULTS: Record<string, { name: string; description: string }> = {
  PARTICIPATION_POLICY: {
    name: 'Auction Participation Policy',
    description: 'Policy governing participation eligibility in the auction',
  },
  MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY: {
    name: 'Minimum required participants',
    description: 'Minimum required participants, if not met then the Auction will be cancelled',
  },
  EXTENSION_POLICY: {
    name: 'Auction extension',
    description: 'Auction extension for last moment offer protection. 0 means unlimited extensions',
  },
  PRICE_PROGRESSION_POLICY: {
    name: 'Price change policy',
    description: 'Price change policy over time',
  },
  STEP_BASED_OFFER_PRICE_POLICY: {
    name: 'Step based Offer price',
    description: 'Offers are made in step of given amount',
  },
  FIXED_PERCENTAGE_BASED_OFFER_PRICE_POLICY: {
    name: 'Fixed percentage Offer price',
    description: 'Offers increase by a fixed percentage',
  },
  PERCENTAGE_RANGE_BASED_OFFER_PRICE_POLICY: {
    name: 'Percentage range Offer price',
    description: 'Offers increase within a percentage range',
  },
  CLOCK_BASED_PRICE_CHANGE_POLICY: {
    name: 'Clock based price change',
    description: 'Price changes automatically over time',
  },
  KTH_PRICE_WINNER_DETERMINATION_POLICY: {
    name: 'Winner determination',
    description: 'Winner determined on the basis of 1st, 2nd or Kth price',
  },
  KTH_WINNER_PRICE_DETERMINATION_POLICY: {
    name: 'Winner Price determination',
    description: 'Winner can pay 1st, 2nd or Kth price.',
  },
};

/** The backend's flat policy-types-per-auction-type endpoint returns individual
 *  type codes with no grouping. The UI still shows each category (Participation,
 *  Precondition, Price Progression, Extension, Winner Determination, Winner Price
 *  Determination) as its own section, so this map recovers that categorisation
 *  client-side from a type code. */
export const POLICY_TYPE_CATEGORY: Record<string, string> = {
  PARTICIPATION_POLICY: 'PARTICIPATION',
  MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY: 'PRECONDITION',
  PRICE_PROGRESSION_POLICY: 'PRICE_PROGRESSION',
  EXTENSION_POLICY: 'EXTENSION',
  KTH_PRICE_WINNER_DETERMINATION_POLICY: 'WINNER_DETERMINATION',
  KTH_WINNER_PRICE_DETERMINATION_POLICY: 'WINNER_PRICE_DETERMINATION',
};

export function categoryForPolicyType(type: unknown): string {
  const key = resolveStr(type);
  return POLICY_TYPE_CATEGORY[key] ?? key;
}

/** The price-progression sub-policy (window) types aren't part of the flat
 *  per-auction-type policy list — they're a fixed, small enum nested inside
 *  the PRICE_PROGRESSION_POLICY wrapper, so they're kept as a static list here. */
export const PRICE_CHANGE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'STEP_BASED_OFFER_PRICE_POLICY', label: 'Step Based Offer Price' },
  {
    value: 'FIXED_PERCENTAGE_BASED_OFFER_PRICE_POLICY',
    label: 'Fixed Percentage Based Offer Price',
  },
  {
    value: 'PERCENTAGE_RANGE_BASED_OFFER_PRICE_POLICY',
    label: 'Percentage Range Based Offer Price',
  },
  { value: 'CLOCK_BASED_PRICE_CHANGE_POLICY', label: 'Clock Based Price Change' },
];

export const POLICY_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  PARTICIPATION: 'Rules governing who can register and how their eligibility is verified',
  PRECONDITION: 'Conditions that must hold for the auction to proceed',
  PRICE_PROGRESSION: 'How the bid price moves over the lifetime of the auction',
  EXTENSION: 'How the end time extends when late bids arrive',
  WINNER_DETERMINATION: 'How the winning bid is selected',
  WINNER_PRICE_DETERMINATION: 'How the final price paid by the winner is calculated',
};

/** Canonical display order for policy categories — used everywhere a flat
 *  `PolicyItemRQ[]` needs to be grouped back into named sections. */
const POLICY_CATEGORY_ORDER = [
  'PARTICIPATION',
  'PRECONDITION',
  'PRICE_PROGRESSION',
  'EXTENSION',
  'WINNER_DETERMINATION',
  'WINNER_PRICE_DETERMINATION',
];

/**
 * Converts the flat bulk `/policies/evaluate` response (`Record<policyId, PolicyEvaluation>`)
 * into the shape the read-only card components expect (`Record<policyId, PolicyEvaluationMap>`),
 * keying each policy's evaluation by its name so `EvaluationList` renders one card per policy
 * instead of walking the evaluation's own fields (`result`, `description`, …) as keys.
 *
 * Composite policies (e.g. PRICE_PROGRESSION_POLICY wrapping STEP_BASED windows) evaluate to a
 * bare "see child policies" stub — their children's evaluations are folded into the parent's
 * entry so the parent card shows real results instead of a lone sentence.
 */
export function buildEvaluationsByPolicy(
  evaluations: PolicyEvaluationMap | null | undefined,
  savedPolicies: PolicyItemRQ[],
): Record<string, PolicyEvaluationMap> {
  const nameById = new Map<string, string>();
  const childrenById = new Map<string, PolicyItemRQ[]>();
  const collect = (list: PolicyItemRQ[]) => {
    for (const item of list) {
      if (item.id && item.name) nameById.set(item.id, item.name);
      if (item.id && item.policies?.length) {
        childrenById.set(item.id, item.policies);
        collect(item.policies);
      }
    }
  };
  collect(savedPolicies);

  const result: Record<string, PolicyEvaluationMap> = {};
  for (const [policyId, evaluation] of Object.entries(evaluations ?? {})) {
    if (!evaluation) continue;
    const name = nameById.get(policyId) ?? policyId;
    const entry: PolicyEvaluationMap = { [name]: evaluation };
    for (const child of childrenById.get(policyId) ?? []) {
      if (!child.id) continue;
      const childEval = evaluations?.[child.id];
      if (!childEval) continue;
      entry[child.name || child.id!] = childEval;
    }
    result[policyId] = entry;
  }
  return result;
}

/** Reads a PAYMENT_STEP's editable fields from the workflow step, falling back to
 *  the embedded payment policy object (`step.policy`) — the backend may return the
 *  payment config nested there instead of at the top level of the step. */
export function paymentStepData(step: AuctionWorkflowStep): {
  phase: string;
  mode: string;
  offset?: string;
  heads: PolicyHeadRQ[];
} {
  const policy = step.policy as (PolicyItemRQ & { phase?: string }) | undefined;
  return {
    phase: resolveStr(step.phase) || resolveStr(policy?.phase) || '',
    mode: resolveStr(step.mode) || resolveStr(policy?.mode) || '',
    offset: step.offset ?? policy?.schedule?.offset,
    heads: (step.heads?.length ? step.heads : policy?.heads) ?? [],
  };
}

/** True when a workflow step is a Pre Auction payment with at least one refundable
 *  head — such steps require a Bank Detail step positioned before them. */
export function isRefundablePrePayment(s: AuctionWorkflowStep): boolean {
  return (
    resolveStr(s.type) === 'PAYMENT_STEP' &&
    resolveStr(s.phase) === 'PRE_AUCTION' &&
    paymentStepData(s).heads.some((h) => h.refundable)
  );
}

export interface WorkflowStepTypesAllowed {
  /** Whether an Additional Details (Custom Form) Step may be added as Pre Auction / Post Auction at this position. */
  formPreAuction: boolean;
  formPostAuction: boolean;
  tnc: boolean;
  bank: boolean;
  prePayment: boolean;
  postPayment: boolean;
  participationForm: boolean;
}

/** Which step types may be inserted at a given 1-based insertion order.
 *  Enforces the workflow's structural rules:
 *  - Bank Details only before refundable Pre Auction payments (and only once per workflow).
 *  - Only Pre Auction payments may be inserted between a Pre Auction payment and its Bank Details.
 *  - Post Auction steps always form the final segment of the workflow. */
export function allowedStepTypesAt(
  workflow: AuctionWorkflowStep[],
  insertionOrder: number,
  hasTnCStep: boolean,
  hasBankDetailStep: boolean,
  hasParticipationFormStep = false,
): WorkflowStepTypesAllowed {
  const idx = insertionOrder - 1;
  const isPayment = (s: AuctionWorkflowStep | undefined, phase: string) =>
    !!s && resolveStr(s.type) === 'PAYMENT_STEP' && resolveStr(s.phase) === phase;
  const isBank = (s: AuctionWorkflowStep | undefined) =>
    !!s && resolveStr(s.type) === 'BANK_DETAIL_FORM_STEP';
  const isPostAuction = (s: AuctionWorkflowStep | undefined) =>
    !!s && resolveStr(s.phase) === 'POST_AUCTION';

  const prevStep = idx > 0 ? workflow[idx - 1] : undefined;
  const nextStep = idx < workflow.length ? workflow[idx] : undefined;

  // Any Post Auction step (payment or form) starts the post-auction tail — only
  // more Post Auction steps are allowed once the insertion point is in it.
  const firstPostIdx = workflow.findIndex((s) => isPostAuction(s));
  const inTail = firstPostIdx >= 0 && idx > firstPostIdx;
  const inPreBankGap = isPayment(prevStep, 'PRE_AUCTION') && isBank(nextStep);

  const earliestRefundablePreOrder = workflow
    .filter((s) => isRefundablePrePayment(s))
    .reduce<number | null>((min, s) => {
      const order = s.order ?? Infinity;
      return min === null || order < min ? order : min;
    }, null);

  const nonPostAllowed = !inTail && !inPreBankGap;
  const postAllowed = (firstPostIdx < 0 || idx >= firstPostIdx) && !inPreBankGap;
  return {
    formPreAuction: nonPostAllowed || inPreBankGap,
    formPostAuction: postAllowed,
    tnc: nonPostAllowed && !hasTnCStep,
    bank:
      nonPostAllowed &&
      !hasBankDetailStep &&
      (earliestRefundablePreOrder === null || insertionOrder <= earliestRefundablePreOrder),
    prePayment: nonPostAllowed || inPreBankGap,
    postPayment: postAllowed,
    participationForm: nonPostAllowed && !hasParticipationFormStep,
  };
}

/** Groups a flat policies array back into `[categoryKey, items]` pairs, in
 *  canonical category order (unknown categories trail, in first-seen order). */
export function groupPoliciesByCategory(items: PolicyItemRQ[]): [string, PolicyItemRQ[]][] {
  const byCategory = new Map<string, PolicyItemRQ[]>();
  for (const item of items) {
    const category = categoryForPolicyType(item.type);
    const bucket = byCategory.get(category);
    if (bucket) bucket.push(item);
    else byCategory.set(category, [item]);
  }
  const ordered: [string, PolicyItemRQ[]][] = [];
  for (const key of POLICY_CATEGORY_ORDER) {
    const bucket = byCategory.get(key);
    if (bucket) ordered.push([key, bucket]);
  }
  for (const [key, bucket] of byCategory) {
    if (!POLICY_CATEGORY_ORDER.includes(key)) ordered.push([key, bucket]);
  }
  return ordered;
}

export function PolicyInfoButton({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="More information"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-6 z-20 w-64 rounded-lg border border-border bg-popover p-3 shadow-md text-xs text-popover-foreground leading-relaxed">
            {description}
          </div>
        </>
      )}
    </div>
  );
}

export const SELECT_CLS =
  'w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-hidden focus:ring-2 focus:ring-ring disabled:opacity-60';

export const TEXTAREA_CLS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring resize-none';

export function moveItem<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const copy = [...arr];
  const j = i + dir;
  if (j < 0 || j >= copy.length) return copy;
  const tmp = copy[i]!;
  copy[i] = copy[j]!;
  copy[j] = tmp;
  return copy;
}

export function ordinalSuffix(n: string): string {
  const num = parseInt(n, 10);
  if (num === 1) return '1st';
  if (num === 2) return '2nd';
  if (num === 3) return '3rd';
  return `${num}th`;
}

/** Direction-aware rank label: FORWARD = "Highest", "2nd Highest"…  REVERSE = "Lowest", "2nd Lowest"… */
export function ordinalLabel(n: number, direction: string): string {
  const isForward = direction !== 'REVERSE';
  const base = isForward ? 'Highest' : 'Lowest';
  if (n === 1) return base;
  const suffix = n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
  return `${suffix} ${base}`;
}

export function SortButtons({
  index,
  total,
  onMove,
}: {
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === total - 1}
        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function DayHourDropdowns({
  daysValue,
  hoursValue,
  onDaysChange,
  onHoursChange,
  label,
  suffix,
}: {
  daysValue: string;
  hoursValue: string;
  onDaysChange: (v: string) => void;
  onHoursChange: (v: string) => void;
  label?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs font-medium">{label}</Label>}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={daysValue}
          onChange={(e) => onDaysChange(e.target.value)}
          className="w-24 rounded-md border border-input bg-background px-2 py-[7px] text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
        >
          <option value="">Select</option>
          {[1, 2, 3, 4, 5].map((d) => (
            <option key={d} value={String(d)}>
              {d}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">days</span>
        <select
          value={hoursValue}
          onChange={(e) => onHoursChange(e.target.value)}
          className="w-20 rounded-md border border-input bg-background px-2 py-[7px] text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={String(i)}>
              {i}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">hours{suffix ? ` ${suffix}` : ''}</span>
      </div>
    </div>
  );
}

/** Builds an ISO-8601 duration (e.g. "P1DT2H3M") from day/hour/minute parts,
 *  matching what `java.time.Duration.parse` accepts on the backend. */
export function formatOffsetDuration(days: string, hours: string, minutes: string): string {
  const d = parseInt(days || '0', 10) || 0;
  const h = parseInt(hours || '0', 10) || 0;
  const m = parseInt(minutes || '0', 10) || 0;
  return `P${d}DT${h}H${m}M`;
}

/** Inverse of {@link formatOffsetDuration} — tolerant of missing components. */
export function parseOffsetDuration(iso?: string): {
  days: string;
  hours: string;
  minutes: string;
} {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(iso ?? '');
  return {
    days: match?.[1] ?? '0',
    hours: match?.[2] ?? '0',
    minutes: match?.[3] ?? '0',
  };
}

/** Normalises an ISO-8601 duration into a compact label (e.g. "3d 2h 5m") —
 *  tolerant of pure-hour durations like PT72H by folding hours into days first. */
export function formatOffsetLabel(iso?: string): string {
  const raw = parseOffsetDuration(iso);
  const totalMinutes = Number(raw.days) * 24 * 60 + Number(raw.hours) * 60 + Number(raw.minutes);
  const d = Math.floor(totalMinutes / (24 * 60));
  const h = Math.floor((totalMinutes % (24 * 60)) / 60);
  const m = totalMinutes % 60;
  const parts = [d > 0 ? `${d}d` : null, h > 0 ? `${h}h` : null, m > 0 ? `${m}m` : null].filter(
    Boolean,
  );
  return parts.length ? parts.join(' ') : '0m';
}

/** Parses an ISO-8601 duration (`PnDTnHnMnS`, also weeks) into milliseconds.
 *  Returns 0 for absent/unparseable input, so `PT0S` ("till end") reads as 0. */
export function parseIsoDurationMs(iso?: string | null): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [w = 0, d = 0, h = 0, min = 0, s = 0] = m
    .slice(1)
    .map((part) => parseFloat(part ?? '0') || 0);
  return ((w * 7 + d) * 24 + h) * 3600000 + min * 60000 + s * 1000;
}

/** Humanizes milliseconds as a compact duration string, e.g. `25h 2m`, `1d 4h`, `10m`. */
export function humanizeIsoDuration(ms: number): string {
  if (!ms || ms <= 0) return '0m';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.length > 0 ? parts.join(' ') : '<1m';
}

/** Select-dropdown styling shared with the Price Progression window's Time Window fields. */
const OFFSET_SELECT_CLS =
  'w-20 rounded-md border border-input bg-background px-2 py-[7px] text-sm focus:outline-hidden focus:ring-2 focus:ring-ring';

export function DayHourMinuteFields({
  daysValue,
  hoursValue,
  minutesValue,
  onDaysChange,
  onHoursChange,
  onMinutesChange,
  label,
}: {
  daysValue: string;
  hoursValue: string;
  minutesValue: string;
  onDaysChange: (v: string) => void;
  onHoursChange: (v: string) => void;
  onMinutesChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs font-medium">{label}</Label>}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={daysValue}
          onChange={(e) => onDaysChange(e.target.value)}
          className={OFFSET_SELECT_CLS}
        >
          {Array.from({ length: 31 }, (_, d) => (
            <option key={d} value={String(d)}>
              {d}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">d</span>
        <select
          value={hoursValue}
          onChange={(e) => onHoursChange(e.target.value)}
          className={OFFSET_SELECT_CLS}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={String(h)}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">h</span>
        <select
          value={minutesValue}
          onChange={(e) => onMinutesChange(e.target.value)}
          className={OFFSET_SELECT_CLS}
        >
          {Array.from({ length: 60 }, (_, m) => (
            <option key={m} value={String(m)}>
              {m}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">min</span>
      </div>
    </div>
  );
}

export function NameDescriptionFields({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  nameId,
  descId,
  nameError,
}: {
  name: string;
  description: string;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  nameId: string;
  descId: string;
  nameError?: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={nameId} className="text-xs font-medium">
          Name
        </Label>
        <Input
          id={nameId}
          value={name ?? ''}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Policy name"
          className={cn(
            'text-sm',
            nameError ? 'border-destructive focus-visible:ring-destructive' : '',
          )}
        />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={descId} className="text-xs font-medium">
          Description
        </Label>
        <textarea
          id={descId}
          value={description ?? ''}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Brief description"
          rows={1}
          className={TEXTAREA_CLS}
        />
      </div>
    </div>
  );
}
