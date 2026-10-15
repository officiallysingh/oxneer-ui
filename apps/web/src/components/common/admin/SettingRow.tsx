import type { ReactNode } from 'react';
import { ChangedDot } from './ChangedDot';

interface SettingRowProps {
  label: string;
  description?: ReactNode;
  /** The control on the right: a switch, a button, etc. */
  control: ReactNode;
  labelId?: string;
  disabled?: boolean;
  changed?: boolean;
}

/** A label + description row with a trailing control; rows are divided when stacked. */
export function SettingRow({
  label,
  description,
  control,
  labelId,
  disabled,
  changed,
}: SettingRowProps) {
  return (
    <div className="flex items-center gap-4 border-b border-border py-3.5 first:pt-0 last:border-b-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p
          id={labelId}
          className={`text-sm font-medium ${disabled ? 'text-muted-foreground' : 'text-foreground'}`}
        >
          {label}
          {changed && <ChangedDot />}
        </p>
        {description && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{description}</p>}
      </div>
      {control}
    </div>
  );
}
