'use client';

import { X } from 'lucide-react';
import { cn } from '@repo/ui';

interface RemovableChipProps {
  label: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
  variant?: 'primary' | 'secondary';
}

/** Rounded chip with an ✕ button — active filters, search terms, picked values. */
export function RemovableChip({
  label,
  onRemove,
  removeLabel,
  variant = 'secondary',
}: RemovableChipProps) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-0.5 rounded-full pl-2.5 pr-1 text-[13px] font-medium',
        variant === 'primary'
          ? 'bg-primary/15 text-primary'
          : 'bg-secondary text-secondary-foreground',
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="grid h-5 w-5 place-items-center rounded-full opacity-75 hover:bg-foreground/10 hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
