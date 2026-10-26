'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Zap } from 'lucide-react';
import { Button } from '@repo/ui';
import type { OfferState, PriceWindow, ScheduleState } from '../../../_lib/wizard/types';
import type { SelectOption } from '../../../_components/AuctionShared';
import {
  ChoiceCard,
  ChoiceList,
  DurationFields,
  Field,
  MoneyField,
  MutedNote,
  OptionRow,
  PolicyBadge,
  WizardRow,
  WizardSection,
  inputClass,
  selectClass,
} from '../ui/wizard-ui';
import { formatMoney, formatTime, windowSummary } from '../../../_lib/wizard/summary';

const MOVE_OPTIONS: { value: PriceWindow['type']; label: string; description: string }[] = [
  {
    value: 'STEP',
    label: 'Fixed step (₹ jumps)',
    description: 'Each bid moves the price by whole steps of one amount.',
  },
  {
    value: 'PERCENT',
    label: 'Fixed percentage',
    description: 'Each bid moves the price by the same percentage.',
  },
  {
    value: 'RANGE',
    label: 'Percentage range',
    description: 'Each bid moves the price by a percentage between two limits.',
  },
];

const JUMP_PRESETS = [1, 2, 3, 5, 10];

function parsePercent(value: string) {
  return parseFloat(value) || 0;
}

function parseAmount(value: string) {
  return parseFloat(value) || 0;
}

function nextBids(
  window: PriceWindow,
  opening: string,
  direction: 'FORWARD' | 'REVERSE',
  symbol: string,
) {
  const base = parseAmount(opening);
  if (!base) return 'Set an opening price to preview valid bids.';
  const sign = direction === 'FORWARD' ? 1 : -1;
  if (window.type === 'STEP') {
    const amount = parseAmount(window.value);
    const multipliers = window.steps.length ? window.steps : [1];
    return multipliers
      .slice()
      .sort((a, b) => a - b)
      .map((m) => formatMoney(base + sign * amount * m, 'INR').replace('₹', symbol))
      .join(' · ');
  }
  if (window.type === 'PERCENT') {
    const pct = parsePercent(window.value) / 100;
    return formatMoney(base * (1 + sign * pct), 'INR').replace('₹', symbol);
  }
  const low = parsePercent(window.value) / 100;
  const high = parsePercent(window.maxValue) / 100;
  const a = base * (1 + sign * low);
  const b = base * (1 + sign * high);
  return `${formatMoney(Math.min(a, b), 'INR').replace('₹', symbol)} to ${formatMoney(
    Math.max(a, b),
    'INR',
  ).replace('₹', symbol)}`;
}

function windowRange(index: number, windows: PriceWindow[], schedule: ScheduleState) {
  const start = schedule.startTime ? new Date(schedule.startTime) : null;
  if (!start || Number.isNaN(start.getTime())) return `Window ${index + 1}`;
  const cursor = new Date(start);
  for (let i = 0; i < index; i += 1) {
    const { hours, minutes } = windowDuration(windows[i]!);
    cursor.setHours(cursor.getHours() + hours);
    cursor.setMinutes(cursor.getMinutes() + minutes);
  }
  const end = new Date(cursor);
  const { hours, minutes } = windowDuration(windows[index]!);
  end.setHours(end.getHours() + hours);
  end.setMinutes(end.getMinutes() + minutes);
  const isLast = index === windows.length - 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  const range = `${pad(cursor.getHours())}:${pad(cursor.getMinutes())} → ${
    isLast ? 'close' : `${pad(end.getHours())}:${pad(end.getMinutes())}`
  }`;
  const duration = isLast
    ? `· ${formatWindowDuration(windows[index]!)}`
    : `· ${formatWindowDuration(windows[index]!)}`;
  return `${range} ${duration}`;
}

function windowDuration(window: PriceWindow): { hours: number; minutes: number } {
  const h = window.duration.match(/(\d+)H/);
  const m = window.duration.match(/(\d+)M/);
  return { hours: h ? Number(h[1]) : 0, minutes: m ? Number(m[1]) : 0 };
}

function formatWindowDuration(window: PriceWindow): string {
  if (window.duration === 'PT0S') return 'until the close';
  const { hours, minutes } = windowDuration(window);
  if (hours && minutes) return `${hours} h ${minutes} min`;
  if (hours) return `${hours} h`;
  if (minutes) return `${minutes} min`;
  return 'until the close';
}

function buildDuration(hours: string, minutes: string): string {
  const h = parseInt(hours, 10) || 0;
  const m = parseInt(minutes, 10) || 0;
  if (h && m) return `PT${h}H${m}M`;
  if (h) return `PT${h}H`;
  if (m) return `PT${m}M`;
  return 'PT0S';
}

function PriceWindowEditor({
  window,
  index,
  windows,
  schedule,
  direction,
  symbol,
  openingPrice,
  onChange,
  onRemove,
  onMove,
  canRemove,
  open,
  onToggle,
}: {
  window: PriceWindow;
  index: number;
  windows: PriceWindow[];
  schedule: ScheduleState;
  direction: 'FORWARD' | 'REVERSE';
  symbol: string;
  openingPrice: string;
  onChange: (patch: Partial<PriceWindow>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  canRemove: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const [newStep, setNewStep] = useState('');
  const isLast = index === windows.length - 1;
  const { hours, minutes } = windowDuration(window);

  const addStep = () => {
    const value = parseInt(newStep, 10);
    if (!value || window.steps.includes(value)) return;
    onChange({ steps: [...window.steps, value].sort((a, b) => a - b) });
    setNewStep('');
  };

  return (
    <div className="rounded-md border border-border bg-muted/10">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
          {index + 1}
        </span>
        <span className="text-xs font-semibold text-foreground">Window {index + 1}</span>
        <span className="text-[11px] text-muted-foreground">
          {windowRange(index, windows, schedule)}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move window up"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={isLast}
            aria-label="Move window down"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label="Remove window"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? 'Collapse window' : 'Expand window'}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 px-3 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price moves by">
              <select
                value={window.type}
                onChange={(e) => onChange({ type: e.target.value as PriceWindow['type'] })}
                className={selectClass}
                aria-label={`Window ${index + 1} price movement`}
              >
                {MOVE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Runs for">
              {isLast ? (
                <div className="flex h-9 items-center rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground">
                  Until the close and any extension
                </div>
              ) : (
                <DurationFields
                  hours={String(hours)}
                  minutes={String(minutes)}
                  onHours={(value) => onChange({ duration: buildDuration(value, String(minutes)) })}
                  onMinutes={(value) => onChange({ duration: buildDuration(String(hours), value) })}
                />
              )}
            </Field>
          </div>

          {window.type === 'STEP' && (
            <div className="grid gap-3 sm:grid-cols-[130px_minmax(0,1fr)]">
              <Field label="One step">
                <MoneyField
                  value={window.value}
                  currency={symbol}
                  onChange={(value) => onChange({ value })}
                />
              </Field>
              <Field label="Bidders may jump">
                <div className="flex flex-wrap items-center gap-1.5">
                  {JUMP_PRESETS.map((step) => {
                    const active = window.steps.includes(step);
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() =>
                          onChange({
                            steps: active
                              ? window.steps.filter((value) => value !== step)
                              : [...window.steps, step].sort((a, b) => a - b),
                          })
                        }
                        className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                          active
                            ? 'bg-primary/15 text-foreground ring-1 ring-primary/30'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                        aria-pressed={active}
                      >
                        {step} step{step === 1 ? '' : 's'}
                      </button>
                    );
                  })}
                  {window.steps
                    .filter((step) => !JUMP_PRESETS.includes(step))
                    .map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => onChange({ steps: window.steps.filter((v) => v !== step) })}
                        className="rounded bg-primary/15 px-2 py-1 text-[11px] font-medium text-foreground ring-1 ring-primary/30"
                      >
                        {step} steps ×
                      </button>
                    ))}
                  <div className="flex items-center gap-1">
                    <input
                      value={newStep}
                      onChange={(e) => setNewStep(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addStep();
                        }
                      }}
                      placeholder="Add"
                      className="h-7 w-14 rounded border border-input bg-background px-2 text-[11px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                      aria-label="Add a custom jump"
                    />
                    <button
                      type="button"
                      onClick={addStep}
                      aria-label="Add jump"
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  Add each number of steps one bid may move the price, one at a time. A bid of 3
                  steps moves the price by{' '}
                  {formatMoney(parseAmount(window.value) * 3, 'INR').replace('₹', symbol)}.
                </p>
              </Field>
            </div>
          )}

          {window.type === 'PERCENT' && (
            <div className="max-w-[130px]">
              <Field label="Each bid moves">
                <div className="flex h-9 items-center overflow-hidden rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={window.value}
                    onChange={(e) => onChange({ value: e.target.value })}
                    className="h-full w-full bg-transparent px-2 text-sm tabular-nums outline-none"
                    aria-label="Percentage per bid"
                  />
                  <span className="pr-2.5 text-xs text-muted-foreground">%</span>
                </div>
              </Field>
            </div>
          )}

          {window.type === 'RANGE' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="At least">
                <div className="flex h-9 items-center overflow-hidden rounded-md border border-input bg-background">
                  <input
                    type="number"
                    min={0}
                    value={window.value}
                    onChange={(e) => onChange({ value: e.target.value })}
                    className="h-full w-full bg-transparent px-2 text-sm tabular-nums outline-none"
                    aria-label="Minimum percentage"
                  />
                  <span className="pr-2.5 text-xs text-muted-foreground">%</span>
                </div>
              </Field>
              <Field label="At most">
                <div className="flex h-9 items-center overflow-hidden rounded-md border border-input bg-background">
                  <input
                    type="number"
                    min={0}
                    value={window.maxValue}
                    onChange={(e) => onChange({ maxValue: e.target.value })}
                    className="h-full w-full bg-transparent px-2 text-sm tabular-nums outline-none"
                    aria-label="Maximum percentage"
                  />
                  <span className="pr-2.5 text-xs text-muted-foreground">%</span>
                </div>
              </Field>
            </div>
          )}

          <p className="rounded bg-muted/50 px-2.5 py-1.5 text-[10px] text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider">
              Next valid {direction === 'FORWARD' ? 'bids' : 'asks'} from
            </span>{' '}
            {nextBids(window, openingPrice, direction, symbol)}
          </p>
        </div>
      )}
    </div>
  );
}

export function Step2OfferRules({
  form,
  onChange,
  schedule,
  direction,
  openingPrice,
  currencyUnit,
  roundingModes,
  roundingMode,
  onRoundingModeChange,
  errors,
}: {
  form: OfferState;
  onChange: (patch: Partial<OfferState>) => void;
  schedule: ScheduleState;
  direction: 'FORWARD' | 'REVERSE';
  openingPrice: string;
  currencyUnit: string;
  roundingModes: SelectOption[];
  roundingMode: string;
  onRoundingModeChange: (value: string) => void;
  errors: Record<string, string>;
}) {
  const [openWindows, setOpenWindows] = useState<Record<string, boolean>>({
    'window-1': true,
    'window-2': true,
    'window-3': true,
  });
  const [policyOpen, setPolicyOpen] = useState(true);
  const symbol =
    { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$' }[currencyUnit] ?? currencyUnit;
  const bidWord = direction === 'FORWARD' ? 'bid' : 'ask';
  const bidderWord = direction === 'FORWARD' ? 'Bidders' : 'Suppliers';
  const openWord = direction === 'FORWARD' ? 'opening' : 'starting';

  const updateWindow = (id: string, patch: Partial<PriceWindow>) =>
    onChange({
      windows: form.windows.map((window) => (window.id === id ? { ...window, ...patch } : window)),
    });

  const moveWindow = (index: number, dir: -1 | 1) => {
    const next = [...form.windows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange({ windows: next });
  };

  const removeWindow = (id: string) => {
    if (form.windows.length <= 1) return;
    const next = form.windows.filter((window) => window.id !== id);
    next[next.length - 1] = { ...next[next.length - 1]!, duration: 'PT0S' };
    onChange({ windows: next });
  };

  const addWindow = () => {
    const next = form.windows.map((window, index) =>
      index === form.windows.length - 1 && window.duration === 'PT0S'
        ? { ...window, duration: 'PT30M' }
        : window,
    );
    next.push({
      id: `window-${Date.now()}`,
      type: 'STEP',
      duration: 'PT0S',
      value: '500',
      maxValue: '',
      steps: [1, 2, 3, 5, 10],
      clockEveryMinutes: '2',
      clockStopAt: '',
    });
    onChange({ windows: next });
  };

  const startLabel = schedule.startTime ? formatTime(schedule.startTime) : '11:00';

  return (
    <div className="space-y-4">
      <WizardRow
        label="Mechanism"
        description="How prices are made. Clock and sealed come in a later release."
        className="rounded-lg border border-border bg-card"
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <ChoiceCard
            title="Open"
            description={
              direction === 'FORWARD'
                ? 'Bidders post prices that beat the current price.'
                : 'Suppliers post prices that beat the current price.'
            }
            selected={form.mechanism === 'OPEN'}
            onClick={() => onChange({ mechanism: 'OPEN' })}
          />
          <ChoiceCard
            title="Clock"
            description={
              direction === 'FORWARD'
                ? 'The platform raises the price on a timer. Bidders stay in or drop out.'
                : 'The platform lowers the price on a timer. Suppliers stay in or drop out.'
            }
            disabled
            badge={<span className="text-[10px] font-medium text-warning">Later release</span>}
            onClick={() => {}}
          />
          <ChoiceCard
            title="Sealed"
            description={
              direction === 'FORWARD'
                ? 'Hidden bids by a deadline, opened together.'
                : 'Hidden asks by a deadline, opened together.'
            }
            disabled
            badge={<span className="text-[10px] font-medium text-warning">Later release</span>}
            onClick={() => {}}
          />
        </div>
      </WizardRow>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <button
          type="button"
          onClick={() => setPolicyOpen((open) => !open)}
          className="flex w-full items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-left"
          aria-expanded={policyOpen}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Zap className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-foreground">Price progression</span>
          <PolicyBadge tone="warning" className="px-2 text-[10px]" />
          <span className="text-[10px] text-muted-foreground">During auction</span>
          <span className="text-[10px] text-muted-foreground">Composite</span>
          <span className="text-[10px] text-muted-foreground">Each window is a child policy</span>
          <span className="ml-auto text-muted-foreground">
            {policyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>

        {policyOpen && (
          <>
            <div className="grid gap-4 border-b border-border px-4 py-3 md:grid-cols-[130px_minmax(0,1fr)]">
              <div>
                <p className="text-xs font-semibold text-foreground">Timeline</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  Windows run back to back. The last one runs to the close.
                </p>
              </div>
              <div>
                <div className="flex overflow-hidden rounded border border-border">
                  {form.windows.map((window, index) => (
                    <div
                      key={window.id}
                      className={`min-w-0 flex-1 border-r border-border px-2 py-1.5 last:border-r-0 ${
                        index === form.windows.length - 1 ? 'bg-muted/50' : 'bg-primary/10'
                      }`}
                      title={`Window ${index + 1}: ${windowSummary(window, symbol)}`}
                    >
                      <p className="truncate text-[10px] font-semibold text-foreground">
                        {index + 1} · {windowSummary(window, symbol)}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {formatWindowDuration(window)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{startLabel}</span>
                  <span>
                    {form.windows.length} window{form.windows.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 px-4 py-4 md:grid-cols-[130px_minmax(0,1fr)]">
              <div>
                <p className="text-xs font-semibold text-foreground">Windows</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  Each window sets how the price may move while it is active.
                </p>
              </div>
              <div className="space-y-2">
                {form.windows.map((window, index) => (
                  <PriceWindowEditor
                    key={window.id}
                    window={window}
                    index={index}
                    windows={form.windows}
                    schedule={schedule}
                    direction={direction}
                    symbol={symbol}
                    openingPrice={openingPrice}
                    onChange={(patch) => updateWindow(window.id, patch)}
                    onRemove={() => removeWindow(window.id)}
                    onMove={(dir) => moveWindow(index, dir)}
                    canRemove={form.windows.length > 1}
                    open={openWindows[window.id] !== false}
                    onToggle={() =>
                      setOpenWindows((current) => ({
                        ...current,
                        [window.id]: current[window.id] === false,
                      }))
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={addWindow}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Add a window
                </button>
                {errors.windows && <p className="text-[11px] text-destructive">{errors.windows}</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2.5">
              <p className="text-[11px] text-muted-foreground">
                Saved with the rest of the auction when you continue.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setPolicyOpen(false)}
                className="h-7 px-3 text-xs"
              >
                Done
              </Button>
            </div>
          </>
        )}
      </section>

      <WizardSection>
        <WizardRow label="First bid" description={`Where the first ${bidWord} may land.`}>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
            <button
              type="button"
              role="switch"
              aria-checked={form.firstBidMayEqual}
              aria-label={`The first ${bidWord} may equal the ${
                direction === 'FORWARD' ? 'opening' : 'starting'
              } price`}
              onClick={() => onChange({ firstBidMayEqual: !form.firstBidMayEqual })}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                form.firstBidMayEqual ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${
                  form.firstBidMayEqual ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
            {form.firstBidMayEqual
              ? `The first ${bidWord} may equal the ${openWord} price`
              : `The first ${bidWord} must beat the ${openWord} price by one step`}
          </label>
        </WizardRow>

        <WizardRow label="Rounding" description="Percentage windows give uneven amounts.">
          <div className="max-w-sm">
            <Field label="Round percentage prices to">
              <select
                value={roundingMode}
                onChange={(e) => onRoundingModeChange(e.target.value)}
                className={selectClass}
                aria-label="Round percentage prices to"
              >
                {roundingModes.length === 0 ? (
                  <>
                    <option value="HALF_UP">The nearest ₹ (half up)</option>
                    <option value="UP">Always up</option>
                    <option value="DOWN">Always down</option>
                    <option value="HALF_EVEN">Nearest, ties to even</option>
                  </>
                ) : (
                  roundingModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))
                )}
              </select>
            </Field>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Percentages give uneven amounts, such as 2% above 594 = 605.88.
            </p>
          </div>
        </WizardRow>

        <WizardRow
          label={`Withdrawing a ${bidWord}`}
          description={`Can a ${bidWord} be taken back once it is placed?`}
        >
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard
                title="Not allowed"
                description={`A ${bidWord} is final once placed.`}
                selected={form.withdrawal === 'NOT_ALLOWED'}
                onClick={() => onChange({ withdrawal: 'NOT_ALLOWED' })}
              />
              <ChoiceCard
                title="Allowed, with a penalty"
                description="Until a set time before the close. If the final price ends up worse, the withdrawer pays the difference."
                selected={form.withdrawal === 'ALLOWED'}
                onClick={() => onChange({ withdrawal: 'ALLOWED' })}
              />
            </div>
            {form.withdrawal === 'ALLOWED' && (
              <div className="max-w-[180px]">
                <Field label="Allowed until (min before the close)">
                  <input
                    type="number"
                    min={0}
                    value={form.withdrawalMinutes}
                    onChange={(e) => onChange({ withdrawalMinutes: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
          </div>
        </WizardRow>

        <WizardRow
          label={`What ${bidderWord === 'Bidders' ? 'bidders' : 'suppliers'} see`}
          description="While bidding is open."
        >
          <ChoiceList>
            <OptionRow
              title="Best price and own rank"
              description={`${bidderWord} see the current best ${bidWord} and where they stand.`}
              selected={form.offerVisibility === 'FULL'}
              onClick={() => onChange({ offerVisibility: 'FULL' })}
            />
            <OptionRow
              title="Own rank only"
              description={`${bidderWord} see only their position: ${
                direction === 'FORWARD' ? 'H1, H2, …' : 'L1, L2, …'
              }`}
              selected={form.offerVisibility === 'RANK'}
              onClick={() => onChange({ offerVisibility: 'RANK' })}
            />
            <OptionRow
              title="Nothing until close"
              description={`No prices or ranks while bidding is open.`}
              selected={form.offerVisibility === 'NOTHING'}
              onClick={() => onChange({ offerVisibility: 'NOTHING' })}
            />
          </ChoiceList>
          {form.offerVisibility === 'RANK' && (
            <MutedNote>
              {bidderWord} can’t see the best price, so each new {bidWord} only has to beat their
              own last {bidWord}. The platform works out the ranks, and ties can happen.
            </MutedNote>
          )}
          {form.offerVisibility === 'NOTHING' && (
            <MutedNote>
              With nothing visible, {bidderWord.toLowerCase()} cannot react to each other. A sealed
              auction may suit this better.
            </MutedNote>
          )}
        </WizardRow>

        <WizardRow
          label="Names"
          description={`How ${bidderWord.toLowerCase()} appear to each other.`}
        >
          <ChoiceList>
            <OptionRow
              title="Aliases"
              description={`${direction === 'FORWARD' ? 'Bidder' : 'Supplier'} 1, ${
                direction === 'FORWARD' ? 'Bidder' : 'Supplier'
              } 2… kept the same for the whole auction.`}
              selected={form.participantVisibility === 'ALIAS'}
              onClick={() => onChange({ participantVisibility: 'ALIAS' })}
            />
            <OptionRow
              title="Real names"
              description="Everyone sees who is bidding."
              selected={form.participantVisibility === 'REAL'}
              onClick={() => onChange({ participantVisibility: 'REAL' })}
            />
            <OptionRow
              title="Hidden"
              description="No names or aliases are shown."
              selected={form.participantVisibility === 'HIDDEN'}
              onClick={() => onChange({ participantVisibility: 'HIDDEN' })}
            />
          </ChoiceList>
        </WizardRow>
      </WizardSection>
    </div>
  );
}
