'use client';

import { useId, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Info, Plus, Trash2 } from 'lucide-react';
import { Button, ChipCombobox, Combobox, Switch, cn, type ComboboxOption } from '@repo/ui';
import { ISSUE_ANCHOR } from '../../../_lib/wizard/validation';
import type { SelectOption } from '../../../_components/AuctionShared';
import type { OfferState, PriceWindow, ScheduleState } from '../../../_lib/wizard/types';
import {
  ChoiceCard,
  ChoiceList,
  DurationFields,
  Field,
  MoneyField,
  MutedNote,
  OptionRow,
  WizardRow,
  WizardSection,
  inputClass,
  selectClass,
} from '../ui/wizard-ui';
import { PolicyRow } from '../ui/PolicyRow';
import { WindowTrack } from '../ui/WindowTrack';
import {
  endTimeFor,
  formatMoney,
  formatTime,
  latestCloseFor,
  parseDuration,
  windowSummary,
} from '../../../_lib/wizard/summary';

const JUMP_SUGGESTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '15', '20'];
const SWATCH = ['bg-primary/45', 'bg-primary/70', 'bg-primary'];

const stepsLabel = (value: string) => `${value} ${value === '1' ? 'step' : 'steps'}`;

function windowMinutes(window: PriceWindow): number {
  const { hours, minutes } = parseDuration(window.duration);
  return hours * 60 + minutes;
}

function buildDuration(hours: string, minutes: string): string {
  const h = parseInt(hours, 10) || 0;
  const m = parseInt(minutes, 10) || 0;
  if (h && m) return `PT${h}H${m}M`;
  if (h) return `PT${h}H`;
  if (m) return `PT${m}M`;
  return 'PT0S';
}

function lengthLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/** The bids that are valid next from the opening price, for one window. */
function windowExample(
  window: PriceWindow,
  opening: string,
  forward: boolean,
  currency: string,
): string {
  const base = parseFloat(opening) || 0;
  if (!base)
    return `Enter ${forward ? 'an opening' : 'a starting'} price in Basics and unit to see examples.`;
  const sign = forward ? 1 : -1;
  const money = (value: number) => formatMoney(value, currency);
  const value = parseFloat(window.value) || 0;
  if (window.type === 'CLOCK') {
    return `${money(base)} → ${money(base + sign * value)} after ${window.clockEveryMinutes || 1} min, never ${
      forward ? 'above' : 'below'
    } ${money(parseFloat(window.clockStopAt) || 0)}`;
  }
  if (window.type === 'STEP') {
    if (!value || !window.steps.length) return '—';
    const jumps = [...window.steps].sort((a, b) => a - b);
    return (
      jumps
        .slice(0, 6)
        .map((jump) => money(base + sign * value * jump))
        .join(' · ') + (jumps.length > 6 ? ' · …' : '')
    );
  }
  if (window.type === 'PERCENT') return `exactly ${money(base * (1 + (sign * value) / 100))}`;
  const max = parseFloat(window.maxValue) || 0;
  const low = base * (1 + (sign * value) / 100);
  const high = base * (1 + (sign * max) / 100);
  return `${money(Math.min(low, high))} to ${money(Math.max(low, high))}`;
}

function PercentField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-9 items-center overflow-hidden rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
      <input
        id={id}
        type="number"
        min={0}
        step="0.5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-full bg-transparent px-2.5 text-sm tabular-nums outline-none"
      />
      <span className="pr-2.5 text-xs text-muted-foreground">%</span>
    </div>
  );
}

function WindowEditor({
  window,
  index,
  count,
  startMinute,
  start,
  clock,
  forward,
  symbol,
  currencyUnit,
  openingPrice,
  softClose,
  onChange,
  onMove,
  onRemove,
}: {
  window: PriceWindow;
  index: number;
  count: number;
  startMinute: number;
  start: string;
  clock: boolean;
  forward: boolean;
  symbol: string;
  currencyUnit: string;
  openingPrice: string;
  softClose: boolean;
  onChange: (patch: Partial<PriceWindow>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const n = index + 1;
  const isLast = index === count - 1;
  const noun = forward ? 'bid' : 'ask';
  const { hours, minutes } = parseDuration(window.duration);
  const startMs = Date.parse(start);
  const at = (minute: number) =>
    Number.isFinite(startMs)
      ? formatTime(new Date(startMs + minute * 60_000).toISOString())
      : minute
        ? `+${lengthLabel(minute)}`
        : 'Start';
  const length = hours * 60 + minutes;
  const span = isLast
    ? `${count === 1 ? 'Whole auction · ' : ''}${at(startMinute)} → ${clock ? 'clock stops' : 'close'}`
    : `${at(startMinute)} → ${at(startMinute + length)} · ${lengthLabel(length)}`;
  const stepAmount = parseFloat(window.value) || 0;

  const moveOptions: ComboboxOption[] = [
    {
      value: 'STEP',
      label: `Fixed step (${symbol} × jumps)`,
      description: `Each ${noun} moves the price by whole steps of one amount.`,
    },
    {
      value: 'PERCENT',
      label: 'Fixed percentage',
      description: `Each ${noun} moves the price by the same percentage.`,
    },
    {
      value: 'RANGE',
      label: 'Percentage range',
      description: `Each ${noun} moves the price by a percentage between two limits.`,
    },
  ];

  const jumpOption = (value: string): ComboboxOption => ({
    value,
    label: stepsLabel(value),
    description: `${formatMoney(Number(value) * stepAmount, currencyUnit)} a ${noun}`,
  });

  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
        <span aria-hidden className={cn('h-3 w-3 rounded-sm', SWATCH[index % SWATCH.length])} />
        <span className="text-xs font-semibold text-foreground">Window {n}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">{span}</span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label={`Move window ${n} earlier`}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={isLast}
            aria-label={`Move window ${n} later`}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={count === 1}
            aria-label={`Remove window ${n}`}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {clock ? (
            <Field label="Price moves by">
              <div className="flex h-9 items-center rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground">
                Automatic clock
              </div>
            </Field>
          ) : (
            <Field label="Price moves by" htmlFor={`${id}-type`}>
              <Combobox
                id={`${id}-type`}
                aria-label={`Window ${n} price moves by`}
                value={window.type}
                options={moveOptions}
                onChange={(type) => onChange({ type: type as PriceWindow['type'] })}
              />
            </Field>
          )}
          <Field label={isLast ? 'Runs' : 'Runs for'}>
            {isLast ? (
              <div className="flex h-9 items-center rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground">
                {clock
                  ? 'Until the clock stops'
                  : `Until the close${softClose ? ' and any extension' : ''}`}
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
          <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
            <Field label="One step" htmlFor={`${id}-step`}>
              <MoneyField
                id={`${id}-step`}
                value={window.value}
                currency={symbol}
                onChange={(value) => onChange({ value })}
              />
            </Field>
            <Field
              label={`${forward ? 'Bidders' : 'Suppliers'} may jump`}
              htmlFor={`${id}-jumps`}
              hint={`Add each number of steps one ${noun} may move the price, one at a time: pick from the list, or type a number and press Enter. A${forward ? '' : 'n'} ${noun} of 3 steps moves the price by ${formatMoney(3 * stepAmount, currencyUnit)}.`}
            >
              <ChipCombobox
                id={`${id}-jumps`}
                aria-label={`Window ${n} jumps`}
                values={window.steps.map(String)}
                options={JUMP_SUGGESTIONS.map(jumpOption)}
                chipLabel={stepsLabel}
                placeholder="Pick or type a number"
                create={(query) => {
                  if (!/^\d+$/.test(query) || !(Number(query) > 0)) return null;
                  const value = String(Number(query));
                  return { ...jumpOption(value), label: `Add “${stepsLabel(value)}”` };
                }}
                emptyText={(query) =>
                  query
                    ? 'Type one number at a time, like 4.'
                    : 'Every suggestion is already added.'
                }
                onChange={(values) => onChange({ steps: values.map(Number).sort((a, b) => a - b) })}
              />
            </Field>
          </div>
        )}

        {window.type === 'PERCENT' && (
          <div className="max-w-[160px]">
            <Field label={`Each ${noun} moves`} htmlFor={`${id}-pct`}>
              <PercentField
                id={`${id}-pct`}
                value={window.value}
                onChange={(value) => onChange({ value })}
              />
            </Field>
          </div>
        )}

        {window.type === 'RANGE' && (
          <div className="grid max-w-sm gap-3 sm:grid-cols-2">
            <Field label="At least" htmlFor={`${id}-min`}>
              <PercentField
                id={`${id}-min`}
                value={window.value}
                onChange={(value) => onChange({ value })}
              />
            </Field>
            <Field label="At most" htmlFor={`${id}-max`}>
              <PercentField
                id={`${id}-max`}
                value={window.maxValue}
                onChange={(maxValue) => onChange({ maxValue })}
              />
            </Field>
          </div>
        )}

        {window.type === 'CLOCK' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={forward ? 'Price rises by' : 'Price drops by'} htmlFor={`${id}-tick`}>
              <MoneyField
                id={`${id}-tick`}
                value={window.value}
                currency={symbol}
                onChange={(value) => onChange({ value })}
              />
            </Field>
            <Field label="Every" htmlFor={`${id}-every`}>
              <div className="flex items-center gap-1.5">
                <input
                  id={`${id}-every`}
                  type="number"
                  min={1}
                  value={window.clockEveryMinutes}
                  onChange={(event) => onChange({ clockEveryMinutes: event.target.value })}
                  className={cn(inputClass, 'h-9 w-20 tabular-nums')}
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
            </Field>
            <Field label="Stops at" htmlFor={`${id}-stop`}>
              <MoneyField
                id={`${id}-stop`}
                value={window.clockStopAt}
                currency={symbol}
                onChange={(clockStopAt) => onChange({ clockStopAt })}
              />
            </Field>
          </div>
        )}

        <p className="rounded bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            {clock
              ? `Clock from ${formatMoney(parseFloat(openingPrice) || 0, currencyUnit)}`
              : `Next valid ${noun}s from ${formatMoney(parseFloat(openingPrice) || 0, currencyUnit)}`}
          </span>{' '}
          {windowExample(window, openingPrice, forward, currencyUnit)}
        </p>
      </div>
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
  const forward = direction === 'FORWARD';
  const symbol =
    { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$' }[currencyUnit] ?? currencyUnit;
  const noun = forward ? 'bid' : 'ask';
  const Who = forward ? 'Bidders' : 'Suppliers';
  const who = Who.toLowerCase();
  const openWord = forward ? 'opening' : 'starting';
  const clock = form.mechanism === 'CLOCK';
  const sealed = form.mechanism === 'SEALED';
  const open = form.mechanism === 'OPEN';
  const softClose = open && schedule.softCloseEnabled;

  // Clock auctions keep their own window list, so switching mechanism back and
  // forth never loses either set.
  const windows = clock ? form.clockWindows : form.windows;
  const setWindows = (next: PriceWindow[]) =>
    onChange(clock ? { clockWindows: next } : { windows: next });

  // Start open when something needs doing, so the fix is in view.
  const [progressionOpen, setProgressionOpen] = useState(
    Boolean(errors.windows) || windows.length === 0,
  );
  // With no windows there's nothing to collapse to, so the row stays open.
  const noWindows = !sealed && windows.length === 0;
  const progressionShown = progressionOpen || noWindows;

  const updateWindow = (id: string, patch: Partial<PriceWindow>) =>
    setWindows(windows.map((window) => (window.id === id ? { ...window, ...patch } : window)));

  const moveWindow = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= windows.length) return;
    const next = [...windows];
    [next[index], next[target]] = [next[target]!, next[index]!];
    // Whichever window ends up last runs to the close; the one that moved up
    // needs a length of its own.
    setWindows(
      next.map((window, i) =>
        i === next.length - 1
          ? { ...window, duration: 'PT0S' }
          : window.duration === 'PT0S'
            ? { ...window, duration: 'PT30M' }
            : window,
      ),
    );
  };

  const removeWindow = (id: string) => {
    if (windows.length <= 1) return;
    const next = windows.filter((window) => window.id !== id);
    next[next.length - 1] = { ...next[next.length - 1]!, duration: 'PT0S' };
    setWindows(next);
  };

  const addWindow = () => {
    const next = windows.map((window, index) =>
      index === windows.length - 1 && window.duration === 'PT0S'
        ? { ...window, duration: 'PT30M' }
        : window,
    );
    next.push({
      id: `${clock ? 'clock' : 'window'}-${Date.now()}`,
      type: clock ? 'CLOCK' : 'STEP',
      duration: 'PT0S',
      value: '500',
      maxValue: '',
      steps: clock ? [] : [1, 2, 3, 5, 10],
      clockEveryMinutes: '1',
      clockStopAt: windows[windows.length - 1]?.clockStopAt ?? '',
    });
    setWindows(next);
  };

  const starts = windows.map((_, index) =>
    windows.slice(0, index).reduce((total, window) => total + windowMinutes(window), 0),
  );
  const closing = endTimeFor(schedule);
  const biddingMinutes = (() => {
    const s = Date.parse(schedule.startTime);
    const e = Date.parse(closing);
    return Number.isFinite(s) && Number.isFinite(e) ? Math.max(0, Math.round((e - s) / 60000)) : 0;
  })();
  const used = starts[starts.length - 1] ?? 0;
  const overrun = open && windows.length > 1 && biddingMinutes > 0 && used >= biddingMinutes;
  const startLabel = schedule.startTime ? formatTime(schedule.startTime) : 'Start';
  const hasPercent = open && form.windows.some((window) => window.type !== 'STEP');
  const issueCount = (errors.windows || noWindows ? 1 : 0) + (overrun ? 1 : 0);

  return (
    <div className="space-y-4">
      <div
        id={ISSUE_ANCHOR.mechanism}
        tabIndex={-1}
        className="scroll-mt-4 focus-visible:outline-none"
      >
        <WizardRow
          label="Mechanism"
          description="How prices are made."
          className="rounded-lg border border-border bg-card"
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <ChoiceCard
              title="Open"
              description={`${Who} post prices that beat the current price.`}
              selected={open}
              onClick={() => onChange({ mechanism: 'OPEN' })}
            />
            <ChoiceCard
              title="Clock"
              description={
                forward
                  ? 'The platform raises the price on a timer. Bidders stay in or drop out.'
                  : 'The platform lowers the price on a timer. Suppliers stay in or drop out.'
              }
              selected={clock}
              onClick={() => onChange({ mechanism: 'CLOCK' })}
            />
            <ChoiceCard
              title="Sealed"
              description={`Hidden ${noun}s by a deadline, opened together.`}
              selected={sealed}
              badge={
                <span className="text-[10px] font-medium text-warning">Can’t publish yet</span>
              }
              onClick={() => onChange({ mechanism: 'SEALED' })}
            />
          </div>
          {sealed && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              The server doesn’t support sealed auctions yet, so this one can be set up but not
              published.
            </p>
          )}
        </WizardRow>
      </div>

      {!sealed && (
        <PolicyRow
          id={ISSUE_ANCHOR.priceProgression}
          title="Price progression"
          phase="During auction"
          warn={
            issueCount ? `${issueCount} ${issueCount === 1 ? 'issue' : 'issues'} to fix` : undefined
          }
          summary={
            noWindows
              ? [{ text: 'No windows yet. Add one to set how the price moves.', bad: true }]
              : [
                  { text: `${windows.length} ${windows.length === 1 ? 'window' : 'windows'}` },
                  {
                    text: windows.map((window) => windowSummary(window, symbol)).join(' → '),
                    bad: Boolean(errors.windows),
                  },
                ]
          }
          due={{
            main: `${startLabel} → ${clock ? 'clock stops' : 'close'}`,
            sub: 'runs the whole auction',
          }}
          open={progressionShown}
          onToggle={() => setProgressionOpen(!progressionShown)}
          footer={
            errors.windows ? 'Some windows need fixing. See “In this section” below.' : undefined
          }
        >
          <WizardRow
            label="Timeline"
            description={`Windows run back to back. The last one runs ${
              clock ? 'until the clock stops.' : 'to the close.'
            }`}
          >
            <WindowTrack
              className="mt-0"
              windows={windows}
              symbol={symbol}
              start={schedule.startTime}
              closing={closing}
              latestClose={latestCloseFor(schedule)}
              softClose={softClose}
              clock={clock}
            />
            {overrun && (
              <p className="mt-2 flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] leading-snug text-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                Windows 1 to {windows.length - 1} add up to {lengthLabel(used)}, but bidding is open
                for {lengthLabel(biddingMinutes)}. Window {windows.length} would never run.
              </p>
            )}
          </WizardRow>
          <WizardRow
            label="Windows"
            description={
              clock
                ? 'Each window sets how fast the clock moves while it’s active.'
                : 'Each window sets how the price may move while it’s active.'
            }
          >
            <div className="space-y-2">
              {noWindows && (
                <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-center">
                  <p className="text-sm font-medium text-foreground">No price windows yet</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    {clock
                      ? 'A window sets how fast the clock moves the price. Add one to start.'
                      : `A window sets how far each ${noun} moves the price. Add one to start; the last window runs to the close.`}
                  </p>
                  <Button type="button" size="sm" onClick={addWindow} className="mt-1 gap-1.5">
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add a window
                  </Button>
                </div>
              )}
              {windows.map((window, index) => (
                <WindowEditor
                  key={window.id}
                  window={window}
                  index={index}
                  count={windows.length}
                  startMinute={starts[index] ?? 0}
                  start={schedule.startTime}
                  clock={clock}
                  forward={forward}
                  symbol={symbol}
                  currencyUnit={currencyUnit}
                  openingPrice={openingPrice}
                  softClose={softClose}
                  onChange={(patch) => updateWindow(window.id, patch)}
                  onMove={(dir) => moveWindow(index, dir)}
                  onRemove={() => removeWindow(window.id)}
                />
              ))}
              {!noWindows && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addWindow}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add a window
                </Button>
              )}
              {errors.windows && <p className="text-[11px] text-destructive">{errors.windows}</p>}
            </div>
          </WizardRow>
        </PolicyRow>
      )}

      {open && (
        <WizardSection>
          <WizardRow label={`First ${noun}`} description={`Where the first ${noun} may land.`}>
            <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-foreground">
              <Switch
                checked={form.firstBidMayEqual}
                onCheckedChange={(firstBidMayEqual) => onChange({ firstBidMayEqual })}
              />
              {form.firstBidMayEqual
                ? `The first ${noun} may equal the ${openWord} price`
                : `The first ${noun} must beat the ${openWord} price by one step`}
            </label>
          </WizardRow>

          {hasPercent && (
            <WizardRow label="Rounding" description="Percentage windows give uneven amounts.">
              <div className="max-w-sm">
                <Field label="Round percentage prices to" htmlFor="offer-rounding">
                  <select
                    id="offer-rounding"
                    value={roundingMode}
                    onChange={(event) => onRoundingModeChange(event.target.value)}
                    className={selectClass}
                  >
                    {roundingModes.length === 0 ? (
                      <>
                        <option value="HALF_UP">The nearest {symbol} (half up)</option>
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
                  Percentages give uneven amounts, such as 2% {forward ? 'above' : 'below'}{' '}
                  {formatMoney(594, currencyUnit)} ={' '}
                  {formatMoney(forward ? 605.88 : 582.12, currencyUnit)}.
                </p>
              </div>
            </WizardRow>
          )}

          <WizardRow
            id={ISSUE_ANCHOR.withdrawal}
            label={`Withdrawing a${forward ? '' : 'n'} ${noun}`}
            description={`Can a${forward ? '' : 'n'} ${noun} be taken back once it’s placed?`}
          >
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <ChoiceCard
                  title="Not allowed"
                  description={`A${forward ? '' : 'n'} ${noun} is final once placed.`}
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
                <div className="max-w-[200px]">
                  <Field label="Allowed until (min before the close)" htmlFor="offer-withdraw">
                    <input
                      id="offer-withdraw"
                      type="number"
                      min={0}
                      value={form.withdrawalMinutes}
                      onChange={(event) => onChange({ withdrawalMinutes: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}
            </div>
          </WizardRow>
        </WizardSection>
      )}

      {clock && (
        <WizardSection>
          <WizardRow
            label="Response time"
            description={`How long ${who} have to stay in after each tick.`}
          >
            <div className="max-w-[200px]">
              <Field label="Seconds per tick" htmlFor="offer-response">
                <input
                  id="offer-response"
                  type="number"
                  min={5}
                  value={form.clockResponseSeconds}
                  onChange={(event) => onChange({ clockResponseSeconds: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {Who} who don’t confirm within {parseInt(form.clockResponseSeconds, 10) || 0} seconds
              of a tick drop out. The last one left wins.
            </p>
          </WizardRow>
        </WizardSection>
      )}

      {sealed && (
        <WizardSection>
          <WizardRow label={`Sealed ${noun}s`} description="Hidden until they’re opened.">
            <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-foreground">
              <Switch
                checked={form.sealedRevision}
                onCheckedChange={(sealedRevision) => onChange({ sealedRevision })}
              />
              {form.sealedRevision
                ? `${Who} may revise their sealed ${noun} until the deadline`
                : `One sealed ${noun} each, no revisions`}
            </label>
            <p className="mt-2 flex items-start gap-1.5 rounded-md bg-muted/50 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Nobody sees a sealed {noun} until they’re opened, so there’s no price progression and
              no soft close.
            </p>
          </WizardRow>
          <WizardRow label="Opening" description={`When the sealed ${noun}s are opened.`}>
            <div className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard
                title="When bidding closes"
                description="Results are worked out straight away."
                selected={form.sealedOpening === 'ON_CLOSE'}
                onClick={() => onChange({ sealedOpening: 'ON_CLOSE' })}
              />
              <ChoiceCard
                title="At a set time after the close"
                description="For example, at a public opening."
                selected={form.sealedOpening === 'AFTER_CLOSE'}
                onClick={() => onChange({ sealedOpening: 'AFTER_CLOSE' })}
              />
            </div>
          </WizardRow>
        </WizardSection>
      )}

      <WizardSection>
        {!sealed && (
          <WizardRow label={`What ${who} see`} description="While bidding is open.">
            <ChoiceList>
              <OptionRow
                title="Best price and own rank"
                description={`${Who} see the current best ${noun} and where they stand.`}
                selected={form.offerVisibility === 'FULL'}
                onClick={() => onChange({ offerVisibility: 'FULL' })}
              />
              <OptionRow
                title="Own rank only"
                description={`${Who} see only their position: ${forward ? 'H1, H2, …' : 'L1, L2, …'}`}
                selected={form.offerVisibility === 'RANK'}
                onClick={() => onChange({ offerVisibility: 'RANK' })}
              />
              <OptionRow
                title="Nothing until close"
                description="No prices or ranks while bidding is open."
                selected={form.offerVisibility === 'NOTHING'}
                onClick={() => onChange({ offerVisibility: 'NOTHING' })}
              />
            </ChoiceList>
            {open && form.offerVisibility === 'RANK' && (
              <MutedNote>
                {Who} can’t see the best price, so each new {noun} only has to beat their own last{' '}
                {noun}. The platform works out the ranks, and ties can happen.
              </MutedNote>
            )}
            {open && form.offerVisibility === 'NOTHING' && (
              <MutedNote>
                With nothing visible, {who} can’t react to each other. A sealed auction may suit
                this better.
              </MutedNote>
            )}
          </WizardRow>
        )}

        <WizardRow label="Names" description={`How ${who} appear to each other.`}>
          <ChoiceList>
            <OptionRow
              title="Aliases"
              description={`${forward ? 'Bidder' : 'Supplier'} 1, ${
                forward ? 'Bidder' : 'Supplier'
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
