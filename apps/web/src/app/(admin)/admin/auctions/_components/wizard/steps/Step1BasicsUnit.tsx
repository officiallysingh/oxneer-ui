'use client';

import { useMemo, useState } from 'react';
import { Package, Trash2 } from 'lucide-react';
import type { ListingSummaryVM } from '@repo/api';
import { ListingSearchField } from '../../../_components/ListingSearchField';
import { ListingViewDialog } from '../../../../listings/_components/ListingViewDialog';
import type { BasicsState, SelectedListing } from '../../../_lib/wizard/types';
import {
  ChoiceCard,
  Field,
  MoneyField,
  WizardRow,
  WizardSection,
  inputClass,
  selectClass,
} from '../ui/wizard-ui';
import { formatMoney } from '../../../_lib/wizard/summary';
import { PRESETS } from '../../../_lib/wizard/steps';

const CURRENCIES = [
  { value: 'INR', label: 'INR: Indian rupee (₹)' },
  { value: 'USD', label: 'USD: US dollar ($)' },
  { value: 'EUR', label: 'EUR: Euro (€)' },
  { value: 'GBP', label: 'GBP: British pound (£)' },
  { value: 'AED', label: 'AED: UAE dirham (د.إ)' },
  { value: 'SGD', label: 'SGD: Singapore dollar (S$)' },
];

const TIME_ZONES = [
  { value: 'Asia/Kolkata', label: 'IST: Asia/Kolkata' },
  { value: 'Asia/Dubai', label: 'GST: Asia/Dubai' },
  { value: 'Asia/Singapore', label: 'SGT: Asia/Singapore' },
  { value: 'Europe/London', label: 'GMT: Europe/London' },
  { value: 'America/New_York', label: 'EST: America/New_York' },
];

function currencySymbol(code: string): string {
  return (
    {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
      AED: 'د.إ',
      SGD: 'S$',
    }[code] ?? code
  );
}

export function Step1BasicsUnit({
  form,
  onChange,
  errors,
}: {
  form: BasicsState;
  onChange: (patch: Partial<BasicsState>) => void;
  errors: Record<string, string>;
}) {
  const [viewListingId, setViewListingId] = useState<string | null>(null);
  const isForward = form.direction === 'FORWARD';
  const isSingle = form.unitType === 'SINGLE_UNIT';
  const symbol = currencySymbol(form.currencyUnit);
  const openingLabel = isForward ? 'Opening price' : 'Starting price';
  const reserveLabel = isForward ? 'Reserve price' : 'Maximum price';
  const who = isForward ? 'bidders' : 'suppliers';
  const Who = isForward ? 'Bidders' : 'Suppliers';

  const totalQuantity = useMemo(
    () => form.items.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0),
    [form.items],
  );

  const addListing = (id: string, name: string, summary: ListingSummaryVM, quantity: string) => {
    const nextItem: SelectedListing = {
      id,
      name,
      description: summary.description,
      quantity: quantity || '1',
      availableQuantity: summary.availableQuantity,
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
          <div className="grid gap-2 sm:grid-cols-3">
            <ChoiceCard
              title="Simple"
              code="SIMPLE"
              description={
                isForward
                  ? 'One unit, one round. For example, selling a used car.'
                  : 'One unit, one round. For example, buying school uniforms.'
              }
              selected
              onClick={() => {}}
            />
            <ChoiceCard
              title="Multi-round"
              code="MULTI_ROUND"
              description="One round per unit: parallel, sequential or staggered."
              disabled
              badge={<span className="text-[10px] font-medium text-warning">Coming later</span>}
              onClick={() => {}}
            />
            <ChoiceCard
              title="Multi-stage"
              code="MULTI_STAGE"
              description="Stages with their own rules, such as a sealed qualifier and then a live auction."
              disabled
              badge={<span className="text-[10px] font-medium text-warning">Coming later</span>}
              onClick={() => {}}
            />
          </div>
        </WizardRow>

        <WizardRow
          label="Direction"
          description="Selling or buying. This changes wording and limits in later sections."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              title="Forward (selling)"
              description="Buyers bid the price up. The highest bid wins."
              selected={isForward}
              onClick={() => onChange({ direction: 'FORWARD' })}
            />
            <ChoiceCard
              title="Reverse (buying)"
              description="Suppliers bid the price down. The lowest ask wins."
              selected={!isForward}
              onClick={() => onChange({ direction: 'REVERSE' })}
            />
          </div>
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
                className={`${inputClass} font-mono`}
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
              className={`${inputClass} resize-y`}
            />
          </Field>
        </WizardRow>

        <WizardRow
          label="Who can join"
          description="Private auctions are invite-only. You invite people after you publish."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              title="Public"
              description="Any registered user can join."
              selected={form.accessibility === 'PUBLIC'}
              onClick={() => onChange({ accessibility: 'PUBLIC' })}
            />
            <ChoiceCard
              title="Private"
              description="Only people you invite, once it's published."
              selected={form.accessibility === 'PRIVATE'}
              onClick={() => onChange({ accessibility: 'PRIVATE' })}
            />
          </div>
        </WizardRow>

        <WizardRow label="Money and time" description="Used for every price and deadline.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Currency" htmlFor="currency">
              <select
                id="currency"
                value={form.currencyUnit}
                onChange={(e) => onChange({ currencyUnit: e.target.value })}
                className={selectClass}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Time zone" htmlFor="timezone">
              <select
                id="timezone"
                value={form.timeZone}
                onChange={(e) => onChange({ timeZone: e.target.value })}
                className={selectClass}
              >
                {TIME_ZONES.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </Field>
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
          <div className="grid gap-2 sm:grid-cols-3">
            <ChoiceCard
              title="Single Unit"
              description={
                isForward
                  ? 'One item and its quantity, sold as a whole.'
                  : 'One item and its quantity, bought as a whole.'
              }
              selected={isSingle}
              onClick={() => onChange({ unitType: 'SINGLE_UNIT', items: form.items.slice(0, 1) })}
            />
            <ChoiceCard
              title="Bundle"
              description={
                isForward
                  ? 'One or more items, each with its quantity, sold as a whole.'
                  : 'One or more items, each with its quantity, bought as a whole.'
              }
              selected={!isSingle}
              onClick={() => onChange({ unitType: 'BUNDLE' })}
            />
            <ChoiceCard
              title="Multi Unit"
              description={
                isForward
                  ? 'Bidders choose a quantity and a price per piece.'
                  : 'Suppliers choose a quantity and a price per piece.'
              }
              disabled
              badge={<span className="text-[10px] font-medium text-warning">Coming later</span>}
              onClick={() => {}}
            />
          </div>
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
            <ListingSearchField addMode onSelect={addListing} />
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
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
              <button
                type="button"
                role="switch"
                aria-checked={form.reserveEnabled}
                aria-label="Reserve price"
                onClick={() => onChange({ reserveEnabled: !form.reserveEnabled })}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  form.reserveEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${
                    form.reserveEnabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
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
                              : `${who} see only whether it is met`
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
                      ['MET_ONLY', 'Only "reserve met"', `${Who} see whether it has been reached.`],
                    ].map(([value, title, description]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          onChange({ reserveVisibility: value as BasicsState['reserveVisibility'] })
                        }
                        className={`flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left last:border-b-0 ${
                          form.reserveVisibility === value
                            ? 'bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]'
                            : 'bg-background hover:bg-muted/30'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                            form.reserveVisibility === value
                              ? 'border-primary'
                              : 'border-muted-foreground/50'
                          }`}
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
