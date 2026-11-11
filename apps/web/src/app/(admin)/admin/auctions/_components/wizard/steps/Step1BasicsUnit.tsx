'use client';

import { useMemo, useState } from 'react';
import { Package, Trash2 } from 'lucide-react';
import { Switch, Tooltip, TooltipContent, TooltipTrigger, cn } from '@repo/ui';
import type { ListingSummaryVM } from '@repo/api';
import { ListingPicker } from '../basics/ListingPicker';
import { ListingViewDialog } from '../../../../listings/_components/ListingViewDialog';
import type { SelectOption } from '../../../_components/AuctionShared';
import type { CurrencySelectOption } from '../../../_hooks/useAuctionLookups';
import type { BasicsState, SelectedListing } from '../../../_lib/wizard/types';
import {
  ChoiceCardGroup,
  Field,
  MoneyField,
  WizardRow,
  WizardSection,
  inputClass,
  selectClass,
} from '../ui/wizard-ui';
import { formatMoney } from '../../../_lib/wizard/summary';
import { PRESETS } from '../../../_lib/wizard/steps';

// Currencies and time zones are configured on the server and come from
// /model/currencies and /model/time-zones. These short lists are used only if
// those calls fail.
const FALLBACK_CURRENCIES: CurrencySelectOption[] = [
  { value: 'INR', label: 'Indian rupee', symbol: '₹', decimals: 2 },
  { value: 'USD', label: 'US dollar', symbol: '$', decimals: 2 },
  { value: 'EUR', label: 'Euro', symbol: '€', decimals: 2 },
  { value: 'AED', label: 'UAE dirham', symbol: 'AED', decimals: 2 },
];

const FALLBACK_TIME_ZONES: SelectOption[] = [
  { value: 'Asia/Kolkata', label: 'IST: Asia/Kolkata' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Dubai', label: 'GST: Asia/Dubai' },
  { value: 'Asia/Singapore', label: 'SGT: Asia/Singapore' },
];

/** A rounding mode: `value` is the java.math.RoundingMode name the API takes. */
interface RoundingChoice {
  value: string;
  label: string;
  summary: string;
  description: string;
  useWhen: string;
  recommended: boolean;
  /** A calculated amount and what it rounds to, at two decimal places. */
  examples: { calculated: string; rounded: string }[];
}

// The rounding modes offered, fixed in the UI.
const ROUNDING_MODES: RoundingChoice[] = [
  {
    value: 'HALF_UP',
    label: 'Nearest, halves up',
    summary: 'Standard rounding. A half goes up.',
    description: 'Rounds to the nearest unit. When the dropped part is exactly half, it rounds up.',
    useWhen: 'Most auctions: fees, deposits and percentage prices.',
    recommended: true,
    examples: [
      { calculated: '24.671', rounded: '24.67' },
      { calculated: '24.675', rounded: '24.68' },
      { calculated: '24.685', rounded: '24.69' },
    ],
  },
  {
    value: 'HALF_EVEN',
    label: 'Nearest, halves to even',
    summary: 'Banker’s rounding. Fairest over many amounts.',
    description:
      'Rounds to the nearest unit. An exact half goes to the even digit, so totals don’t drift.',
    useWhen: 'Many small amounts added up, like charges across many participants.',
    recommended: false,
    examples: [
      { calculated: '24.671', rounded: '24.67' },
      { calculated: '24.675', rounded: '24.68' },
      { calculated: '24.685', rounded: '24.68' },
    ],
  },
  {
    value: 'UP',
    label: 'Always up',
    summary: 'Any leftover fraction rounds up.',
    description: 'Never rounds down: any amount beyond the last unit goes up to the next one.',
    useWhen: 'An amount must never fall short, like a minimum deposit you collect.',
    recommended: false,
    examples: [
      { calculated: '24.671', rounded: '24.68' },
      { calculated: '24.675', rounded: '24.68' },
      { calculated: '24.685', rounded: '24.69' },
    ],
  },
  {
    value: 'DOWN',
    label: 'Always down',
    summary: 'Drops the leftover fraction.',
    description: 'Never rounds up: anything beyond the last unit is dropped.',
    useWhen: 'An amount must never be overcharged, like a refund or a cap.',
    recommended: false,
    examples: [
      { calculated: '24.671', rounded: '24.67' },
      { calculated: '24.675', rounded: '24.67' },
      { calculated: '24.685', rounded: '24.68' },
    ],
  },
];

// Fixed enums: `value` is what the API takes; the copy is the design's.
interface Choice<V extends string> {
  value: V;
  title: string;
  description: string;
  code?: string;
  /** Not built yet: shown, but can't be picked. */
  later?: boolean;
}

const AUCTION_TYPES: Choice<string>[] = [
  {
    value: 'SIMPLE',
    title: 'Simple',
    code: 'SIMPLE',
    description: 'One unit, one round. For example, selling a used car.',
  },
  {
    value: 'MULTI_ROUND',
    title: 'Multi-round',
    code: 'MULTI_ROUND',
    description: 'One round per unit: parallel, sequential or staggered.',
    later: true,
  },
  {
    value: 'MULTI_STAGE',
    title: 'Multi-stage',
    code: 'MULTI_STAGE',
    description: 'Stages with their own rules, such as a sealed qualifier and then a live auction.',
    later: true,
  },
];

const DIRECTIONS: Choice<BasicsState['direction']>[] = [
  {
    value: 'FORWARD',
    title: 'Forward (selling)',
    description: 'Buyers bid the price up. The highest bid wins.',
  },
  {
    value: 'REVERSE',
    title: 'Reverse (buying)',
    description: 'Suppliers bid the price down. The lowest ask wins.',
  },
];

const ACCESSIBILITY: Choice<BasicsState['accessibility']>[] = [
  { value: 'PUBLIC', title: 'Public', description: 'Any registered user can join.' },
  {
    value: 'PRIVATE',
    title: 'Private',
    description: 'Only people you invite, once it’s published.',
  },
];

function unitTypes(forward: boolean): Choice<string>[] {
  const soldOrBought = forward ? 'sold' : 'bought';
  return [
    {
      value: 'SINGLE_UNIT',
      title: 'Single Unit',
      description: `One item and its quantity, ${soldOrBought} as a whole.`,
    },
    {
      value: 'BUNDLE',
      title: 'Bundle',
      description: `One or more items, each with its quantity, ${soldOrBought} as a whole.`,
    },
    {
      value: 'MULTI_UNIT',
      title: 'Multi Unit',
      description: `${forward ? 'Bidders' : 'Suppliers'} choose a quantity and a price per piece.`,
      later: true,
    },
  ];
}

/** "INR: Indian rupee (₹)", unless the API's label already reads that way. */
function currencyLabel(currency: CurrencySelectOption): string {
  if (currency.label.startsWith(currency.value)) return currency.label;
  const symbol =
    currency.symbol && currency.symbol !== currency.value ? ` (${currency.symbol})` : '';
  return `${currency.value}: ${currency.label}${symbol}`;
}

const decimalsText = (decimals: number) =>
  decimals === 0 ? 'no decimal places' : `${decimals} decimal places`;

export function Step1BasicsUnit({
  form,
  onChange,
  currencies,
  timeZones,
  errors,
}: {
  form: BasicsState;
  onChange: (patch: Partial<BasicsState>) => void;
  /** Currencies from /model/currencies. */
  currencies: CurrencySelectOption[];
  /** Time zones from /model/time-zones. */
  timeZones: SelectOption[];
  errors: Record<string, string>;
}) {
  const [viewListingId, setViewListingId] = useState<string | null>(null);
  const isForward = form.direction === 'FORWARD';
  const isSingle = form.unitType === 'SINGLE_UNIT';
  const currencyOptions = currencies.length ? currencies : FALLBACK_CURRENCIES;
  const timeZoneOptions = timeZones.length ? timeZones : FALLBACK_TIME_ZONES;
  const currency = currencyOptions.find((option) => option.value === form.currencyUnit);
  const symbol = currency?.symbol || form.currencyUnit;
  const decimals = currency?.decimals ?? 2;
  const openingLabel = isForward ? 'Opening price' : 'Starting price';
  const reserveLabel = isForward ? 'Reserve price' : 'Maximum price';
  const who = isForward ? 'bidders' : 'suppliers';
  const Who = isForward ? 'Bidders' : 'Suppliers';
  const comingLater = <span className="text-[10px] font-medium text-warning">Coming later</span>;
  const choiceOptions = <V extends string>(choices: Choice<V>[]) =>
    choices.map((choice) => ({
      value: choice.value,
      title: choice.title,
      code: choice.code,
      description: choice.description,
      disabled: Boolean(choice.later),
      badge: choice.later ? comingLater : undefined,
    }));

  const totalQuantity = useMemo(
    () => form.items.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0),
    [form.items],
  );

  const addListing = (
    id: string,
    name: string,
    summary: ListingSummaryVM & { subCategoryId?: string },
    quantity: string,
  ) => {
    const nextItem: SelectedListing = {
      id,
      name,
      description: summary.description,
      quantity: quantity || '1',
      availableQuantity: summary.availableQuantity,
      subCategoryId: summary.subCategoryId,
      summary,
    };
    const items = isSingle
      ? [nextItem]
      : form.items.some((item) => item.id === id)
        ? form.items
        : [...form.items, nextItem];
    // Keep the unit type the user chose — adding a second item to a Bundle or
    // removing one from it must not silently switch Single Unit / Bundle.
    onChange({ items, unitName: form.unitName || name });
  };

  const removeItem = (id: string) => {
    onChange({ items: form.items.filter((item) => item.id !== id) });
  };

  const setQuantity = (id: string, quantity: string) => {
    const cleaned = Math.max(1, parseInt(quantity, 10) || 1);
    onChange({
      items: form.items.map((item) =>
        item.id === id ? { ...item, quantity: String(cleaned) } : item,
      ),
    });
  };

  return (
    <div className="space-y-4">
      <WizardSection
        title="The auction"
        hint={isForward ? 'How it runs, and who can join.' : 'How it runs, and who can join.'}
      >
        <WizardRow label="Auction type" description="Decides how rounds and stages run.">
          <ChoiceCardGroup<string>
            label="Auction type"
            value={form.format}
            // Only SIMPLE is supported, and it's already selected.
            onChange={() => {}}
            options={choiceOptions(AUCTION_TYPES)}
          />
        </WizardRow>

        <WizardRow
          label="Direction"
          description="Selling or buying. This changes wording and limits in later sections."
        >
          <ChoiceCardGroup<string>
            label="Direction"
            columns={2}
            value={form.direction}
            onChange={(direction) => onChange({ direction: direction as BasicsState['direction'] })}
            options={choiceOptions(DIRECTIONS)}
          />
        </WizardRow>

        <WizardRow
          label="Preset"
          description="Optional. Fills in Bidding and Award. You can still change anything."
        >
          <Field label="Start from" htmlFor="preset" className="max-w-md">
            <select
              id="preset"
              value={form.preset}
              onChange={(e) => onChange({ preset: e.target.value })}
              className={selectClass}
            >
              {PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </Field>
        </WizardRow>

        <WizardRow label="About the auction" description="What bidders see first.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" htmlFor="title" error={errors.title}>
              <input
                id="title"
                value={form.title}
                maxLength={100}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder={
                  isForward ? 'Used car sale: Toyota Innova 2019' : 'School uniform supply'
                }
                className={inputClass}
              />
            </Field>
            <Field label="Reference ID" htmlFor="referenceId" optional>
              <input
                id="referenceId"
                value={form.referenceId}
                onChange={(e) => onChange({ referenceId: e.target.value })}
                placeholder="e.g. AXN_0001"
                className={cn(inputClass, 'font-mono')}
              />
            </Field>
          </div>
          <Field label="Description" htmlFor="description" optional className="mt-3">
            <textarea
              id="description"
              rows={3}
              value={form.description}
              maxLength={2000}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder={
                isForward
                  ? 'What bidders should know before they join'
                  : 'What suppliers should know before they join'
              }
              className={cn(inputClass, 'resize-y')}
            />
          </Field>
        </WizardRow>

        <WizardRow
          label="Who can join"
          description="Private auctions are invite-only. You invite people after you publish."
        >
          <ChoiceCardGroup<string>
            label="Who can join"
            columns={2}
            value={form.accessibility}
            onChange={(accessibility) =>
              onChange({ accessibility: accessibility as BasicsState['accessibility'] })
            }
            options={choiceOptions(ACCESSIBILITY)}
          />
        </WizardRow>

        <WizardRow
          label="Regional settings"
          description="Currency, time zone and how calculated amounts are rounded."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Currency" htmlFor="currency">
              <select
                id="currency"
                value={form.currencyUnit}
                onChange={(e) => onChange({ currencyUnit: e.target.value })}
                aria-describedby="currency-hint"
                className={selectClass}
              >
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {currencyLabel(option)}
                  </option>
                ))}
              </select>
              <p id="currency-hint" className="mt-1.5 text-[11px] text-muted-foreground">
                {form.currencyUnit} amounts use {decimalsText(decimals)}. Set by the currency, so
                prices, fees and payments always match what can be charged.
              </p>
            </Field>
            <Field label="Time zone" htmlFor="timezone">
              <select
                id="timezone"
                value={form.timeZone}
                onChange={(e) => onChange({ timeZone: e.target.value })}
                className={selectClass}
              >
                {timeZoneOptions.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 space-y-2">
            <p
              id="rounding-label"
              className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Rounding mode
            </p>
            <div
              role="radiogroup"
              aria-labelledby="rounding-label"
              aria-describedby="rounding-hint"
              className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
            >
              {ROUNDING_MODES.map((mode) => {
                const selected = form.roundingMode === mode.value;
                const card = (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange({ roundingMode: mode.value })}
                    className={cn(
                      'flex h-full w-full flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/40',
                    )}
                  >
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">{mode.label}</span>
                      {mode.recommended && (
                        <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                          Recommended
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{mode.summary}</span>
                  </button>
                );
                // Hovering or focusing a mode shows what it does and when to use it.
                return (
                  <Tooltip key={mode.value}>
                    <TooltipTrigger asChild>{card}</TooltipTrigger>
                    <TooltipContent className="max-w-xs space-y-1.5 text-xs leading-relaxed">
                      <p className="font-semibold">{mode.label}</p>
                      <p>{mode.description}</p>
                      <table className="w-full font-mono tabular-nums">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="text-left font-medium">Calculated</th>
                            <th className="text-right font-medium">Rounded</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mode.examples.map((example) => (
                            <tr key={example.calculated}>
                              <td>{example.calculated}</td>
                              <td className="text-right font-semibold">{example.rounded}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-muted-foreground">{mode.useWhen}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <p id="rounding-hint" className="text-[11px] text-muted-foreground">
              Applies to every amount the platform works out, such as percentage prices, fees and
              deposits. Amounts are kept to {decimalsText(decimals)}, as the currency sets. Hover
              over an option for an example.
            </p>
          </div>
        </WizardRow>
      </WizardSection>

      <WizardSection
        title="The unit"
        hint={
          isForward
            ? 'What you are selling. A Single Unit or a Bundle is won whole by one winner.'
            : 'What you are buying. A Single Unit or a Bundle is awarded whole to one supplier.'
        }
      >
        <WizardRow
          label="Unit type"
          description={
            isForward
              ? 'Single Units and Bundles are atomic: one price, one winner, no partial awards.'
              : 'Single Units and Bundles are atomic: one price, one winner, no partial awards.'
          }
        >
          <ChoiceCardGroup<string>
            label="Unit type"
            columns={4}
            value={form.unitType}
            onChange={(next) => {
              const unitType = next as BasicsState['unitType'];
              // A Single Unit holds one listing.
              onChange(
                unitType === 'SINGLE_UNIT'
                  ? { unitType, items: form.items.slice(0, 1) }
                  : { unitType },
              );
            }}
            options={choiceOptions(unitTypes(isForward))}
          />
        </WizardRow>

        <WizardRow
          label="Name"
          description={
            isForward
              ? 'What bidders see as the thing being sold.'
              : 'What suppliers see as the thing being bought.'
          }
        >
          <Field label="Unit name" htmlFor="unitName" error={errors.unitName}>
            <input
              id="unitName"
              value={form.unitName}
              maxLength={160}
              onChange={(e) => onChange({ unitName: e.target.value })}
              placeholder={isForward ? 'Toyota Innova 2019' : '1,000 school uniforms'}
              className={inputClass}
            />
          </Field>
        </WizardRow>

        <WizardRow
          label={isForward ? 'Items' : 'Required items'}
          description={
            isForward
              ? 'Pick listings from your catalogue. Quantities are reserved from stock, so the same stock cannot be offered twice.'
              : 'Describe what you need. Reverse auctions buy against a requirement, so no stock is reserved.'
          }
        >
          <div className="space-y-2">
            <ListingPicker
              selectedIds={form.items.map((item) => item.id)}
              single={isSingle}
              forward={isForward}
              onAdd={(listing) => addListing(listing.id, listing.name, listing, '1')}
            />
            {form.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-center">
                <Package className="h-7 w-7 text-muted-foreground/40" aria-hidden />
                <p className="text-xs text-muted-foreground">
                  No {isForward ? 'listings' : 'requirements'} added yet.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                <div className="grid grid-cols-[24px_minmax(0,1fr)_92px_28px] items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>#</span>
                  <span>{isForward ? 'Listing' : 'Requirement'}</span>
                  <span>Quantity</span>
                  <span />
                </div>
                <div className="divide-y divide-border/60">
                  {form.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[24px_minmax(0,1fr)_92px_28px] items-center gap-2 px-3 py-2"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setViewListingId(item.id)}
                          className="block max-w-full truncate text-left text-xs font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {item.name}
                        </button>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {item.availableQuantity !== undefined
                            ? `${item.availableQuantity} available in stock`
                            : (item.description ?? 'Selected listing')}
                        </p>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={item.availableQuantity}
                        value={item.quantity}
                        onChange={(e) => setQuantity(item.id, e.target.value)}
                        className="h-7 w-full rounded border border-input bg-background px-1.5 text-xs tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        aria-label={`Quantity for ${item.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {errors.items && <p className="text-[11px] text-destructive">{errors.items}</p>}
            {isSingle && form.items.length === 1 && (
              <p className="text-[11px] text-muted-foreground">
                Single Unit · {totalQuantity} × {form.items[0]!.name}
              </p>
            )}
            {!isSingle && form.items.length > 1 && (
              <button
                type="button"
                onClick={() => onChange({ items: [] })}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Clear all items
              </button>
            )}
          </div>
        </WizardRow>

        <WizardRow
          label={openingLabel}
          description={
            isForward
              ? 'Where bidding starts, for the whole unit. Bids go up from here.'
              : 'Where bidding starts, for the whole unit. Asks come down from here.'
          }
        >
          <div className="max-w-[200px]">
            <MoneyField
              id="openingPrice"
              value={form.openingPrice}
              currency={symbol}
              onChange={(value) => onChange({ openingPrice: value })}
              error={errors.openingPrice}
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {form.openingPrice
                ? `${formatMoney(form.openingPrice, form.currencyUnit)} for the whole unit`
                : 'Set the price the unit opens at.'}
            </p>
          </div>
        </WizardRow>

        <WizardRow
          label={reserveLabel}
          description={
            isForward
              ? 'The lowest price you will accept. Below it, nothing is sold.'
              : 'The highest price you will pay. Above it, nothing is awarded.'
          }
        >
          <div className="space-y-2.5">
            <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-foreground">
              <Switch
                checked={form.reserveEnabled}
                onCheckedChange={(reserveEnabled) => onChange({ reserveEnabled })}
              />
              {form.reserveEnabled
                ? isForward
                  ? 'Reserve price on'
                  : 'Maximum price on'
                : isForward
                  ? 'No reserve price'
                  : 'No maximum price'}
            </label>
            {form.reserveEnabled && (
              <>
                <div className="max-w-[200px]">
                  <MoneyField
                    value={form.reserveAmount}
                    currency={symbol}
                    onChange={(value) => onChange({ reserveAmount: value })}
                    error={errors.reserveAmount}
                  />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {form.reserveAmount
                      ? `${formatMoney(form.reserveAmount, form.currencyUnit)}, ${
                          form.reserveVisibility === 'HIDDEN'
                            ? `${who} do not see it`
                            : form.reserveVisibility === 'SHOWN'
                              ? `${who} see the amount`
                              : `${who} see it once it is met`
                        }`
                      : 'Add the amount you want to protect.'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Who sees the reserve
                  </p>
                  <div className="overflow-hidden rounded-md border border-border">
                    {[
                      ['HIDDEN', 'Hidden', `${Who} do not see it.`],
                      ['SHOWN', 'Shown', `${Who} see the amount.`],
                      [
                        'MET_ONLY',
                        'Shown once met',
                        `${Who} see it only after ${isForward ? 'a bid' : 'an ask'} reaches it.`,
                      ],
                    ].map(([value, title, description]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          onChange({ reserveVisibility: value as BasicsState['reserveVisibility'] })
                        }
                        className={cn(
                          'flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left last:border-b-0',
                          form.reserveVisibility === value
                            ? 'bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]'
                            : 'bg-background hover:bg-muted/30',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
                            form.reserveVisibility === value
                              ? 'border-primary'
                              : 'border-muted-foreground/50',
                          )}
                        >
                          {form.reserveVisibility === value && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </span>
                        <span>
                          <span className="block text-xs font-semibold text-foreground">
                            {title}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </WizardRow>
      </WizardSection>

      <ListingViewDialog listingId={viewListingId} onClose={() => setViewListingId(null)} />
    </div>
  );
}
