'use client';

import { useId } from 'react';
import { Switch } from '@repo/ui';
import { SettingRow } from './SettingRow';

interface ToggleFieldProps {
  label: string;
  description?: React.ReactNode;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  /** Marks the setting as an unsaved change. */
  changed?: boolean;
}

/**
 * A labelled switch row for boolean fields in admin forms.
 */
export function ToggleField({
  label,
  description,
  value,
  onChange,
  disabled,
  changed,
}: ToggleFieldProps) {
  const labelId = useId();
  return (
    <SettingRow
      label={label}
      description={description}
      labelId={labelId}
      disabled={disabled}
      changed={changed}
      control={
        <Switch
          checked={value}
          onCheckedChange={onChange}
          disabled={disabled}
          aria-labelledby={labelId}
        />
      }
    />
  );
}
