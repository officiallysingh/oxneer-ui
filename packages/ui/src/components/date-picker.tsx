'use client';

import * as React from 'react';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ScrollList({
  items,
  selected,
  onSelect,
  buttonClassName = 'w-10',
}: {
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
  buttonClassName?: string;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!listRef.current || !selected) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-val="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <div ref={listRef} className="h-48 overflow-y-auto overscroll-contain flex flex-col gap-0.5">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          data-val={item}
          onClick={() => onSelect(item)}
          className={cn(
            `${buttonClassName} rounded px-2 py-1 text-sm text-center transition-colors`,
            item === selected
              ? 'bg-primary text-primary-foreground font-medium'
              : 'hover:bg-muted text-foreground',
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

// ─── Offset helpers ────────────────────────────────────────────────────────────

const TZ_OFFSET_OPTIONS = [
  { label: 'UTC (+00:00)', offset: '+00:00' },
  { label: 'GMT (+00:00)', offset: '+00:00' },
  { label: 'CET (+01:00)', offset: '+01:00' },
  { label: 'EET (+02:00)', offset: '+02:00' },
  { label: 'MSK (+03:00)', offset: '+03:00' },
  { label: 'GST (+04:00)', offset: '+04:00' },
  { label: 'PKT (+05:00)', offset: '+05:00' },
  { label: 'IST (+05:30)', offset: '+05:30' },
  { label: 'NPT (+05:45)', offset: '+05:45' },
  { label: 'BST (+06:00)', offset: '+06:00' },
  { label: 'ICT (+07:00)', offset: '+07:00' },
  { label: 'CST (+08:00)', offset: '+08:00' },
  { label: 'JST (+09:00)', offset: '+09:00' },
  { label: 'ACST (+09:30)', offset: '+09:30' },
  { label: 'AEST (+10:00)', offset: '+10:00' },
  { label: 'NZST (+12:00)', offset: '+12:00' },
  { label: 'HST (-10:00)', offset: '-10:00' },
  { label: 'AKST (-09:00)', offset: '-09:00' },
  { label: 'PST (-08:00)', offset: '-08:00' },
  { label: 'MST (-07:00)', offset: '-07:00' },
  { label: 'CST (-06:00)', offset: '-06:00' },
  { label: 'EST (-05:00)', offset: '-05:00' },
  { label: 'AST (-04:00)', offset: '-04:00' },
  { label: 'NST (-03:30)', offset: '-03:30' },
];

function parseOffsetTimeParts(val: string): { hh: string; mm: string; offset: string } {
  if (!val) return { hh: '', mm: '', offset: '+00:00' };
  const m = val.match(/^([\d:.]+)([+-]\d{2}:\d{2})$/);
  const rawTime = m ? (m[1] ?? '') : (val.split('.')[0] ?? val);
  const timePart = rawTime.split('.')[0] ?? '';
  const [h, min] = timePart.split(':');
  return {
    hh: h?.padStart(2, '0') ?? '',
    mm: min?.padStart(2, '0') ?? '',
    offset: m?.[2] ?? '+00:00',
  };
}

function parseOffsetDateTimeParts(val: string): {
  date: string;
  hh: string;
  mm: string;
  offset: string;
} {
  if (!val) return { date: '', hh: '', mm: '', offset: '+00:00' };
  const tIdx = val.indexOf('T');
  if (tIdx === -1) return { date: val, hh: '', mm: '', offset: '+00:00' };
  const datePart = val.substring(0, tIdx);
  const rest = val.substring(tIdx + 1);
  const { hh, mm, offset } = parseOffsetTimeParts(rest);
  return { date: datePart, hh, mm, offset };
}

const tzSelect =
  'w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

// ─── YearPicker ───────────────────────────────────────────────────────────────

export interface YearPickerProps {
  id?: string;
  value?: string; // "yyyy"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minYear?: number;
  maxYear?: number;
}

export function YearPicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a year',
  disabled,
  className,
  minYear = 1900,
  maxYear = 2099,
}: YearPickerProps) {
  const [open, setOpen] = React.useState(false);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(maxYear - i));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col">
          <p className="text-xs font-medium text-muted-foreground text-center pb-2">Year</p>
          <ScrollList
            items={years}
            selected={value ?? ''}
            buttonClassName="w-16"
            onSelect={(y) => {
              onChange(y);
              setOpen(false);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── DateRangePicker ──────────────────────────────────────────────────────────

export interface DateRange {
  from?: string; // "yyyy-MM-dd"
  to?: string; // "yyyy-MM-dd"
}

export interface DateRangePickerProps {
  id?: string;
  value?: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a date range',
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const from = value?.from ? new Date(value.from + 'T00:00:00') : undefined;
  const to = value?.to ? new Date(value.to + 'T00:00:00') : undefined;

  const label = React.useMemo(() => {
    if (value?.from && value?.to) return `${formatDate(value.from)} – ${formatDate(value.to)}`;
    if (value?.from) return `${formatDate(value.from)} – …`;
    return null;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !label && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {label ?? <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from, to }}
          onSelect={(range) => {
            onChange({
              from: range?.from ? toIsoDate(range.from) : undefined,
              to: range?.to ? toIsoDate(range.to) : undefined,
            });
            if (range?.from && range?.to) setOpen(false);
          }}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── DatePicker ───────────────────────────────────────────────────────────────

export interface DatePickerProps {
  id?: string;
  value?: string; // "yyyy-MM-dd"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? new Date(value + 'T00:00:00') : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? formatDate(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? toIsoDate(date) : '');
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── TimePicker ───────────────────────────────────────────────────────────────

export interface TimePickerProps {
  id?: string;
  value?: string; // "HH:mm"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a time',
  disabled,
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hour, minute] = value ? value.split(':') : ['', ''];

  const pick = (h: string, m: string) => onChange(`${h}:${m}`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <ClockIcon className="mr-2 h-4 w-4 shrink-0" />
          {value || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex gap-2 items-start">
          <div className="flex flex-col">
            <p className="text-[10px] text-center text-muted-foreground font-medium pb-1">HH</p>
            <ScrollList
              items={HOURS}
              selected={hour ?? ''}
              onSelect={(h) => pick(h, minute || '00')}
            />
          </div>
          <span className="self-center text-muted-foreground font-bold text-lg mt-4">:</span>
          <div className="flex flex-col">
            <p className="text-[10px] text-center text-muted-foreground font-medium pb-1">MM</p>
            <ScrollList
              items={MINUTES}
              selected={minute ?? ''}
              onSelect={(m) => pick(hour || '00', m)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── DateTimePicker ───────────────────────────────────────────────────────────

export interface DateTimePickerProps {
  id?: string;
  value?: string; // "yyyy-MM-ddTHH:mm"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Earliest selectable date-time ("yyyy-MM-ddTHH:mm"). Earlier calendar days are disabled. */
  min?: string;
  /** Latest selectable date-time ("yyyy-MM-ddTHH:mm"). Later calendar days are disabled. */
  max?: string;
}

function parseDateTimeBound(value?: string): { date: string; hour: string; minute: string } | null {
  if (!value) return null;
  const normalized = value.replace(' ', 'T');
  const [datePart, timePart] = normalized.split('T');
  if (!datePart) return null;
  const [hour = '00', minute = '00'] = (timePart ?? '00:00').split(':');
  return { date: datePart.slice(0, 10), hour: hour.slice(0, 2), minute: minute.slice(0, 2) };
}

export function DateTimePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick date & time',
  disabled,
  className,
  min,
  max,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const normalized = value?.replace(' ', 'T') ?? '';
  const [datePart, timePart] = normalized ? normalized.split('T') : ['', ''];
  const [hour, minute] = timePart ? timePart.split(':') : ['', ''];

  const selected = datePart ? new Date(datePart + 'T00:00:00') : undefined;
  const minBound = parseDateTimeBound(min);
  const maxBound = parseDateTimeBound(max);

  const hours = HOURS.filter((h) => {
    if (minBound && datePart === minBound.date && h < minBound.hour) return false;
    if (maxBound && datePart === maxBound.date && h > maxBound.hour) return false;
    return true;
  });
  const minutes = MINUTES.filter((m) => {
    if (
      minBound &&
      datePart === minBound.date &&
      (hour ?? '') === minBound.hour &&
      m < minBound.minute
    )
      return false;
    if (
      maxBound &&
      datePart === maxBound.date &&
      (hour ?? '') === maxBound.hour &&
      m > maxBound.minute
    )
      return false;
    return true;
  });

  const clampTime = (d: string, h: string, m: string) => {
    let nextH = h || '00';
    let nextM = m || '00';
    if (
      minBound &&
      d === minBound.date &&
      `${nextH}:${nextM}` < `${minBound.hour}:${minBound.minute}`
    ) {
      nextH = minBound.hour;
      nextM = minBound.minute;
    }
    if (
      maxBound &&
      d === maxBound.date &&
      `${nextH}:${nextM}` > `${maxBound.hour}:${maxBound.minute}`
    ) {
      nextH = maxBound.hour;
      nextM = maxBound.minute;
    }
    return { h: nextH, m: nextM };
  };

  const update = (d: string, h: string, m: string) => {
    if (!d) return;
    const clamped = clampTime(d, h, m);
    onChange(`${d}T${clamped.h}:${clamped.m}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? formatDateTime(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex divide-x divide-border">
          <Calendar
            mode="single"
            selected={selected}
            disabled={[
              ...(minBound ? [{ before: new Date(`${minBound.date}T00:00:00`) }] : []),
              ...(maxBound ? [{ after: new Date(`${maxBound.date}T00:00:00`) }] : []),
            ]}
            onSelect={(date) => {
              if (date) update(toIsoDate(date), hour ?? '', minute ?? '');
            }}
            initialFocus
          />
          <div className="flex flex-col p-3 gap-1">
            <p className="text-xs font-medium text-muted-foreground text-center pb-1">Time</p>
            <div className="flex gap-2 items-start">
              <div className="flex flex-col">
                <p className="text-[10px] text-center text-muted-foreground pb-1">HH</p>
                <ScrollList
                  items={hours}
                  selected={hour ?? ''}
                  onSelect={(h) => update(datePart ?? '', h, minute ?? '')}
                />
              </div>
              <span className="self-center text-muted-foreground font-bold text-lg mt-4">:</span>
              <div className="flex flex-col">
                <p className="text-[10px] text-center text-muted-foreground pb-1">MM</p>
                <ScrollList
                  items={minutes}
                  selected={minute ?? ''}
                  onSelect={(m) => update(datePart ?? '', hour ?? '', m)}
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── OffsetTimePicker ─────────────────────────────────────────────────────────

export interface OffsetTimePickerProps {
  id?: string;
  value?: string; // "HH:MM+HH:MM" or "HH:MM:SS.xxx+HH:MM"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function OffsetTimePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick time & zone',
  disabled,
  className,
}: OffsetTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const { hh, mm, offset } = parseOffsetTimeParts(value ?? '');

  const commit = (h: string, m: string, tz: string) => onChange(`${h}:${m}${tz}`);

  const displayLabel = hh && mm ? `${hh}:${mm}  ${offset}` : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !displayLabel && 'text-muted-foreground',
            className,
          )}
        >
          <ClockIcon className="mr-2 h-4 w-4 shrink-0" />
          {displayLabel ?? <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex gap-2 items-start">
          <div className="flex flex-col">
            <p className="text-[10px] text-center text-muted-foreground font-medium pb-1">HH</p>
            <ScrollList
              items={HOURS}
              selected={hh}
              onSelect={(h) => commit(h, mm || '00', offset)}
            />
          </div>
          <span className="self-center text-muted-foreground font-bold text-lg mt-4">:</span>
          <div className="flex flex-col">
            <p className="text-[10px] text-center text-muted-foreground font-medium pb-1">MM</p>
            <ScrollList
              items={MINUTES}
              selected={mm}
              onSelect={(m) => commit(hh || '00', m, offset)}
            />
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          <select
            value={offset}
            onChange={(e) => commit(hh || '00', mm || '00', e.target.value)}
            className={tzSelect}
          >
            {TZ_OFFSET_OPTIONS.map((tz) => (
              <option key={tz.label} value={tz.offset}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── OffsetDateTimePicker ─────────────────────────────────────────────────────

export interface OffsetDateTimePickerProps {
  id?: string;
  value?: string; // "yyyy-MM-ddTHH:MM+HH:MM" or "yyyy-MM-ddTHH:MM:SS.xxx+HH:MM"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function OffsetDateTimePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick date, time & zone',
  disabled,
  className,
}: OffsetDateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const normalized = value?.replace(' ', 'T') ?? '';
  const { date: datePart, hh, mm, offset } = parseOffsetDateTimeParts(normalized);

  const selected = datePart ? new Date(datePart + 'T00:00:00') : undefined;

  const commit = (d: string, h: string, m: string, tz: string) => {
    if (!d) return;
    onChange(`${d}T${h || '00'}:${m || '00'}${tz}`);
  };

  const displayLabel = datePart
    ? `${formatDate(datePart)}  ${hh || '00'}:${mm || '00'}  ${offset}`
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !displayLabel && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {displayLabel ?? <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex divide-x divide-border">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) commit(toIsoDate(date), hh, mm, offset);
            }}
            initialFocus
          />
          <div className="flex flex-col p-3 gap-1">
            <p className="text-xs font-medium text-muted-foreground text-center pb-1">Time</p>
            <div className="flex gap-2 items-start">
              <div className="flex flex-col">
                <p className="text-[10px] text-center text-muted-foreground pb-1">HH</p>
                <ScrollList
                  items={HOURS}
                  selected={hh}
                  onSelect={(h) => commit(datePart, h, mm, offset)}
                />
              </div>
              <span className="self-center text-muted-foreground font-bold text-lg mt-4">:</span>
              <div className="flex flex-col">
                <p className="text-[10px] text-center text-muted-foreground pb-1">MM</p>
                <ScrollList
                  items={MINUTES}
                  selected={mm}
                  onSelect={(m) => commit(datePart, hh, m, offset)}
                />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-border">
              <select
                value={offset}
                onChange={(e) => commit(datePart, hh || '00', mm || '00', e.target.value)}
                className={tzSelect}
              >
                {TZ_OFFSET_OPTIONS.map((tz) => (
                  <option key={tz.label} value={tz.offset}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
