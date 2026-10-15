'use client';

import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormErrorItem {
  /** DOM id of the field to jump to. */
  fieldId: string;
  label: string;
  message: string;
}

interface FormErrorSummaryProps {
  errors: FormErrorItem[];
  /** e.g. "to create this user" → "Fix 3 fields to create this user". */
  action: string;
}

/** Top-of-form list of field errors, each linking to its field. Focuses itself when shown. */
export function FormErrorSummary({ errors, action }: FormErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const count = errors.length;

  useEffect(() => {
    if (count > 0) ref.current?.focus();
  }, [count]);

  if (count === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/[0.06] px-4 py-3.5 text-destructive focus:outline-none"
    >
      <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
      <div className="space-y-1.5">
        <p className="font-semibold">
          Fix {count} {count === 1 ? 'field' : 'fields'} {action}
        </p>
        <ul className="list-disc space-y-0.5 pl-[18px] text-[13px]">
          {errors.map((e) => (
            <li key={e.fieldId}>
              <a href={`#${e.fieldId}`} className="underline">
                {e.label}
              </a>{' '}
              — {e.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
