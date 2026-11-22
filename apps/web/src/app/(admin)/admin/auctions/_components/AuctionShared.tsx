'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Label } from '@oxneer/ui';

export interface SelectOption {
  value: string;
  label: string;
}

export const PRICE_PROGRESSION_OPTIONS: Record<string, SelectOption[]> = {
  FORWARD: [
    { value: 'STEP_BASED', label: 'Step based increment on highest bid' },
    { value: 'FIXED_PERCENTAGE', label: 'Fixed percentage increment on highest bid' },
    { value: 'PERCENTAGE_RANGE', label: 'Percentage range increment on highest bid' },
    { value: 'CLOCK_BASED', label: 'Clock based ascending price' },
  ],
  REVERSE: [
    { value: 'STEP_BASED', label: 'Step based decrement on lowest ask' },
    { value: 'FIXED_PERCENTAGE', label: 'Fixed percentage decrement on lowest ask' },
    { value: 'PERCENTAGE_RANGE', label: 'Percentage range decrement on lowest ask' },
    { value: 'CLOCK_BASED', label: 'Clock based descending price' },
  ],
};

export function DismissibleError({ message }: { message?: string | null }) {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);

  if (!message || message === dismissedMessage) return null;

  return (
    <div className="flex items-start justify-between gap-2 py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setDismissedMessage(message)}
        className="shrink-0 p-0.5 hover:opacity-70 transition-opacity"
        aria-label="Dismiss error"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4">
      {children}
    </h3>
  );
}

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  error,
  placeholder = 'Select...',
  loading,
  required,
  disabledValues,
  readonly,
}: {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  loading?: boolean;
  required?: boolean;
  disabledValues?: string[];
  readonly?: boolean;
}) {
  if (readonly) {
    const selectedLabel = options.find((opt) => opt.value === value)?.label ?? value;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <input
          id={id}
          type="text"
          readOnly
          value={loading ? 'Loading...' : selectedLabel}
          className="w-full rounded-md border border-input bg-muted px-3 py-[7px] text-sm text-muted-foreground cursor-default"
        />
        <FieldError message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={disabledValues?.includes(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}
