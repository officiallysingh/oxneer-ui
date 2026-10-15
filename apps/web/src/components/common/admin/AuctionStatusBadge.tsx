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
import { formatLabel, resolveStr } from './format';

/** Unified auction-status visual mapping shared by the list, view, and step
 *  pages. Mirrors the backend's `Auction.Status` enum — keep in sync with it:
 *  DRAFT, SCHEDULED, PUBLISHED, LIVE, CANCELLED, COMPLETED, AWARDED. */
const STATUS_CONFIG: Record<
  string,
  { bg: string; icon: LucideIcon; animate?: boolean; label?: string }
> = {
  DRAFT: { bg: 'bg-muted text-muted-foreground border-border', icon: FileEdit },
  SCHEDULED: { bg: 'bg-warning/10 text-warning border-warning/30', icon: Clock },
  PUBLISHED: { bg: 'bg-info/10 text-info border-info/30', icon: Send },
  LIVE: {
    bg: 'bg-success/10 text-success border-success/30',
    icon: Activity,
    animate: true,
  },
  CANCELLED: { bg: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertCircle },
  COMPLETED: {
    bg: 'bg-success/10 text-success border-success/30',
    icon: ShieldCheck,
  },
  AWARDED: { bg: 'bg-violet-500/10 text-violet-600 border-violet-500/30', icon: Trophy },
};

/** Shared auction-status badge. Use `size="sm"` for table cells, `"md"` for
 *  headers (default), and pass `showIcon={false}` to render text-only. */
export function StatusBadge({
  value,
  size = 'md',
  showIcon = true,
}: {
  value?: unknown;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}) {
  const str = resolveStr(value);
  if (!str) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const cfg: { bg: string; icon: LucideIcon; animate?: boolean } = STATUS_CONFIG[str] ?? {
    bg: 'bg-muted text-muted-foreground border-border',
    icon: Info,
  };
  const Icon = cfg.icon;
  const sizeCls =
    size === 'sm'
      ? 'gap-1 px-2 py-0.5 text-xs font-medium'
      : 'gap-1.5 px-3 py-1 text-xs font-semibold';
  const iconCls = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span className={`inline-flex items-center rounded-full border ${sizeCls} ${cfg.bg}`}>
      {showIcon && <Icon className={`${iconCls} ${cfg.animate ? 'animate-pulse' : ''}`} />}
      {formatLabel(str)}
    </span>
  );
}
