'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { DayPicker, useNavigation } from 'react-day-picker';

import { cn } from '../lib/utils';
import { buttonVariants } from './button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// ── Month names ───────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ── Custom caption with clickable month + year dropdowns ──────────────────────

function CustomCaption({
  month,
  minYear: minYearProp,
  maxYear: maxYearProp,
}: {
  month: Date;
  minYear?: number;
  maxYear?: number;
}) {
  const { goToMonth } = useNavigation();

  const currentYear = month.getFullYear();
  const currentMonth = month.getMonth();

  const minYear = minYearProp ?? currentYear - 100;
  const maxYear = maxYearProp ?? currentYear + 10;

  const years = React.useMemo(() => {
    const arr: number[] = [];
    for (let y = maxYear; y >= minYear; y--) arr.push(y);
    return arr;
  }, [minYear, maxYear]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = new Date(currentYear, Number(e.target.value), 1);
    goToMonth(newMonth);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = new Date(Number(e.target.value), currentMonth, 1);
    goToMonth(newMonth);
  };

  return (
    <div className="flex items-center justify-center gap-1 pt-1">
      {/* Month dropdown */}
      <div className="relative">
        <select
          value={currentMonth}
          onChange={handleMonthChange}
          className="appearance-none cursor-pointer rounded-md border border-transparent bg-popover text-popover-foreground pl-2 pr-6 py-1 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-hidden focus:ring-2 focus:ring-ring transition-colors"
          aria-label="Select month"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={i} className="bg-popover text-popover-foreground">
              {name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
      </div>

      {/* Year dropdown */}
      <div className="relative">
        <select
          value={currentYear}
          onChange={handleYearChange}
          className="appearance-none cursor-pointer rounded-md border border-transparent bg-popover text-popover-foreground pl-2 pr-6 py-1 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-hidden focus:ring-2 focus:ring-ring transition-colors"
          aria-label="Select year"
        >
          {years.map((y) => (
            <option key={y} value={y} className="bg-popover text-popover-foreground">
              {y}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  // Derive year bounds from DayPicker props so the caption dropdown respects them
  const minYear =
    (props as { fromYear?: number }).fromYear ??
    (props as { fromMonth?: Date }).fromMonth?.getFullYear() ??
    1900;
  const maxYear =
    (props as { toYear?: number }).toYear ??
    (props as { toMonth?: Date }).toMonth?.getFullYear() ??
    new Date().getFullYear() + 10;

  return (
    <DayPicker
      data-slot="calendar"
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'hidden',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center',
        week: 'flex w-full mt-2',
        day: 'h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
        day_button: cn(buttonVariants({ variant: 'ghost' }), 'h-9 w-9 p-0 font-normal'),
        selected:
          'bg-primary text-primary-foreground rounded-md hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today: 'bg-accent text-accent-foreground rounded-md',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-50',
        range_start: 'rounded-l-md',
        range_end: 'rounded-r-md day-range-end',
        range_middle: 'bg-accent text-accent-foreground rounded-none',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
        MonthCaption: ({ calendarMonth }) => (
          <CustomCaption month={calendarMonth.date} minYear={minYear} maxYear={maxYear} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
