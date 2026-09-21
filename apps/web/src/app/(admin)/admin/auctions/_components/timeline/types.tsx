import { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface TimelineNode {
  id: string;
  label: string;
  Icon: LucideIcon;
  dotClass: string;
  labelClass: string;
  borderClass: string;
  title: string;
  time?: string;
  /** Rendered on its own line under `time` — e.g. the clock reading paired with a date. */
  timeSecondary?: string;
  timeTo?: string;
  subs: string[];
  durationToNext?: string | null;
  /** Rich, step-type-specific detail body — reuses the same components the
   *  workflow builder's cards render, so both surfaces stay in sync. */
  details?: ReactNode;
}

export interface NestedChild {
  id: string;
  time?: string;
  timeTo?: string;
  name: string;
  description?: string;
  tags?: { label: string; value?: string }[];
}
