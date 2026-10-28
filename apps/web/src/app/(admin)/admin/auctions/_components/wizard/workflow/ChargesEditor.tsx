'use client';

import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Switch } from '@repo/ui';
import type { PolicyHeadRQ } from '@repo/api';
import { formatMoney } from '../../../_lib/wizard/summary';
import { emptyHead } from '../../../_lib/wizard/stepDraft';
import { inputClass, selectClass } from '../ui/wizard-ui';

/** Payment charges ("heads"): what is charged, how, and whether it's refunded,
 *  with the total worked out against an example price. */
export function ChargesEditor({
  heads,
  onChange,
  currencyUnit,
  baseName,
  exampleBase,
  examplePrefix,
  namePlaceholder,
  forWhom,
}: {
  heads: PolicyHeadRQ[];
  onChange: (heads: PolicyHeadRQ[]) => void;
  currencyUnit: string;
  /** "opening price" / "winning price": what a percentage is taken of. */
  baseName: string;
  exampleBase: number;
  /** "At an opening price of" / "If the winning price is". */
  examplePrefix: string;
  namePlaceholder: string;
  /** "participants" / "the winner". */
  forWhom: string;
}) {
  const symbol = formatMoney(0, currencyUnit).replace(/[\d.,\s]/g, '') || currencyUnit;
  const update = (index: number, patch: Partial<PolicyHeadRQ>) =>
    onChange(heads.map((head, i) => (i === index ? { ...head, ...patch } : head)));

  const amountOf = (head: PolicyHeadRQ, base: number) =>
    head.basis === 'PERCENTAGE_BASED'
      ? (base * (Number(head.value) || 0)) / 100
      : Number(head.value) || 0;
  const total = heads.reduce((sum, head) => sum + amountOf(head, exampleBase), 0);
  const refundable = heads
    .filter((head) => head.refundable)
    .reduce((sum, head) => sum + amountOf(head, exampleBase), 0);
  const formula =
    heads
      .map((head) =>
        head.basis === 'PERCENTAGE_BASED'
          ? `${head.value ?? 0}% of the ${baseName}`
          : formatMoney(head.value ?? 0, currencyUnit),
      )
      .join(' + ') || 'Nothing yet';

  return (
    <div className="space-y-2.5">
      <div role="table" aria-label="Charges" className="space-y-2">
        <div
          role="row"
          className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_150px_120px_96px_32px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid"
        >
          <span role="columnheader">Charge</span>
          <span role="columnheader">What it’s for</span>
          <span role="columnheader">Charged as</span>
          <span role="columnheader">Value</span>
          <span role="columnheader">Refundable</span>
          <span role="columnheader" className="sr-only">
            Remove
          </span>
        </div>
        {heads.map((head, index) => (
          <div
            key={index}
            role="row"
            className="grid grid-cols-2 items-center gap-2 rounded-md border border-border p-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_150px_120px_96px_32px] lg:border-0 lg:p-0"
          >
            <input
              aria-label="Charge name"
              placeholder={namePlaceholder}
              value={head.name ?? ''}
              onChange={(event) => update(index, { name: event.target.value })}
              className={`${inputClass} col-span-2 h-9 lg:col-span-1`}
            />
            <input
              aria-label="What it is for"
              placeholder={`Shown to ${forWhom}`}
              value={head.description ?? ''}
              onChange={(event) => update(index, { description: event.target.value })}
              className={`${inputClass} col-span-2 h-9 lg:col-span-1`}
            />
            <select
              aria-label="Charged as"
              value={head.basis ?? 'AMOUNT_BASED'}
              onChange={(event) => update(index, { basis: event.target.value })}
              className={`${selectClass} h-9`}
            >
              <option value="AMOUNT_BASED">Fixed amount ({symbol})</option>
              <option value="PERCENTAGE_BASED">% of the {baseName}</option>
            </select>
            <div className="flex h-9 items-center overflow-hidden rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
              <span className="border-r border-border px-2 text-xs text-muted-foreground">
                {head.basis === 'PERCENTAGE_BASED' ? '%' : symbol}
              </span>
              <input
                type="number"
                min={0}
                step="any"
                aria-label="Value"
                value={head.value ?? ''}
                onChange={(event) => update(index, { value: Number(event.target.value) })}
                className="h-full w-full bg-transparent px-2 text-sm tabular-nums outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <Switch
                aria-label="Refundable"
                checked={Boolean(head.refundable)}
                onCheckedChange={(checked) => update(index, { refundable: checked })}
              />
              {head.refundable ? 'Yes' : 'No'}
            </label>
            <button
              type="button"
              aria-label={`Remove ${head.name || `charge ${index + 1}`}`}
              disabled={heads.length === 1}
              onClick={() => onChange(heads.filter((_, i) => i !== index))}
              className="flex h-8 w-8 items-center justify-center justify-self-end rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      {heads.length === 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Add at least one charge.
        </p>
      )}
      <button
        type="button"
        onClick={() => onChange([...heads, emptyHead()])}
        className="inline-flex items-center gap-1 rounded-sm text-[11px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-3 w-3" aria-hidden />
        Add a charge
      </button>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-md bg-muted/40 px-3 py-2.5 text-xs">
        <dt className="text-muted-foreground">Total due</dt>
        <dd className="text-foreground">{formula}</dd>
        <dt className="text-muted-foreground">
          {examplePrefix} {formatMoney(exampleBase, currencyUnit)}
        </dt>
        <dd className="font-semibold tabular-nums text-foreground">
          {formatMoney(total, currencyUnit)}
        </dd>
        <dt className="text-muted-foreground">Refundable part</dt>
        <dd className="tabular-nums text-foreground">{formatMoney(refundable, currencyUnit)}</dd>
      </dl>
    </div>
  );
}
