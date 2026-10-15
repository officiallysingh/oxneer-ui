'use client';

import type { ReactNode } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { cn, Input, Label, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';
import { ChangedDot } from './ChangedDot';

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange?: (v: string) => void;
  onBlur?: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  optional?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** Shows a HelpCircle tooltip next to the label */
  tip?: string;
  /** Help text under the input. */
  hint?: ReactNode;
  /** Fixed text inside the input on the left, e.g. "@" or "+91". */
  prefix?: ReactNode;
  /** Content inside the input on the right, e.g. a status or an Undo button. */
  suffix?: ReactNode;
  /** Content between the input and the hint, e.g. suggestion chips or a warning. */
  children?: ReactNode;
  /** Marks the field as an unsaved change. */
  changed?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

/**
 * A labelled input field with optional tooltip, error message, help text, prefix/suffix
 * adornments and required/optional annotations. Used across admin create/edit forms.
 * The wrapper gets `${id}-field` so error summaries can link to it.
 */
export function FormField({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  error,
  optional,
  required,
  disabled,
  readOnly,
  tip,
  hint,
  prefix,
  suffix,
  children,
  changed,
  autoComplete = 'off',
  inputMode,
}: FormFieldProps) {
  const labelClass = error ? 'text-destructive' : disabled ? 'text-muted-foreground' : '';
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;
  const muted = disabled || readOnly;

  const inputProps = {
    id,
    type,
    value,
    onChange: onChange
      ? (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)
      : undefined,
    onBlur: onBlur ? (e: React.FocusEvent<HTMLInputElement>) => onBlur(e.target.value) : undefined,
    placeholder,
    autoComplete,
    inputMode,
    disabled,
    readOnly,
    'aria-invalid': !!error || undefined,
    'aria-describedby': describedBy,
  };

  const borderClass = error
    ? 'border-destructive focus-visible:ring-destructive focus-within:ring-destructive'
    : changed
      ? 'border-primary'
      : '';

  return (
    <div id={`${id}-field`} className="space-y-1.5 scroll-mt-24">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className={labelClass}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
          {optional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
          {changed && <ChangedDot />}
        </Label>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                aria-label={`About ${label}`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {tip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {prefix || suffix ? (
        <div
          className={cn(
            'flex h-10 items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            muted && 'bg-muted/60',
            borderClass,
          )}
        >
          {prefix && (
            <span className="ml-3 mr-1 whitespace-nowrap border-r border-input pr-2 text-sm text-muted-foreground">
              {prefix}
            </span>
          )}
          <input
            {...inputProps}
            className={cn(
              'h-full min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed',
              muted && 'text-muted-foreground',
              !prefix && 'pl-3',
            )}
          />
          {suffix && <span className="flex shrink-0 items-center gap-1.5 pr-3">{suffix}</span>}
        </div>
      ) : (
        <Input
          {...inputProps}
          className={cn(borderClass, disabled && 'opacity-60 cursor-not-allowed')}
        />
      )}

      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {children}
      {hint && (
        <p id={hintId} className="text-[12.5px] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
