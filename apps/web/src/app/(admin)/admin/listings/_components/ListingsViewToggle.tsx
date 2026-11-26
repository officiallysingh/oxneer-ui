'use client';

import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@oxneer/ui';

export type ListingsViewMode = 'list' | 'card';

interface ListingsViewToggleProps {
  value: ListingsViewMode;
  onChange: (mode: ListingsViewMode) => void;
}

const OPTIONS = [
  { mode: 'list', label: 'List view', Icon: List },
  { mode: 'card', label: 'Card view', Icon: LayoutGrid },
] as const;

export function ListingsViewToggle({ value, onChange }: ListingsViewToggleProps) {
  return (
    <div role="group" aria-label="View" className="flex rounded-md border border-border p-0.5">
      {OPTIONS.map(({ mode, label, Icon }) => (
        <Button
          key={mode}
          type="button"
          size="sm"
          variant={value === mode ? 'secondary' : 'ghost'}
          className="h-7 w-8 p-0"
          aria-label={label}
          aria-pressed={value === mode}
          title={label}
          onClick={() => onChange(mode)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}
