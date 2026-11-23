'use client';

import {
  Activity,
  AlertCircle,
  Clock,
  FileEdit,
  Info,
  Send,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@oxneer/ui';
import { formatLabel, resolveStr } from './format';
import { Pill, type PillTone } from './Pill';

/** Unified auction-status visual mapping shared by the admin list, view and
 *  step pages and the public cards. Mirrors the backend's `Auction.Status`
 *  enum — keep in sync with it: DRAFT, SCHEDULED, PUBLISHED, LIVE, CANCELLED,
 *  COMPLETED, AWARDED.
 *
 *  Tones follow DESIGN.md: upcoming states are `info`, the one state that needs
 *  eyes now (LIVE) is `success` with a pulsing icon, a won auction is
 *  `success`, and a finished-but-not-awarded one goes quiet (`outline`). The
 *  icon tells same-tone states apart. */
interface StatusConfig {
  tone: PillTone;
  icon: LucideIcon;
  /** Pulse the icon to draw the eye to a state that is happening now. */
  pulse?: boolean;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: { tone: 'muted', icon: FileEdit },
  SCHEDULED: { tone: 'info', icon: Clock },
  PUBLISHED: { tone: 'info', icon: Send },
  LIVE: { tone: 'success', icon: Activity, pulse: true },
  COMPLETED: { tone: 'outline', icon: ShieldCheck },
  AWARDED: { tone: 'success', icon: Trophy },
  CANCELLED: { tone: 'destructive', icon: AlertCircle },
};

const FALLBACK_CONFIG: StatusConfig = { tone: 'muted', icon: Info };

/** Shared auction-status badge. Use `size="sm"` for table cells and cards,
 *  `"md"` for headers (default), and pass `showIcon={false}` for text only. */
export function StatusBadge({
  value,
  size = 'md',
  showIcon = true,
}: {
  value?: unknown;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}) {
  const status = resolveStr(value);
  if (!status) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const config = STATUS_CONFIG[status] ?? FALLBACK_CONFIG;
  const Icon = config.icon;

  return (
    <Pill tone={config.tone} className={cn(size === 'sm' ? 'gap-1 px-2' : 'h-7 px-3')}>
      {showIcon && (
        <Icon
          className={cn(
            size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5',
            config.pulse && 'motion-safe:animate-pulse',
          )}
          aria-hidden
        />
      )}
      {formatLabel(status)}
    </Pill>
  );
}
